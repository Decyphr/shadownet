import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";

import { requireUserId } from "~/lib/auth.server";
import { prisma } from "~/lib/db.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireUserId(request);
  invariant(params["team-id"], "Team is required");

  const members = await prisma.team.findUnique({
    where: {
      id: params["team-id"],
    },
    include: { members: true },
  });

  return json({ members });
}

export default function TeamDashboardRoute() {
  const { members } = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>Team Dashboard:</h1>
      <pre>{JSON.stringify(members, null, 2)}</pre>
    </div>
  );
}
