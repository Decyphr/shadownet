/**
 * @fileoverview This file contains the implementation of verification-related server-side functions and utilities.
 */

import { createCookieSessionStorage } from "@remix-run/node";

import { prisma } from "~/lib/db.server";
import { generateTOTP } from "~/lib/totp.server";
import { getDomainUrl } from "~/lib/utils";
import {
  codeQueryParam,
  redirectToQueryParam,
  targetQueryParam,
  typeQueryParam,
} from "~/lib/validation/verification-validation";

import type { VerificationTypes } from "~/types";

/**
 * Verification Session Storage
 */

export const verifySessionStorage = createCookieSessionStorage({
  cookie: {
    name: "en_verification",
    sameSite: "lax", // CSRF protection is advised if changing to 'none'
    path: "/",
    httpOnly: true,
    maxAge: 60 * 10, // 10 minutes
    secrets: process.env.SESSION_SECRET.split(","),
    secure: process.env.NODE_ENV === "production",
  },
});

/**
 * Verification Utilities
 */

/**
 * Prepare Verification
 *
 * @param period - The period of verification.
 * @param request - The request object.
 * @param type - The type of verification.
 * @param target - The target of verification.
 */

export async function prepareVerification({
  period,
  request,
  type,
  target,
}: {
  period: number;
  request: Request;
  type: VerificationTypes;
  target: string;
}) {
  const verifyUrl = getRedirectToUrl({ request, type, target });
  const redirectTo = new URL(verifyUrl.toString());

  const { otp, ...verificationConfig } = generateTOTP({
    algorithm: "SHA256",
    // Leaving off 0 and O on purpose to avoid confusing users.
    charSet: "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789",
    period,
  });
  const verificationData = {
    type,
    target,
    ...verificationConfig,
    expiresAt: new Date(Date.now() + verificationConfig.period * 1000),
  };

  await prisma.verification.upsert({
    where: { target_type: { target, type } },
    create: verificationData,
    update: verificationData,
  });

  // add the otp to the url we'll email the user.
  verifyUrl.searchParams.set(codeQueryParam, otp);

  return { otp, redirectTo, verifyUrl };
}

/**
 * Get redirect URL for verification.
 *
 * @param request - The request object.
 * @param type - The type of verification.
 * @param target - The target of verification.
 * @param redirectTo - The optional redirect URL.
 * @returns The redirect URL for verification.
 */
export function getRedirectToUrl({
  request,
  type,
  target,
  redirectTo,
}: {
  request: Request;
  type: VerificationTypes;
  target: string;
  redirectTo?: string;
}) {
  const redirectToUrl = new URL(`${getDomainUrl(request)}/verify`);
  redirectToUrl.searchParams.set(typeQueryParam, type);
  redirectToUrl.searchParams.set(targetQueryParam, target);

  if (redirectTo) {
    redirectToUrl.searchParams.set(redirectToQueryParam, redirectTo);
  }

  return redirectToUrl;
}
