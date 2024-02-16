/// <reference types="vitest" />

import { unstable_vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { flatRoutes } from "remix-flat-routes";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

installGlobals();

// Remix will break other tools like Storybook and Vite if it's not
// disabled when running those tools.
const isStorybook = process.argv[1]?.includes("storybook");
const isVitest = process.env.VITEST;

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 8080,
  },
  plugins: [
    !isStorybook &&
      !isVitest &&
      remix({
        // ignore all files in routes folder to prevent
        // default remix convention from picking up routes
        ignoredRouteFiles: ["**/*"],
        routes: async (defineRoutes) => {
          return flatRoutes("routes", defineRoutes);
        },
      }),
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]], // use jsdom for JSX component tests, node for everything else
    include: ["**/*.test.tsx", "**/*.test.ts"],
    coverage: {
      include: ["**/*"],
      exclude: [
        "tests/**",
        "**/*.d.ts",
        "**/*.test.*",
        "**/*.config.*",
        "**/snapshot-tests/**",
        "**/*.solution.tsx",
        "**/coverage/**",
      ],
      all: true,
    },
  },
});
