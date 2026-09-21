import { z } from "zod";

const createTransferValidation = z.object({
  shipmentId: z.string().uuid("Invalid shipment ID"),
  fromHubId: z.string().uuid("Invalid source hub ID"),
  toHubId: z.string().uuid("Invalid destination hub ID"),
});

const updateTransferStatusValidation = z.object({
  status: z.enum(["IN_TRANSIT", "RECEIVED", "CANCELLED"]),
});

export const transferValidation = {
  createTransferValidation,
  updateTransferStatusValidation,
};
