import { Form } from "@remix-run/react";
import { Icons } from "~/components/ui/icons";
import { routes } from "~/lib/routing";
import { cn } from "~/lib/utils";

export default function Logout({ className = "" }: { className?: string }) {
  return (
    <Form method="POST" action={routes.auth.logout}>
      <button
        type="submit"
        className={cn("flex items-center space-x-2", className)}
      >
        <Icons.logout className="w-4 h-4 mr-2 rotate-180" /> Logout
      </button>
    </Form>
  );
}
