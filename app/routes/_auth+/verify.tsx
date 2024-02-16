import * as z from "zod";

import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useSearchParams } from "@remix-run/react";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { GeneralErrorBoundary } from "~/components/error-boundary";
import { StatusButton } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Field } from "~/components/ui/form";
import { useIsPending } from "~/hooks/misc";
import {
  REDIRECT_TO_QUERY_PARAM,
  VERIFICATION_CODE_QUERY_PARAM,
  VERIFICATION_TARGET_QUERY_PARAM,
  VERIFICATION_TYPE_QUERY_PARAM,
} from "~/lib/constants";
import { prisma } from "~/lib/db.server";
import { checkHoneypot } from "~/lib/honeypot.server";
import { cn } from "~/lib/utils";
import {
  VerificationTypeSchema,
  VerifySchema,
} from "~/lib/validation/verification-validation";
import {
  handleOnboardingVerification,
  handleResetPasswordVerification,
  isCodeValid,
} from "~/lib/verification-utils.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  checkHoneypot(formData);

  // validate the code
  const submission = await parseWithZod(formData, {
    schema: VerifySchema.superRefine(async (data, ctx) => {
      const codeIsValid = await isCodeValid({
        code: data[VERIFICATION_CODE_QUERY_PARAM],
        type: data[VERIFICATION_TYPE_QUERY_PARAM],
        target: data[VERIFICATION_TARGET_QUERY_PARAM],
      });
      if (!codeIsValid) {
        ctx.addIssue({
          path: ["code"],
          code: z.ZodIssueCode.custom,
          message: `Invalid code`,
        });
        return;
      }
    }),
    async: true,
  });

  if (submission.status !== "success") {
    return json(
      { result: submission.reply() },
      { status: submission.status === "error" ? 400 : 200 }
    );
  }

  const { value: submissionValue } = submission;

  async function deleteVerification() {
    await prisma.verification.delete({
      where: {
        target_type: {
          type: submissionValue[VERIFICATION_TYPE_QUERY_PARAM],
          target: submissionValue[VERIFICATION_TARGET_QUERY_PARAM],
        },
      },
    });
  }

  switch (submissionValue[VERIFICATION_TYPE_QUERY_PARAM]) {
    case "onboarding": {
      await deleteVerification();
      return handleOnboardingVerification({
        request,
        body: formData,
        submission,
      });
    }
    case "reset-password": {
      await deleteVerification();
      return handleResetPasswordVerification({
        request,
        body: formData,
        submission,
      });
    }
    /* case "change-email": {
      await deleteVerification();
      return handleChangeEmailVerification({ request, formData, submission });
    } */
    /* case "2fa": {
      return handleLoginTwoFactorVerification({ request, body, submission });
    } */
  }
}

export default function VerifyRoute() {
  const [searchParams] = useSearchParams();
  const isPending = useIsPending();
  const actionData = useActionData<typeof action>();
  const parseWithZodType = VerificationTypeSchema.safeParse(
    searchParams.get(VERIFICATION_TYPE_QUERY_PARAM)
  );
  const type = parseWithZodType.success ? parseWithZodType.data : null;

  const [form, fields] = useForm({
    id: "verify-form",
    constraint: getZodConstraint(VerifySchema),
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: VerifySchema });
    },
    defaultValue: {
      code: searchParams.get(VERIFICATION_CODE_QUERY_PARAM),
      type: type,
      target: searchParams.get(VERIFICATION_TARGET_QUERY_PARAM),
      redirectTo: searchParams.get(REDIRECT_TO_QUERY_PARAM),
    },
  });

  return (
    <main className="w-full h-screen bg-background flex flex-col justify-center items-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-thin">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a verification code to your email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="POST" {...getFormProps(form)}>
            <HoneypotInputs />
            <fieldset
              className="w-full max-w-md space-y-6"
              disabled={isPending}
            >
              <Field
                labelProps={{
                  htmlFor: fields[VERIFICATION_CODE_QUERY_PARAM].id,
                  children: "Code",
                }}
                inputProps={{
                  ...getInputProps(fields[VERIFICATION_CODE_QUERY_PARAM], {
                    type: "text",
                  }),
                  autoComplete: "one-time-code",
                }}
                errors={fields[VERIFICATION_CODE_QUERY_PARAM].errors}
              />
              <input
                {...getInputProps(fields[VERIFICATION_TYPE_QUERY_PARAM], {
                  type: "hidden",
                })}
              />
              <input
                {...getInputProps(fields[VERIFICATION_TARGET_QUERY_PARAM], {
                  type: "hidden",
                })}
              />
              <input
                {...getInputProps(fields[REDIRECT_TO_QUERY_PARAM], {
                  type: "hidden",
                })}
              />
              <StatusButton
                type="submit"
                className="w-full"
                loading={isPending}
              >
                Submit
              </StatusButton>
            </fieldset>
            <div
              id={form.errorId}
              className={cn(
                "text-xs text-center text-red-400",
                form.errors ? "block" : "hidden"
              )}
            >
              {form.errors}
            </div>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
