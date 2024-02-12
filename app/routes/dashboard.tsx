import { json, type LoaderFunctionArgs } from "@remix-run/node";

import Logout from "~/components/auth/logout";
import { requireUserId } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request);
  return json({});
}

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Logout />
    </div>
  );
}
