import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";

import { requireUserId } from "~/lib/auth.server";
import { generateRoute, routes } from "~/lib/routing";

export const meta: MetaFunction = () => {
  return [
    { title: "Shadownet" },
    { name: "description", content: "Welcome to the shadownet!" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  return json({ userId });
}

export default function Index() {
  const { userId } = useLoaderData<typeof loader>();

  return (
    <main className="w-full h-screen flex flex-col gap-4 items-center justify-center">
      <h1>Welcome to Shadownet</h1>
      <Button variant="outline" asChild>
        <Link
          to={generateRoute(routes.dashboard.user, {
            "user-id": userId,
          })}
        >
          Go to Dashboard
        </Link>
      </Button>
    </main>
  );
}
