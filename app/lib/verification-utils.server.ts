import * as z from "zod";

import type { Submission } from "@conform-to/react";
import { json, redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import { requireAnonymous } from "~/lib/auth.server";
import {
  ONBOARDING_EMAIL_SESSION_KEY,
  REDIRECT_TO_QUERY_PARAM,
  RESET_PASSWORD_USERNAME_SESSION_KEY,
  VERIFICATION_CODE_QUERY_PARAM,
  VERIFICATION_TARGET_QUERY_PARAM,
  VERIFICATION_TYPE_QUERY_PARAM,
} from "~/lib/constants";
import { prisma } from "~/lib/db.server";
import { routes } from "~/lib/routing";
import { generateTOTP, verifyTOTP } from "~/lib/totp.server";
import { getDomainUrl } from "~/lib/utils";
import {
  VerificationTypes,
  VerifySchema,
} from "~/lib/validation/verification-validation";
import { verifySessionStorage } from "~/lib/verification.server";

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
  verifyUrl.searchParams.set(VERIFICATION_CODE_QUERY_PARAM, otp);

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
  const redirectToUrl = new URL(
    `${getDomainUrl(request)}/${routes.auth.verify}`
  );
  redirectToUrl.searchParams.set(VERIFICATION_TYPE_QUERY_PARAM, type);
  redirectToUrl.searchParams.set(VERIFICATION_TARGET_QUERY_PARAM, target);

  if (redirectTo) {
    redirectToUrl.searchParams.set(REDIRECT_TO_QUERY_PARAM, redirectTo);
  }

  return redirectToUrl;
}

/**
 * Is Code Valid?
 *
 * @param code - The code to validate.
 * @param type - The type of verification.
 * @param target - The target of verification.
 *
 *  @returns boolean
 */

export async function isCodeValid({
  code,
  type,
  target,
}: {
  code: string;
  type: VerificationTypes;
  target: string;
}) {
  const verification = await prisma.verification.findUnique({
    where: {
      target_type: { target, type },
      OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
    },
    select: { algorithm: true, secret: true, period: true, charSet: true },
  });
  if (!verification) return false;
  const result = verifyTOTP({
    otp: code,
    ...verification,
  });
  if (!result) return false;

  return true;
}

type VerifyFunctionArgs = {
  request: Request;
  submission: Submission<
    z.input<typeof VerifySchema>,
    string[],
    z.output<typeof VerifySchema>
  >;
  body: FormData | URLSearchParams;
};

/**
 * Onboarding
 */

export async function handleOnboardingVerification({
  submission,
}: VerifyFunctionArgs) {
  invariant(
    submission.status === "success",
    "Submission should be successful by now"
  );
  const verifySession = await verifySessionStorage.getSession();
  verifySession.set(ONBOARDING_EMAIL_SESSION_KEY, submission.value.target);
  return redirect("/onboarding", {
    headers: {
      "set-cookie": await verifySessionStorage.commitSession(verifySession),
    },
  });
}

/**
 * Require Onboarding Email
 *
 * @param request - The request object.
 */

export async function requireOnboardingEmail(request: Request) {
  await requireAnonymous(request);
  const verifySession = await verifySessionStorage.getSession(
    request.headers.get("cookie")
  );
  const email = verifySession.get(ONBOARDING_EMAIL_SESSION_KEY);
  if (typeof email !== "string" || !email) {
    throw redirect(routes.auth.signup);
  }
  return email;
}

/**
 * Password Reset
 *
 */

export async function handleResetPasswordVerification({
  submission,
}: VerifyFunctionArgs) {
  invariant(
    submission.status === "success",
    "Submission should be successful by now"
  );
  const target = submission.value.target;
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: target }, { username: target }] },
    select: { email: true, username: true },
  });
  // we don't want to say the user is not found if the email is not found
  // because that would allow an attacker to check if an email is registered
  if (!user) {
    return json(
      {
        result: submission.reply({ fieldErrors: { code: ["Invalid code"] } }),
      },
      {
        status: 400,
      }
    );
  }

  const verifySession = await verifySessionStorage.getSession();
  verifySession.set(RESET_PASSWORD_USERNAME_SESSION_KEY, user.username);
  return redirect(routes.auth.resetPassword, {
    headers: {
      "set-cookie": await verifySessionStorage.commitSession(verifySession),
    },
  });
}

/**
 * Require Reset Password Username
 *
 * @param request - The request object.
 */

export async function requireResetPasswordUsername(request: Request) {
  await requireAnonymous(request);
  const verifySession = await verifySessionStorage.getSession(
    request.headers.get("cookie")
  );
  const resetPasswordUsername = verifySession.get(
    RESET_PASSWORD_USERNAME_SESSION_KEY
  );
  if (typeof resetPasswordUsername !== "string" || !resetPasswordUsername) {
    throw redirect(routes.auth.login);
  }
  return resetPasswordUsername;
}
