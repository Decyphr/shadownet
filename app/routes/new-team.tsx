import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { HoneypotInputs } from "remix-utils/honeypot/react";

import { StatusButton } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ErrorList, Field } from "~/components/ui/form";
import { useIsPending } from "~/hooks/misc";
import { requireUserId } from "~/lib/auth.server";
import { checkHoneypot } from "~/lib/honeypot.server";
import { generateRoute, routes } from "~/lib/routing";
import { cn } from "~/lib/utils";
import { CreateTeamSchema } from "~/lib/validation/team-validation";
import { createTeamWithDefaultRoles } from "~/models/team.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request);
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  checkHoneypot(formData);

  // Replace `Object.fromEntries()` with the parseWithZod helper
  const submission = await parseWithZod(formData, { schema: CreateTeamSchema });

  if (submission.status !== "success") {
    return json(
      { result: submission.reply() },
      { status: submission.status === "error" ? 400 : 200 }
    );
  }

  const { team } = await createTeamWithDefaultRoles(userId, {
    name: submission.value.name,
    description: submission.value.description ?? "",
  });

  if (!team) {
    throw json(
      { result: { message: "Failed to create team" } },
      { status: 500 }
    );
  }

  return redirect(generateRoute(routes.team.index, { "team-id": team.id }));
}

export default function NewTeamRoute() {
  const isPending = useIsPending();
  const actionData = useActionData<typeof action>();

  const [form, fields] = useForm({
    id: "new-team-form",
    constraint: getZodConstraint(CreateTeamSchema),
    lastResult: actionData?.result,
    shouldRevalidate: "onBlur",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: CreateTeamSchema });
    },
  });

  return (
    <main className="w-full h-screen bg-background flex flex-col justify-center items-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-thin">Create Your Team</CardTitle>
          <CardDescription>
            Your team will be the home for all your projects, issues, and
            invited members.
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
                  labelProps={{ children: "Team Name" }}
                  inputProps={{
                    ...getInputProps(fields.name, { type: "text" }),
                    autoFocus: true,
                    placeholder: "Team Name",
                    defaultValue: fields.name.value,
                  }}
                  errors={fields.name.errors}
                />
                <Field
                  labelProps={{ children: "Password" }}
                  inputProps={{
                    ...getInputProps(fields.description, { type: "text" }),
                    placeholder: "Short team description...",
                  }}
                  errors={fields.description.errors}
                />
              </div>
              <StatusButton
                loading={isPending}
                type="submit"
                className="w-full"
              >
                Get Started
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
