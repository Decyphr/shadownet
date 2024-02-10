import * as z from "zod";

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Email is invalid"),
  password: z.string().min(8),
  rememberMe: z.boolean().optional(),
});
