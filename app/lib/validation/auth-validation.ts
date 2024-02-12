/**
 * This file contains validations for all auth-related forms
 *
 *
 */

import * as z from "zod";

import {
  EmailSchema,
  PasswordSchema,
  UsernameSchema,
} from "~/lib/validation/user-validation";

export const LoginFormSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  remember: z.boolean().optional(),
  redirectTo: z.string().optional(),
});

export const SignupFormSchema = z.object({
  email: EmailSchema,
});

export const OnboardingFormSchema = z.object({
  name: z.string().optional(),
  username: UsernameSchema,
  password: PasswordSchema,
});
