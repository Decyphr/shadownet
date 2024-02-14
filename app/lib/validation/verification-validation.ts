import * as z from "zod";
import {
  REDIRECT_TO_QUERY_PARAM,
  VERIFICATION_CODE_QUERY_PARAM,
  VERIFICATION_TARGET_QUERY_PARAM,
  VERIFICATION_TYPE_QUERY_PARAM,
} from "~/lib/constants";

const types = ["onboarding", "reset-password", "change-email", "2fa"] as const;
export const VerificationTypeSchema = z.enum(types);

export type VerificationTypes = z.infer<typeof VerificationTypeSchema>;

export const VerifySchema = z.object({
  [VERIFICATION_CODE_QUERY_PARAM]: z.string().min(6).max(6),
  [VERIFICATION_TYPE_QUERY_PARAM]: VerificationTypeSchema,
  [VERIFICATION_TARGET_QUERY_PARAM]: z.string(),
  [REDIRECT_TO_QUERY_PARAM]: z.string().optional(),
});
