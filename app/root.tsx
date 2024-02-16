import { json, LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { HoneypotProvider } from "remix-utils/honeypot/react";

import { GeneralErrorBoundary } from "~/components/error-boundary";
import { getEnv } from "~/lib/env.server";
import { honeypot } from "~/lib/honeypot.server";

import { useToast } from "~/components/toaster";
import { getToast } from "~/lib/toast.server";
import { combineHeaders } from "~/lib/utils";

import "./tailwind.css";

export const meta: MetaFunction<typeof loader> = () => {
  return [
    { title: "Shadownet" },
    {
      name: "description",
      content:
        "Your personal catchall for everything the web will throw at your app.",
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { toast, headers: toastHeaders } = await getToast(request);

  const honeyProps = honeypot.getInputProps();
  return json(
    { ENV: getEnv(), toast, honeyProps },
    {
      headers: combineHeaders(toastHeaders),
    }
  );
}

function Document({
  children,
  env = {},
}: {
  children: React.ReactNode;
  env?: Record<string, string>;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="dark bg-background text-foreground">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(env)}`,
          }}
        />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function App() {
  const data = useLoaderData<typeof loader>();

  useToast(data.toast);

  return (
    <Document env={data.ENV}>
      <Outlet />
    </Document>
  );
}

export default function AppWithProviders() {
  const data = useLoaderData<typeof loader>();
  return (
    <HoneypotProvider {...data.honeyProps}>
      <App />
    </HoneypotProvider>
  );
}

export function ErrorBoundary() {
  // NOTE: you cannot use useLoaderData in an ErrorBoundary because the loader
  // likely failed to run so we have to do the best we can.
  // We could probably do better than this (it's possible the loader did run).
  // This would require a change in Remix.

  // Just make sure your root route never errors out and you'll always be able
  // to give the user a better UX.

  return (
    <Document>
      <GeneralErrorBoundary />
    </Document>
  );
}
