import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { logout, requireUserId } from "~/lib/auth.server";
import { prisma } from "~/lib/db.server";
import { routes } from "~/lib/routing";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const requestUrl = new URL(request.url);
    const loginParams = new URLSearchParams([
      ["redirectTo", `${requestUrl.pathname}${requestUrl.search}`],
    ]);
    const redirectTo = `${routes.auth.login}?${loginParams}`;
    await logout({ request, redirectTo });
    return redirect(redirectTo);
  }

  return redirect(`/users/${user.username}`);
}
