import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import CyberpunkLoader from "~/components/cyberpunk-loader";

import { requireUserId } from "~/lib/auth.server";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request);

  return json({});
}

export default function Index() {
  return (
    <main className="w-full h-screen">
      <CyberpunkLoader />
      <h1>Welcome to Shadownet</h1>
    </main>
  );
}
