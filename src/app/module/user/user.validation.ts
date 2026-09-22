import { z } from "zod";

const updateMyProfileValidation = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .optional(),

    imageUrl: z.string().url("Invalid image URL").optional(),
  })
  .strict();

export const userValidation = {
  updateMyProfileValidation,
};
