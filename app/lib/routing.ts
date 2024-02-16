/**
 * Route Management
 * This file contains all the routes for the application.
 * Storing all routes in a single file will make it easier to manage and update them.
 *
 ** Groups:
 ** auth - Authentication Routes
 *
 *
 ** Usage Examples:
 *  const loginUrl = routes.auth.login; // Static routes do not require any dynamic segments or "generation"
 *  const orgUrl = generateRoute(routes.org.index, { 'org-id': 'my-org' });
 *  const projectUrl = generateRoute(routes.project.detail, { 'org-id': 'my-org', 'project-id': '12345' });
 *
 *  In the above examples, the generated routes would be:
 *  - loginUrl = '/login'
 *  - orgUrl = '/my-org'
 *  - ranchUrl = '/my-org/project/12345'
 */

const auth = {
  login: "/login",
  logout: "/logout",
  signup: "/signup",
  verify: "/verify",
  me: "/me",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
};

const dashboard = {
  index: "/dashboard",
  user: "/dashboard/[user-id]",
};

export const routes = {
  auth,
  dashboard,
};

// Function to replace dynamic segments
export function generateRoute(
  template: string,
  params: { [key: string]: string }
): string {
  // replace all dynamic segments with actual values
  return Object.keys(params).reduce((url, key) => {
    return url.replace(`[${key}]`, params[key]);
  }, template);
}
