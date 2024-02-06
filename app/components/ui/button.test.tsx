import { axe, toHaveNoViolations } from "jest-axe";
import { test } from "vitest";

import { render, screen } from "tests/utils";
import { StatusButton } from "~/components/ui/button";

expect.extend(toHaveNoViolations);

test("status button renders", () => {
  render(<StatusButton loading={false}>Submit</StatusButton>);
});

test("status button is accessible", async () => {
  const { container } = render(
    <StatusButton loading={false}>Submit</StatusButton>
  );
  const result = await axe(container);

  expect(result).toHaveNoViolations();
});

test("status button is disabled when loading", async () => {
  render(<StatusButton loading={true}>Submit</StatusButton>);

  const button = screen.getByRole("button", { name: /submit/i });

  expect(button).toBeDisabled();
});
