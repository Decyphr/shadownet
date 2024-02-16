import { expect, test as setup } from "@playwright/test";
import { routes } from "~/lib/routing";

const authFile = "test/playwright/.auth/user.json";

const user = {
  email: "test@test.com",
  password: "super-secret",
};

setup("authenticate", async ({ page }) => {
  await page.goto(routes.auth.login);
  await page.getByTestId("login-email").fill(user.email);
  await page.getByTestId("login-password").fill(user.password);
  await page.getByTestId("login-submit").click();

  // add expectations for successful login
  await expect(page).toHaveTitle("Dashboard");

  // End of authentication steps.
  await page.context().storageState({ path: authFile });
});
