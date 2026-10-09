import httpStatus from "http-status-codes";
import Stripe from "stripe";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";
import { AppError } from "../../utils/AppError";
import { invoicePdfUtils } from "../../utils/pdf/invoice.pdf";
import { emailUtils } from "../../utils/email";
import type { IInitiatePayment, IRefundPayment } from "./payment.interface";
import { cloudinaryUtils } from "../../utils/cloudinary";
const initiatePayment = async (
  customerId: string,
  payload: IInitiatePayment,
) => {
  const shipment = await prisma.shipment.findUnique({
    where: { id: payload.shipmentId },
    include: { customer: true },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (shipment.customerId !== customerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not have permission to pay for this shipment",
    );
  }

  if (shipment.paymentStatus === "PAID") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Shipment payment is already completed",
    );
  }

  if (shipment.status !== "PENDING_PAYMENT") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Shipment is not available for payment",
    );
  }

  const amountInPaisa = Math.round(Number(shipment.deliveryCharge) * 100);

  if (!Number.isSafeInteger(amountInPaisa) || amountInPaisa <= 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid shipment delivery charge",
    );
  }

  let paymentAttempt = await prisma.paymentAttempt.findFirst({
    where: {
      shipmentId: shipment.id,
      status: "PENDING",
      method: "STRIPE",
    },
    orderBy: { createdAt: "desc" },
  });

  // Reuse an existing open Checkout Session instead of creating duplicates.
  if (paymentAttempt) {
    const gatewayResponse = paymentAttempt.gatewayResponse as {
      sessionId?: unknown;
      paymentUrl?: unknown;
    } | null;

    if (typeof gatewayResponse?.sessionId === "string") {
      const previousSession = await stripe.checkout.sessions.retrieve(
        gatewayResponse.sessionId,
      );

      if (previousSession.status === "open") {
        const storedAttemptAmount = Math.round(
          Number(paymentAttempt.amount) * 100,
        );

        if (
          storedAttemptAmount === amountInPaisa &&
          previousSession.amount_total === amountInPaisa &&
          previousSession.url
        ) {
          return {
            transactionId: paymentAttempt.transactionId,
            amount: paymentAttempt.amount,
            paymentUrl: previousSession.url,
            sessionId: previousSession.id,
          };
        }

        // The open session has stale pricing; expire it before creating a new attempt.
        await stripe.checkout.sessions.expire(previousSession.id);

        await prisma.paymentAttempt.update({
          where: { id: paymentAttempt.id },
          data: { status: "CANCELLED" },
        });

        paymentAttempt = null;
      } else if (previousSession.status === "complete") {
        if (previousSession.payment_status === "paid") {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            "Payment is completed and is awaiting confirmation. Please check the shipment status shortly.",
          );
        }

        await prisma.paymentAttempt.update({
          where: { id: paymentAttempt.id },
          data: { status: "FAILED" },
        });

        paymentAttempt = null;
      } else {
        // An expired Checkout Session cannot be used again.
        await prisma.paymentAttempt.update({
          where: { id: paymentAttempt.id },
          data: { status: "CANCELLED" },
        });

        paymentAttempt = null;
      }
    } else if (
      Math.round(Number(paymentAttempt.amount) * 100) !== amountInPaisa
    ) {
      // Do not attach a newly priced Checkout Session to a stale payment attempt.
      await prisma.paymentAttempt.update({
        where: { id: paymentAttempt.id },
        data: { status: "CANCELLED" },
      });

      paymentAttempt = null;
    }
  }

  if (!paymentAttempt) {
    const transactionId = `PR-${Date.now()}-${Math.floor(
      1000 + Math.random() * 9000,
    )}`;

    paymentAttempt = await prisma.paymentAttempt.create({
      data: {
        shipmentId: shipment.id,
        transactionId,
        amount: shipment.deliveryCharge,
        method: "STRIPE",
        status: "PENDING",
      },
    });
  }

  // Use the amount saved on the payment attempt as the Stripe charge amount.
  const attemptAmountInPaisa = Math.round(Number(paymentAttempt.amount) * 100);

  if (attemptAmountInPaisa !== amountInPaisa) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment attempt amount does not match the current delivery charge",
    );
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "bdt",
          product_data: {
            name: `ParcelRelay Shipment ${shipment.trackingNumber}`,
            description: shipment.packageDescription,
          },
          unit_amount: attemptAmountInPaisa,
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

  if (!checkoutSession.url) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Failed to create Stripe checkout session",
    );
  }

  await prisma.paymentAttempt.update({
    where: { id: paymentAttempt.id },
    data: {
      gatewayResponse: {
        sessionId: checkoutSession.id,
        paymentUrl: checkoutSession.url,
      },
    },
  });

  return {
    transactionId: paymentAttempt.transactionId,
    amount: paymentAttempt.amount,
    paymentUrl: checkoutSession.url,
    sessionId: checkoutSession.id,
  };
};

const paymentSuccess = async (sessionId: string) => {
  if (!sessionId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Stripe session ID is required");
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
    message: "Payment was cancelled",
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
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
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
      createdAt: "desc",
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
      method: "STRIPE",
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      shipment: true,
    },
  });
  if (!paymentAttempt) {
    throw new AppError(httpStatus.NOT_FOUND, "Stripe payment not found");
  }
  // 2. Prevent duplicate refund
  if (paymentAttempt.status === "REFUNDED") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Shipment payment is already refunded",
    );
  }
  // 3. Payment must be PAID before refund
  if (paymentAttempt.status !== "PAID") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Stripe payment is not eligible for refund",
    );
  }
  // 4. Only returned shipments can be refunded
  if (paymentAttempt.shipment.status !== "RETURNED_TO_SENDER") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only returned shipments can be refunded",
    );
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
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Stripe payment session information is missing",
      );
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session.payment_intent) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Stripe payment intent not found",
      );
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
        status: "REFUNDED",
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
        paymentStatus: "REFUNDED",
      },
    });
    // 8. Create shipment event
    await tx.shipmentEvent.create({
      data: {
        shipmentId: updatedShipment.id,
        status: updatedShipment.status,
        description: "Shipment payment refunded through Stripe.",
      },
    });
    // 9. Create audit log
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "PAYMENT",
        entityType: "Shipment",
        entityId: updatedShipment.id,
        description: "Shipment payment refunded through Stripe.",
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
    throw new AppError(httpStatus.BAD_REQUEST, "Stripe signature is missing");
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe_webhook_secret,
    );
  } catch {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid Stripe webhook signature",
    );
  }
  // Process only completed checkout sessions.
  if (event.type !== "checkout.session.completed") {
    return {
      received: true,
      eventType: event.type,
      message: "Event received but no action was required",
    };
  }
  const session = event.data.object as Stripe.Checkout.Session;
  const paymentAttemptId = session.metadata?.paymentAttemptId;
  if (!paymentAttemptId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment attempt ID is missing from Stripe session",
    );
  }
  const paymentAttempt = await prisma.paymentAttempt.findUnique({
    where: {
      id: paymentAttemptId,
    },
    include: {
      shipment: {
        include: {
          customer: true,
          originZone: true,
          destinationZone: true,
        },
      },
    },
  });
  if (!paymentAttempt) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment attempt not found");
  }
  // Stripe retries webhook deliveries; already-paid attempts are idempotent.
  if (paymentAttempt.status === "PAID") {
    return {
      received: true,
      alreadyProcessed: true,
      message: "Payment webhook was already processed",
    };
  }

  if (paymentAttempt.status !== "PENDING") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment attempt is no longer pending",
    );
  }

  if (session.metadata?.shipmentId !== paymentAttempt.shipmentId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Stripe session shipment does not match the payment attempt",
    );
  }

  const storedGatewayResponse = paymentAttempt.gatewayResponse as {
    sessionId?: unknown;
  } | null;

  if (storedGatewayResponse?.sessionId !== session.id) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Stripe session does not match the active payment session",
    );
  }

  if (session.payment_status !== "paid") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Stripe payment is not completed",
    );
  }
  if (session.currency !== "bdt") {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid payment currency");
  }
  const expectedAmount = Math.round(Number(paymentAttempt.amount) * 100);
  if (session.amount_total !== expectedAmount) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment amount does not match shipment amount",
    );
  }
  /*
   * IMPORTANT:
   * Commit the payment and shipment status before generating invoices,
   * sending emails, or uploading files.
   *
   * These secondary operations must not roll back a confirmed payment.
   */

  const result = await prisma.$transaction(async (tx) => {
    const paymentUpdate = await tx.paymentAttempt.updateMany({
      where: {
        id: paymentAttempt.id,
        status: "PENDING",
      },
      data: {
        status: "PAID",
        paidAt: new Date(),
        gatewayResponse: {
          ...((paymentAttempt.gatewayResponse as Record<
            string,
            unknown
          > | null) ?? {}),
          eventId: event.id,
          sessionId: session.id,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
          currency: session.currency,
        },
      },
    });

    // Another webhook may have processed this payment first.
    if (paymentUpdate.count === 0) {
      return null;
    }

    const updatedPayment = await tx.paymentAttempt.findUnique({
      where: {
        id: paymentAttempt.id,
      },
    });

    if (!updatedPayment) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Updated payment attempt could not be found",
      );
    }

    const shipment = await tx.shipment.update({
      where: {
        id: paymentAttempt.shipmentId,
      },
      data: {
        paymentStatus: "PAID",
        status: "READY_FOR_ASSIGNMENT",
      },
    });

    await tx.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        status: "READY_FOR_ASSIGNMENT",
        description:
          "Payment completed successfully. Shipment is ready for courier assignment.",
      },
    });

    await tx.auditLog.create({
      data: {
        userId: shipment.customerId,
        action: "PAYMENT",
        entityType: "Shipment",
        entityId: shipment.id,
        description: "Shipment payment completed through Stripe.",
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

  if (!result) {
    return {
      received: true,
      alreadyProcessed: true,
      message: "Payment webhook was already processed",
    };
  }

  // Payment is committed. Secondary operations are best-effort.
  try {
    const invoicePdf = await invoicePdfUtils.generateInvoicePdf({
      invoiceNumber: `INV-${result.paymentAttempt.transactionId}`,
      shipmentId: result.shipment.id,
      customerName: paymentAttempt.shipment.customer.name,
      customerEmail: paymentAttempt.shipment.customer.email,
      recipientName: result.shipment.recipientName,
      deliveryAddress: result.shipment.deliveryAddress,
      weight: Number(result.shipment.weight),
      codAmount: Number(result.shipment.codAmount),
      deliveryCharge: Number(result.shipment.deliveryCharge),
      paymentStatus: result.shipment.paymentStatus,
      transactionId: result.paymentAttempt.transactionId,
      createdAt: result.paymentAttempt.paidAt ?? new Date(),
    });
    let invoicePdfUrl: string | undefined;
    try {
      const invoiceUpload = await cloudinaryUtils.uploadToCloudinary({
        buffer: invoicePdf,
        folder: "parcel-relay/invoices",
        publicId: `invoice-${result.paymentAttempt.transactionId}`,
        resourceType: "raw",
      });
      invoicePdfUrl = invoiceUpload.secure_url;
    } catch (error) {
      console.error("[Stripe webhook] Invoice upload failed:", error);
    }
    try {
      await emailUtils.sendPaymentSuccessEmail(
        paymentAttempt.shipment.customer.email,
        paymentAttempt.shipment.customer.name,
        result.shipment.id,
        result.paymentAttempt.transactionId,
        Number(result.paymentAttempt.amount),
        [
          {
            filename: `invoice-${result.paymentAttempt.transactionId}.pdf`,
            content: invoicePdf,
            contentType: "application/pdf",
          },
        ],
      );
    } catch (error) {
      console.error(
        "[Stripe webhook] Payment confirmation email failed:",
        error,
      );
    }
    if (invoicePdfUrl) {
      try {
        await prisma.paymentAttempt.update({
          where: {
            id: result.paymentAttempt.id,
          },
          data: {
            gatewayResponse: {
              ...((result.paymentAttempt.gatewayResponse as Record<
                string,
                unknown
              > | null) ?? {}),
              invoicePdfUrl,
            },
          },
        });
      } catch (error) {
        console.error("[Stripe webhook] Saving invoice URL failed:", error);
      }
    }
  } catch (error) {
    console.error(
      "[Stripe webhook] Invoice generation failed; payment remains PAID:",
      error,
    );
  }
  return {
    received: true,
    alreadyProcessed: false,
    message: "Stripe payment processed successfully",
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
