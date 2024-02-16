import { Form } from "@remix-run/react";
import { routes } from "~/lib/routing";

export default function Logout() {
  return (
    <Form method="POST" action={routes.auth.logout}>
      <button type="submit">Logout</button>
    </Form>
  );
}
