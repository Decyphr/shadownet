import * as z from "zod";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { json } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { HoneypotInputs } from "remix-utils/honeypot/react";

import { StatusButton } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { ErrorList, Field } from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { useIsPending } from "~/hooks/misc";
import { handleNewSession, login, requireAnonymous } from "~/lib/auth.server";
import { checkHoneypot } from "~/lib/honeypot.server";
import { cn } from "~/lib/utils";
import { LoginFormSchema } from "~/lib/validation/auth-validation";

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { GeneralErrorBoundary } from "~/components/error-boundary";
import { routes } from "~/lib/routing";

export async function loader({ request }: LoaderFunctionArgs) {
  // if user is already logged in, redirect to home
  await requireAnonymous(request);
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAnonymous(request);
  const formData = await request.formData();
  checkHoneypot(formData);

  // Replace `Object.fromEntries()` with the parseWithZod helper
  const submission = await parseWithZod(formData, {
    schema: (intent) =>
      LoginFormSchema.transform(async (data, ctx) => {
        if (intent !== null) return { ...data, session: null };

        const session = await login(data);
        if (!session) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid username or password",
          });
          return z.NEVER;
        }

        return { ...data, session };
      }),
    async: true,
  });

  // Report the submission to client if it is not successful
  if (submission.status !== "success" || !submission.value.session) {
    return json(
      { result: submission.reply({ hideFields: ["password"] }) },
      { status: submission.status === "error" ? 400 : 200 }
    );
  }

  const { session, remember, redirectTo } = submission.value;

  return handleNewSession({
    request,
    session,
    remember: remember ?? false,
    redirectTo,
  });
}

export default function LoginPage() {
  const isPending = useIsPending();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const [form, fields] = useForm({
    id: "login-form",
    constraint: getZodConstraint(LoginFormSchema),
    defaultValue: { redirectTo },
    lastResult: actionData?.result,
    shouldRevalidate: "onBlur",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: LoginFormSchema });
    },
  });

  return (
    <main className="w-full h-screen bg-background flex flex-col justify-center items-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-thin">Login</CardTitle>
          <CardDescription>
            Need an account? <Link to={routes.auth.signup}>Sign up here.</Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="POST" {...getFormProps(form)}>
            <HoneypotInputs />
            <fieldset
              className="w-full max-w-md space-y-6"
              disabled={isPending}
            >
              <div className="space-y-2">
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
                <Field
                  labelProps={{ children: "Password" }}
                  inputProps={{
                    ...getInputProps(fields.password, { type: "password" }),
                    autoComplete: "current-password",
                    placeholder: "••••••••••••",
                  }}
                  errors={fields.password.errors}
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
                <Link to={routes.auth.forgotPassword} className="text-sm">
                  Forgot password?
                </Link>
              </div>
              <input
                {...getInputProps(fields.redirectTo, { type: "hidden" })}
              />
              <StatusButton
                loading={isPending}
                type="submit"
                className="w-full"
              >
                Login
              </StatusButton>
            </fieldset>
            {form.errorId ? (
              <div className={cn("px-4 pb-2 pt-1 text-red-400 text-center")}>
                <ErrorList id={form.errorId} errors={form.errors} />
              </div>
            ) : null}
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
