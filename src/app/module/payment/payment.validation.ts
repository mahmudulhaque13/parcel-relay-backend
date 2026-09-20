import { z } from "zod";

const initiatePaymentValidation = z.object({
  shipmentId: z.string().uuid("Invalid shipment ID"),
});

export const paymentValidation = {
  initiatePaymentValidation,
};
