import { z } from 'zod';

const trackingNumberValidation = z.object({
  trackingNumber: z.string().trim().min(1, 'Tracking number is required'),
});

export const trackingValidation = {
  trackingNumberValidation,
};
