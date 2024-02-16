import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { requireUserId } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  return json({ userId });
}

export default function UserDashboardRoute() {
  const { userId } = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>User Dashboard</h1>
      <p>{userId}</p>
    </div>
  );
}
