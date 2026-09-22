import { z } from "zod";

const createTransferValidation = z
  .object({
    fromHubId: z.string().uuid("Invalid source hub ID"),
    toHubId: z.string().uuid("Invalid destination hub ID"),
  })
  .strict();

const updateTransferStatusValidation = z
  .object({
    status: z.enum(["IN_TRANSIT", "RECEIVED", "CANCELLED"]),
  })
  .strict();

export const transferValidation = {
  createTransferValidation,
  updateTransferStatusValidation,
};
