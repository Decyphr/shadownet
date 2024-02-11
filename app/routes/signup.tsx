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
import { Checkbox } from "~/components/ui/checkbox";
import { Field } from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { requireAnonymous, signup } from "~/lib/auth.server";
import { cn } from "~/lib/utils";

import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { prisma } from "~/lib/db.server";
import { SignupFormSchema } from "~/lib/validation/auth-validation";

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

  await signup({ ...submission.value });

  return redirect("/dashboard");

  // TODO: Send verification email
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
          <CardTitle className="text-2xl font-thin">Login</CardTitle>
          <CardDescription>
            Need an account? <Link to="/sign-up">Sign up here.</Link>
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
                field={fields.name}
                label="Name"
                placeholder="John Lennon"
              />
              <Field
                field={fields.username}
                label="Username"
                placeholder="user_name"
              />
              <Field
                field={fields.email}
                label="Email"
                type="email"
                placeholder="user@email.com"
              />
              <Field
                field={fields.password}
                label="Password"
                type="password"
                placeholder="••••••••••"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember-me" />
                <Label
                  htmlFor="remember-me"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember me
                </Label>
              </div>
              <Link to="/forgot-password" className="text-sm">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
            <div
              id={form.errorId}
              className={cn(form.errors ? "block" : "hidden")}
            >
              {form.errors}
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
