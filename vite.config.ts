import { unstable_vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

installGlobals();

// Remix will break other tools like Storybook and Vite if it's not
// disabled when running those tools.
const isStorybook = process.argv[1]?.includes("storybook");
const isVitest = process.env.VITEST;

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 3000,
  },
  plugins: [!isStorybook && !isVitest && remix(), tsconfigPaths()],
});
