import { type MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Shadownet" },
    { name: "description", content: "Welcome to the shadownet." },
  ];
};

export default function Index() {
  return (
    <main className="w-full h-screen flex flex-col gap-4 items-center justify-center">
      <h1>Welcome to Shadownet</h1>
    </main>
  );
}
