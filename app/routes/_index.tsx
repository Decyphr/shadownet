import { json, type MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import CyberpunkLoader from "~/components/cyberpunk-loader";
import { prisma } from "~/lib/db.server";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export async function loader() {
  const user = await prisma.user.findMany();

  return json({ user });
}

export default function Index() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <>
      <CyberpunkLoader />
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </>
  );
}
