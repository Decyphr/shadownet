/**
 * This file contains validations for all auth-related forms
 *
 *
 */

import * as z from "zod";

import {
  EmailSchema,
  NameSchema,
  PasswordAndConfirmPasswordSchema,
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

export const OnboardingFormSchema = z
  .object({
    name: NameSchema,
    username: UsernameSchema,
    agreeToTermsOfServiceAndPrivacyPolicy: z.boolean({
      required_error:
        "You must agree to the terms of service and privacy policy",
    }),
    remember: z.boolean().optional(),
    redirectTo: z.string().optional(),
  })
  .and(PasswordAndConfirmPasswordSchema);

export const ForgotPasswordFormSchema = z.object({
  email: EmailSchema,
});

export const ResetPasswordFormSchema = PasswordAndConfirmPasswordSchema;
