import httpStatus from 'http-status-codes';
import Stripe from 'stripe';

import config from '../../config';
import { prisma } from '../../lib/prisma';
import { stripe } from '../../lib/stripe';
import { AppError } from '../../utils/AppError';

import type { IInitiatePayment, IRefundPayment } from './payment.interface';

const initiatePayment = async (customerId: string, payload: IInitiatePayment) => {
  // 1. Find shipment
  const shipment = await prisma.shipment.findUnique({
    where: {
      id: payload.shipmentId,
    },
    include: {
      customer: true,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shipment not found');
  }

  // 2. Check shipment ownership
  if (shipment.customerId !== customerId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to pay for this shipment');
  }

  // 3. Check if payment is already completed
  if (shipment.paymentStatus === 'PAID') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Shipment payment is already completed');
  }

  // 4. Payment is allowed only for pending payment shipment
  if (shipment.status !== 'PENDING_PAYMENT') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Shipment is not available for payment');
  }

  // 5. Find existing pending Stripe payment attempt
  const existingPayment = await prisma.paymentAttempt.findFirst({
    where: {
      shipmentId: shipment.id,
      status: 'PENDING',
      method: 'STRIPE',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  let paymentAttempt = existingPayment;

  // 6. Create payment attempt if none exists
  if (!paymentAttempt) {
    const transactionId = `PR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    paymentAttempt = await prisma.paymentAttempt.create({
      data: {
        shipmentId: shipment.id,
        transactionId,
        amount: shipment.deliveryCharge,
        method: 'STRIPE',
        status: 'PENDING',
      },
    });
  }

  // 7. Convert BDT to paisa
  const amountInPaisa = Math.round(Number(shipment.deliveryCharge) * 100);

  // 8. Create Stripe Checkout Session
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',

    payment_method_types: ['card'],

    line_items: [
      {
        price_data: {
          currency: 'bdt',

          product_data: {
            name: `ParcelRelay Shipment ${shipment.trackingNumber}`,
            description: shipment.packageDescription,
          },

          unit_amount: amountInPaisa,
        },

        quantity: 1,
      },
    ],

    customer_email: shipment.customer.email,

    client_reference_id: shipment.id,

    metadata: {
      shipmentId: shipment.id,
      paymentAttemptId: paymentAttempt.id,
      transactionId: paymentAttempt.transactionId,
    },

    success_url: config.stripe_success_url,

    cancel_url: config.stripe_cancel_url,
  });

  // 9. Check Stripe Checkout URL
  if (!checkoutSession.url) {
    throw new AppError(httpStatus.BAD_GATEWAY, 'Failed to create Stripe checkout session');
  }

  // 10. Save Stripe session information
  await prisma.paymentAttempt.update({
    where: {
      id: paymentAttempt.id,
    },
    data: {
      gatewayResponse: {
        sessionId: checkoutSession.id,
        paymentUrl: checkoutSession.url,
      },
    },
  });

  // 11. Return payment information
  return {
    transactionId: paymentAttempt.transactionId,
    amount: shipment.deliveryCharge,
    paymentUrl: checkoutSession.url,
    sessionId: checkoutSession.id,
  };
};

const paymentSuccess = async (sessionId: string) => {
  if (!sessionId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Stripe session ID is required');
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  return {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    status: session.status,
  };
};

const paymentCancel = async () => {
  return {
    message: 'Payment was cancelled',
  };
};

const getPaymentStatus = async (shipmentId: string, customerId: string) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      customerId,
      isDeleted: false,
    },
    select: {
      id: true,
      trackingNumber: true,
      status: true,
      paymentStatus: true,
      deliveryCharge: true,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shipment not found');
  }

  const paymentAttempts = await prisma.paymentAttempt.findMany({
    where: {
      shipmentId,
    },
    select: {
      id: true,
      transactionId: true,
      amount: true,
      method: true,
      status: true,
      paidAt: true,
      createdAt: true,
      gatewayResponse: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return {
    shipment,
    payments: paymentAttempts,
  };
};

const refundPayment = async (adminId: string, payload: IRefundPayment) => {
  // 1. Find the latest Stripe payment attempt for the shipment
  const paymentAttempt = await prisma.paymentAttempt.findFirst({
    where: {
      shipmentId: payload.shipmentId,
      method: 'STRIPE',
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      shipment: true,
    },
  });

  if (!paymentAttempt) {
    throw new AppError(httpStatus.NOT_FOUND, 'Stripe payment not found');
  }

  // 2. Prevent duplicate refund
  if (paymentAttempt.status === 'REFUNDED') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Shipment payment is already refunded');
  }

  // 3. Payment must be PAID before refund
  if (paymentAttempt.status !== 'PAID') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Stripe payment is not eligible for refund');
  }

  // 4. Only returned shipments can be refunded
  if (paymentAttempt.shipment.status !== 'RETURNED_TO_SENDER') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Only returned shipments can be refunded');
  }

  // 5. Get Stripe Payment Intent
  const gatewayResponse = paymentAttempt.gatewayResponse as {
    paymentIntentId?: string;
    sessionId?: string;
  } | null;

  let paymentIntentId = gatewayResponse?.paymentIntentId;

  if (!paymentIntentId) {
    const sessionId = gatewayResponse?.sessionId;

    if (!sessionId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Stripe payment session information is missing');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session.payment_intent) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Stripe payment intent not found');
    }

    paymentIntentId = session.payment_intent as string;
  }

  // 6. Create Stripe refund
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: Math.round(Number(paymentAttempt.amount) * 100),
  });

  // 7. Update database atomically
  const result = await prisma.$transaction(async (tx) => {
    const updatedPaymentAttempt = await tx.paymentAttempt.update({
      where: {
        id: paymentAttempt.id,
      },
      data: {
        status: 'REFUNDED',
        gatewayResponse: {
          ...(paymentAttempt.gatewayResponse as object),
          refundId: refund.id,
          refundStatus: refund.status,
          paymentIntentId,
        },
      },
    });

    const updatedShipment = await tx.shipment.update({
      where: {
        id: paymentAttempt.shipmentId,
      },
      data: {
        paymentStatus: 'REFUNDED',
      },
    });

    // 8. Create shipment event
    await tx.shipmentEvent.create({
      data: {
        shipmentId: updatedShipment.id,
        status: updatedShipment.status,
        description: 'Shipment payment refunded through Stripe.',
      },
    });

    // 9. Create audit log
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'PAYMENT',
        entityType: 'Shipment',
        entityId: updatedShipment.id,
        description: 'Shipment payment refunded through Stripe.',
        metadata: {
          paymentAttemptId: paymentAttempt.id,
          transactionId: paymentAttempt.transactionId,
          stripeRefundId: refund.id,
          stripePaymentIntentId: paymentIntentId,
        },
      },
    });

    return {
      paymentAttempt: updatedPaymentAttempt,
      shipment: updatedShipment,
    };
  });

  return {
    refundId: refund.id,
    refundStatus: refund.status,
    amount: paymentAttempt.amount,
    paymentStatus: result.shipment.paymentStatus,
    shipmentStatus: result.shipment.status,
  };
};

const handleWebhook = async (payload: Buffer, signature: string) => {
  if (!signature) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Stripe signature is missing');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, config.stripe_webhook_secret);
  } catch (error) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid Stripe webhook signature');
  }

  if (event.type !== 'checkout.session.completed') {
    return {
      received: true,
      eventType: event.type,
      message: 'Event received but no action was required',
    };
  }

  const session = event.data.object as Stripe.Checkout.Session;

  const paymentAttemptId = session.metadata?.paymentAttemptId;

  if (!paymentAttemptId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment attempt ID is missing from Stripe session');
  }

  const paymentAttempt = await prisma.paymentAttempt.findUnique({
    where: {
      id: paymentAttemptId,
    },
    include: {
      shipment: true,
    },
  });

  if (!paymentAttempt) {
    throw new AppError(httpStatus.NOT_FOUND, 'Payment attempt not found');
  }

  // Idempotency: webhook may arrive more than once
  if (paymentAttempt.status === 'PAID') {
    return {
      received: true,
      alreadyProcessed: true,
      message: 'Payment webhook was already processed',
    };
  }

  // Verify Stripe payment status
  if (session.payment_status !== 'paid') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Stripe payment is not completed');
  }

  // Verify currency
  if (session.currency !== 'bdt') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid payment currency');
  }

  // Verify amount
  const expectedAmount = Math.round(Number(paymentAttempt.amount) * 100);

  if (session.amount_total !== expectedAmount) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment amount does not match shipment amount');
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.paymentAttempt.update({
      where: {
        id: paymentAttempt.id,
      },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        gatewayResponse: {
          eventId: event.id,
          sessionId: session.id,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
          currency: session.currency,
        },
      },
    });

    const shipment = await tx.shipment.update({
      where: {
        id: paymentAttempt.shipmentId,
      },
      data: {
        paymentStatus: 'PAID',
        status: 'READY_FOR_ASSIGNMENT',
      },
    });

    await tx.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        status: 'READY_FOR_ASSIGNMENT',
        description: 'Payment completed successfully. Shipment is ready for courier assignment.',
      },
    });

    await tx.auditLog.create({
      data: {
        userId: shipment.customerId,
        action: 'PAYMENT',
        entityType: 'Shipment',
        entityId: shipment.id,
        description: 'Shipment payment completed through Stripe.',
        metadata: {
          paymentAttemptId: paymentAttempt.id,
          transactionId: paymentAttempt.transactionId,
          stripeEventId: event.id,
          stripeSessionId: session.id,
        },
      },
    });

    return {
      paymentAttempt: updatedPayment,
      shipment,
    };
  });

  return {
    received: true,
    alreadyProcessed: false,
    message: 'Stripe payment processed successfully',
    paymentAttemptId: result.paymentAttempt.id,
    shipmentId: result.shipment.id,
    shipmentStatus: result.shipment.status,
    paymentStatus: result.shipment.paymentStatus,
  };
};

export const paymentService = {
  initiatePayment,
  paymentSuccess,
  paymentCancel,
  getPaymentStatus,
  refundPayment,
  handleWebhook,
};
