import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import process from "node:process";

export default defineConfig({
  plugins: [
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
      },

      // The entire app is prerendered; no backend or running Node server is needed.
      // See https://svelte.dev/docs/kit/adapters for more information about adapters.
      adapter: adapter(),
      // GitHub Pages sets this during deployment; local development uses /.
      paths: {
        base: (process.env.BASE_PATH || "") as "" | `/${string}`,
      },
    }),
  ],
});
