import * as z from "zod";

import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { signup } from "~/lib/auth.server";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { Form, useActionData } from "@remix-run/react";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { safeRedirect } from "remix-utils/safe-redirect";
import { StatusButton } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { CheckboxField, ErrorList, Field } from "~/components/ui/form";
import { useIsPending } from "~/hooks/misc";
import { SESSION_KEY } from "~/lib/constants";
import { prisma } from "~/lib/db.server";
import { checkHoneypot } from "~/lib/honeypot.server";
import { authSessionStorage } from "~/lib/session.server";
import { redirectWithToast } from "~/lib/toast.server";
import { cn } from "~/lib/utils";
import { OnboardingFormSchema } from "~/lib/validation/auth-validation";
import { requireOnboardingEmail } from "~/lib/verification-utils.server";
import { verifySessionStorage } from "~/lib/verification.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const email = await requireOnboardingEmail(request);
  return json({ email });
}

export async function action({ request }: ActionFunctionArgs) {
  const email = await requireOnboardingEmail(request);
  const formData = await request.formData();
  checkHoneypot(formData);
  const submission = await parseWithZod(formData, {
    schema: (intent) =>
      OnboardingFormSchema.superRefine(async (data, ctx) => {
        const existingUser = await prisma.user.findUnique({
          where: { username: data.username },
          select: { id: true },
        });
        if (existingUser) {
          ctx.addIssue({
            path: ["username"],
            code: z.ZodIssueCode.custom,
            message: "A user already exists with this username",
          });
          return;
        }
      }).transform(async (data) => {
        if (intent !== null) return { ...data, session: null };

        const session = await signup({ ...data, email });
        return { ...data, session };
      }),
    async: true,
  });

  if (submission.status !== "success" || !submission.value.session) {
    return json(
      { result: submission.reply() },
      { status: submission.status === "error" ? 400 : 200 }
    );
  }

  const { session, remember, redirectTo } = submission.value;

  const authSession = await authSessionStorage.getSession(
    request.headers.get("cookie")
  );
  authSession.set(SESSION_KEY, session.id);
  const verifySession = await verifySessionStorage.getSession();
  const headers = new Headers();
  headers.append(
    "set-cookie",
    await authSessionStorage.commitSession(authSession, {
      expires: remember ? session.expirationDate : undefined,
    })
  );
  headers.append(
    "set-cookie",
    await verifySessionStorage.destroySession(verifySession)
  );

  return redirectWithToast(
    safeRedirect(redirectTo),
    { title: "Welcome", description: "Thanks for signing up!" },
    { headers }
  );
}

export const meta: MetaFunction = () => {
  return [{ title: "Setup Shadownet Account" }];
};

export default function OnboardingRoute() {
  const isPending = useIsPending();
  const actionData = useActionData<typeof action>();

  const [form, fields] = useForm({
    id: "onboarding-form",
    constraint: getZodConstraint(OnboardingFormSchema),
    lastResult: actionData?.result,
    onValidate({ formData }) {
      const result = parseWithZod(formData, { schema: OnboardingFormSchema });
      return result;
    },
    shouldRevalidate: "onBlur",
  });

  return (
    <main className="w-full h-screen bg-background flex flex-col justify-center items-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-thin">
            Finish setting up your account
          </CardTitle>
          <CardDescription>
            Some helpful text, to encourage you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="POST" {...getFormProps(form)}>
            <HoneypotInputs />
            <fieldset
              className="w-full max-w-md space-y-2"
              disabled={isPending}
            >
              <Field
                labelProps={{
                  htmlFor: fields.username.id,
                  children: "Username",
                }}
                inputProps={{
                  ...getInputProps(fields.username, { type: "text" }),
                  autoComplete: "username",
                  className: "lowercase",
                  placeholder: "user.name",
                }}
                errors={fields.username.errors}
              />
              <Field
                labelProps={{ htmlFor: fields.name.id, children: "Name" }}
                inputProps={{
                  ...getInputProps(fields.name, { type: "text" }),
                  autoComplete: "name",
                  placeholder: "Name",
                }}
                errors={fields.name.errors}
              />
              <Field
                labelProps={{
                  htmlFor: fields.password.id,
                  children: "Password",
                }}
                inputProps={{
                  ...getInputProps(fields.password, { type: "password" }),
                  autoComplete: "new-password",
                  placeholder: "Password", // FIXME: use dots
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

              <CheckboxField
                labelProps={{
                  htmlFor: fields.agreeToTermsOfServiceAndPrivacyPolicy.id,
                  children:
                    "Do you agree to our Terms of Service and Privacy Policy?",
                }}
                buttonProps={getInputProps(
                  fields.agreeToTermsOfServiceAndPrivacyPolicy,
                  { type: "checkbox" }
                )}
                errors={fields.agreeToTermsOfServiceAndPrivacyPolicy.errors}
              />
              <CheckboxField
                labelProps={{
                  htmlFor: fields.remember.id,
                  children: "Remember me",
                }}
                buttonProps={getInputProps(fields.remember, {
                  type: "checkbox",
                })}
                errors={fields.remember.errors}
              />

              <input
                {...getInputProps(fields.redirectTo, { type: "hidden" })}
              />
              <ErrorList errors={form.errors} id={form.errorId} />

              <StatusButton
                loading={isPending}
                type="submit"
                className="w-full"
              >
                Finalize Account
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
