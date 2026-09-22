import { z } from "zod";

const reassignCourierValidation = z.object({
  courierId: z.string().uuid("Invalid courier ID"),
});

export const adminValidation = {
  reassignCourierValidation,
};
