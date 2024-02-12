import * as z from "zod";

import { useForm } from "@conform-to/react";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData } from "@remix-run/react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Field } from "~/components/ui/form";
import { requireAnonymous } from "~/lib/auth.server";
import { cn } from "~/lib/utils";

import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import SignupEmail from "~/emails/signup-email";
import { prisma } from "~/lib/db.server";
import { sendEmail } from "~/lib/email.server";
import { SignupFormSchema } from "~/lib/validation/auth-validation";
import { prepareVerification } from "~/lib/verification.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // if user is already logged in, redirect to home
  await requireAnonymous(request);
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAnonymous(request);
  const formData = await request.formData();

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
    <div className="w-full h-screen bg-background flex flex-col justify-center items-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-thin">
            Create an Account
          </CardTitle>
          <CardDescription>
            Already registered? <Link to="/login">Login here.</Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form
            method="POST"
            className="w-full max-w-md space-y-6"
            id={form.id}
            aria-invalid={form.errors ? true : undefined}
            aria-describedby={form.errors ? form.errorId : undefined}
          >
            <div className="space-y-2">
              <Field
                field={fields.email}
                label="Email"
                type="email"
                placeholder="user@email.com"
              />
            </div>
            <Button type="submit" className="w-full">
              Create Account
            </Button>
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
    </div>
  );
}
