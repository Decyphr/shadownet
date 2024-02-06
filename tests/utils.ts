import { render as renderComponent } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";

export { screen } from "@testing-library/react";

/**
 * Render a component and return the result, with userEvent added to the result.
 *
 */

type RenderOptions = Parameters<typeof renderComponent>[1];

export const render = (ui: React.ReactElement, options?: RenderOptions) => {
  return {
    ...renderComponent(ui, options),
    user: userEvent.setup(),
  };
};
