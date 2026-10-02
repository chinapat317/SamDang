import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  root: path.resolve(import.meta.dirname, "../.."),
  test: {
    environment: "jsdom",
    include: ["src/test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, ".."),
    },
  },
});
