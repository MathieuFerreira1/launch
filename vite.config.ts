import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import {
  assertPublicBuildConfig,
  publicBuildCommit,
  publicBuildDiagnostics,
} from "./src/lib/supabase-config.ts";
export default defineConfig(({ command, mode }) => {
  const commit = publicBuildCommit(process.env);
  if (command === "build") {
    // Vite's own loader uses the same mode, root and process-env precedence.
    const env = loadEnv(mode, process.cwd(), "VITE_");
    console.info(
      "[launch:build]",
      JSON.stringify({
        mode,
        commit,
        ...publicBuildDiagnostics(env),
      }),
    );
    assertPublicBuildConfig(env, process.env.WORKERS_CI === "1");
  }
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "launch-build-commit",
        transformIndexHtml: () =>
          commit
            ? [
                {
                  tag: "meta",
                  attrs: { name: "launch-commit", content: commit },
                  injectTo: "head" as const,
                },
              ]
            : [],
      },
    ],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      restoreMocks: true,
    },
  };
});
