import { useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
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
import { authenticator } from "~/lib/auth.server";
import { cn } from "~/lib/utils";
import { loginSchema } from "~/lib/validation/auth-validation";

import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  // Replace `Object.fromEntries()` with the parseWithZod helper
  const submission = parseWithZod(formData, { schema: loginSchema });

  // Report the submission to client if it is not successful
  if (submission.status !== "success") {
    return submission.reply();
  }

  return await authenticator.authenticate("form", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    context: {
      formData,
      email: submission.value.email,
      password: submission.value.password,
      rememberMe: submission.value.rememberMe,
    },
  });
}

export default function LoginPage() {
  const lastResult = useActionData<typeof action>();

  const [form, fields] = useForm({
    // This not only sync the error from the server
    // But also used as the default value of the form
    // in case the document is reloaded for progressive enhancement
    lastResult,
    // To derive all validation attributes
    constraint: getZodConstraint(loginSchema),
    // Validate field once user leaves the field
    // shouldValidate: "onBlur",
    // Then, revalidate field as user types again
    // shouldRevalidate: "onInput",

    onValidate({ formData }) {
      return parseWithZod(formData, { schema: loginSchema });
    },
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
