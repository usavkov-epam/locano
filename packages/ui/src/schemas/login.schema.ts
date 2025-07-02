import { z } from 'zod';

export default z.object({
  login: z
    .string()
    .min(1, 'Login is required')
    .refine((value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
      return emailRegex.test(value) || phoneRegex.test(value);
    }, {
      message: 'Enter a valid email or phone number',
    }),
  password: z.string().min(6, 'Password is required'),
});
