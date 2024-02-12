import { useSearchParams } from "@remix-run/react";
import { GeneralErrorBoundary } from "~/components/error-boundary";

export default function VerifyRoute() {
  const [searchParams] = useSearchParams();

  const target = searchParams.get("target");
  const type = searchParams.get("type");

  return (
    <div>
      <h1>VerifyRoute</h1>
      <p>Type: {type}</p>
      <p>Target: {target}</p>
    </div>
  );
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
