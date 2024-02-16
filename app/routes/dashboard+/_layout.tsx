import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { NavLink, Outlet } from "@remix-run/react";
import Logout from "~/components/auth/logout";
import { GeneralErrorBoundary } from "~/components/error-boundary";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import { requireUserId } from "~/lib/auth.server";
import { routes } from "~/lib/routing";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request);
  return json({});
}

export default function DashboardLayout() {
  const nav = [
    { label: "Dashboard", href: routes.dashboard.index },
    { label: "Settings", href: "#" },
    { label: "Profile", href: "#" },
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
