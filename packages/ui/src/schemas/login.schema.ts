import * as z from "zod/v4";

export default z.object({
  login: z
    .string()
    .min(1, "Login is required")
    .refine(
      (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
        return emailRegex.test(value) || phoneRegex.test(value);
      },
      {
        message: "error.invalid",
      }
    ),
  password: z.string().min(6, "error.tooShort"),
});
