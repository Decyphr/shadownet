import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { NavLink, Outlet, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import Logout from "~/components/auth/logout";
import { GeneralErrorBoundary } from "~/components/error-boundary";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import { requireUserId } from "~/lib/auth.server";
import { generateRoute, routes } from "~/lib/routing";

export async function loader({ request, params }: LoaderFunctionArgs) {
  invariant(params["team-id"], "Team ID is required");
  await requireUserId(request);
  return json({ teamId: params["team-id"] });
}

export default function DashboardLayout() {
  const { teamId } = useLoaderData<typeof loader>();

  const nav = [
    {
      label: "Projects",
      href: generateRoute(routes.team.projects, {
        "team-id": teamId,
      }),
    },
    { label: "Settings", href: "#settings" },
    { label: "Profile", href: "#profile" },
  ];

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen border">
      <ResizablePanel defaultSize={12} maxSize={15} minSize={10}>
        <div className="h-full flex flex-col justify-between">
          <nav className="flex flex-col">
            {nav.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className="text-sm text-foreground py-2 px-4 border-b hover:bg-foreground/10 focus:bg-foreground/10"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Logout className="w-full border-t text-left text-sm text-foreground py-2 px-4 border-b hover:bg-foreground/10 focus:bg-foreground/10" />
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={85}>
        <div className="flex h-full p-6">
          <Outlet />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
