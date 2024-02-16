import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
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
import ForgotPasswordEmail from "~/emails/forgot-password-email";
import { useIsPending } from "~/hooks/misc";
import { prisma } from "~/lib/db.server";
import { sendEmail } from "~/lib/email.server";
import { checkHoneypot } from "~/lib/honeypot.server";
import { cn } from "~/lib/utils";
import { ForgotPasswordFormSchema } from "~/lib/validation/auth-validation";
import { prepareVerification } from "~/lib/verification-utils.server";

export const meta: MetaFunction = () => {
  return [{ title: "Shadownet | Password Recovery" }];
};

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  checkHoneypot(formData);

  const submission = await parseWithZod(formData, {
    schema: ForgotPasswordFormSchema,
  });

  if (submission.status !== "success") {
    return json(
      { result: submission.reply() },
      { status: submission.status === "error" ? 400 : 200 }
    );
  }
  const { email } = submission.value;

  const user = await prisma.user.findFirst({
    where: { email },
    select: { email: true, username: true },
  });

  if (!user) {
    // return as if user was found to prevent enumeration
    return redirect("/verify?type=reset-password");
  }

  const { verifyUrl, redirectTo, otp } = await prepareVerification({
    period: 10 * 60,
    request,
    type: "reset-password",
    target: email,
  });

  const response = await sendEmail({
    to: user.email,
    subject: `Epic Notes Password Reset`,
    react: (
      <ForgotPasswordEmail onboardingUrl={verifyUrl.toString()} otp={otp} />
    ),
  });

  if (response.status === "success") {
    return redirect(redirectTo.toString());
  } else {
    return json(
      { result: submission.reply({ formErrors: [response.error.message] }) },
      { status: 500 }
    );
  }
}

export default function ForgotPasswordRoute() {
  const isPending = useIsPending();
  const actionData = useActionData<typeof action>();

  const [form, fields] = useForm({
    id: "signup-form",
    constraint: getZodConstraint(ForgotPasswordFormSchema),
    lastResult: actionData?.result,
    onValidate({ formData }) {
      const result = parseWithZod(formData, {
        schema: ForgotPasswordFormSchema,
      });
      return result;
    },
    shouldRevalidate: "onBlur",
  });

  return (
    <main className="w-full h-screen bg-background flex flex-col justify-center items-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-thin">
            Forgot your Password?
          </CardTitle>
          <CardDescription>
            Enter your email address to request a password reset.
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
                Request Password Reset
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
