import { Form } from "@remix-run/react";

export default function Logout() {
  return (
    <Form method="POST" action="/logout">
      <button type="submit">Logout</button>
    </Form>
  );
}
