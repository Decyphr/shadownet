import * as z from "zod";

import invariant from "tiny-invariant";

import {
  ONBOARDING_EMAIL_SESSION_KEY,
  REDIRECT_TO_QUERY_PARAM,
  VERIFICATION_CODE_QUERY_PARAM,
  VERIFICATION_TARGET_QUERY_PARAM,
  VERIFICATION_TYPE_QUERY_PARAM,
} from "~/lib/constants";
import { prisma } from "~/lib/db.server";
import { generateTOTP, verifyTOTP } from "~/lib/totp.server";
import { getDomainUrl } from "~/lib/utils";
import {
  VerificationTypes,
  VerifySchema,
} from "~/lib/validation/verification-validation";

import type { Submission } from "@conform-to/react";
import { redirect } from "@remix-run/node";
import { verifySessionStorage } from "~/lib/verification.server";

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
 * Handle Onboarding Verification
 *
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
  const redirectToUrl = new URL(`${getDomainUrl(request)}/verify`);
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

/* export async function requireRecentVerification(request: Request) {
  const userId = await requireUserId(request);
  const shouldReverify = await shouldRequestTwoFA(request);
  if (shouldReverify) {
    const reqUrl = new URL(request.url);
    const redirectUrl = getRedirectToUrl({
      request,
      target: userId,
      type: twoFAVerificationType,
      redirectTo: reqUrl.pathname + reqUrl.search,
    });
    throw await redirectWithToast(redirectUrl.toString(), {
      title: "Please Reverify",
      description: "Please reverify your account before proceeding",
    });
  }
} */

/* export async function shouldRequestTwoFA(request: Request) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	if (verifySession.has(unverifiedSessionIdKey)) return true
	const userId = await getUserId(request)
	if (!userId) return false
	// if it's over two hours since they last verified, we should request 2FA again
	const userHasTwoFA = await prisma.verification.findUnique({
		select: { id: true },
		where: { target_type: { target: userId, type: twoFAVerificationType } },
	})
	if (!userHasTwoFA) return false
	const verifiedTime = authSession.get(verifiedTimeKey) ?? new Date(0)
	const twoHours = 1000 * 60 * 2
	return Date.now() - verifiedTime > twoHours
} */
