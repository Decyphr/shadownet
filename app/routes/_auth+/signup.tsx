import * as z from "zod";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData } from "@remix-run/react";
import { HoneypotInputs } from "remix-utils/honeypot/react";

import { StatusButton } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Field } from "~/components/ui/form";
import SignupEmail from "~/emails/signup-email";
import { useIsPending } from "~/hooks/misc";
import { requireAnonymous } from "~/lib/auth.server";
import { prisma } from "~/lib/db.server";
import { sendEmail } from "~/lib/email.server";
import { cn } from "~/lib/utils";
import { SignupFormSchema } from "~/lib/validation/auth-validation";

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { GeneralErrorBoundary } from "~/components/error-boundary";
import { checkHoneypot } from "~/lib/honeypot.server";
import { routes } from "~/lib/routing";
import { prepareVerification } from "~/lib/verification-utils.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // if user is already logged in, redirect to home
  await requireAnonymous(request);
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAnonymous(request);
  const formData = await request.formData();
  checkHoneypot(formData);

  const submission = await parseWithZod(formData, {
    schema: SignupFormSchema.superRefine(async (data, ctx) => {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      });

      if (existingUser) {
        ctx.addIssue({
          path: ["email"],
          code: z.ZodIssueCode.custom,
          message: "A user already exists with this email",
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

  const { email } = submission.value;
  const { verifyUrl, redirectTo, otp } = await prepareVerification({
    period: 10 * 60, // 10 minutes
    request,
    type: "onboarding",
    target: email,
  });

  const response = await sendEmail({
    to: email,
    subject: `Welcome to Shadownet!`,
    react: <SignupEmail onboardingUrl={verifyUrl.toString()} otp={otp} />,
  });

  if (response.status === "success") {
    return redirect(redirectTo.toString());
  } else {
    return json(
      {
        result: submission.reply({ formErrors: [response.error.message] }),
      },
      {
        status: 500,
      }
    );
  }
}

export default function SignupPage() {
  const isPending = useIsPending();
  const actionData = useActionData<typeof action>();

  const [form, fields] = useForm({
    id: "signup-form",
    constraint: getZodConstraint(SignupFormSchema),
    lastResult: actionData?.result,
    onValidate({ formData }) {
      const result = parseWithZod(formData, { schema: SignupFormSchema });
      return result;
    },
    shouldRevalidate: "onBlur",
  });

  return (
    <main className="w-full h-screen bg-background flex flex-col justify-center items-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-thin">
            Create an Account
          </CardTitle>
          <CardDescription>
            Already registered? <Link to={routes.auth.login}>Login here.</Link>
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
                labelProps={{ children: "Email" }}
                inputProps={{
                  ...getInputProps(fields.email, { type: "email" }),
                  autoFocus: true,
                  className: "lowercase",
                  autoComplete: "email",
                  placeholder: "user@email.com",
                }}
                errors={fields.email.errors}
              />
              <StatusButton
                loading={isPending}
                type="submit"
                className="w-full"
              >
                Create Account
              </StatusButton>
            </fieldset>
            <div
              id={form.errorId}
              className={cn(
                "text-center text-xs text-red-400",
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
