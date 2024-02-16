import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
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
import { useIsPending } from "~/hooks/misc";
import { resetUserPassword } from "~/lib/auth.server";
import { routes } from "~/lib/routing";
import { cn } from "~/lib/utils";
import { ResetPasswordFormSchema } from "~/lib/validation/auth-validation";
import { requireResetPasswordUsername } from "~/lib/verification-utils.server";
import { verifySessionStorage } from "~/lib/verification.server";

export const meta: MetaFunction = () => {
  return [{ title: "Shadownet | Reset Password" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const resetPasswordUsername = await requireResetPasswordUsername(request);
  return json({ resetPasswordUsername });
}

export async function action({ request }: ActionFunctionArgs) {
  const resetPasswordUsername = await requireResetPasswordUsername(request);
  const formData = await request.formData();
  const submission = parseWithZod(formData, {
    schema: ResetPasswordFormSchema,
  });
  if (submission.status !== "success") {
    return json(
      { result: submission.reply() },
      { status: submission.status === "error" ? 400 : 200 }
    );
  }
  const { password } = submission.value;

  await resetUserPassword({ username: resetPasswordUsername, password });
  const verifySession = await verifySessionStorage.getSession();
  return redirect(routes.auth.login, {
    headers: {
      "set-cookie": await verifySessionStorage.destroySession(verifySession),
    },
  });
}

export default function ResetPasswordRoute() {
  const isPending = useIsPending();
  const actionData = useActionData<typeof action>();

  const [form, fields] = useForm({
    id: "onboarding-form",
    constraint: getZodConstraint(ResetPasswordFormSchema),
    lastResult: actionData?.result,
    onValidate({ formData }) {
      const result = parseWithZod(formData, {
        schema: ResetPasswordFormSchema,
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
            Reset your Password
          </CardTitle>
          <CardDescription>
            Enter and confirm your new password.
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
                  labelProps={{
                    htmlFor: fields.password.id,
                    children: "Password",
                  }}
                  inputProps={{
                    ...getInputProps(fields.password, { type: "password" }),
                    autoComplete: "new-password",
                    placeholder: "Password",
                  }}
                  errors={fields.password.errors}
                />

                <Field
                  labelProps={{
                    htmlFor: fields.confirmPassword.id,
                    children: "Confirm Password",
                  }}
                  inputProps={{
                    ...getInputProps(fields.confirmPassword, {
                      type: "password",
                    }),
                    autoComplete: "new-password",
                    placeholder: "Confirm Password",
                  }}
                  errors={fields.confirmPassword.errors}
                />
              </div>
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
