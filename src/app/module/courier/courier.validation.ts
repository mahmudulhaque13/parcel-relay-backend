import { z } from "zod";

const assignCourierValidation = z.object({
  shipmentId: z.string().uuid("Invalid shipment ID"),
  courierId: z.string().uuid("Invalid courier ID"),
});

const createCourierValidation = z.object({
  name: z.string().min(2, "Courier name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(7, "Invalid phone number"),
});

export const courierValidation = {
  assignCourierValidation,
  createCourierValidation,
};
