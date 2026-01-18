import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    sequence: {
      shuffle: true,
    },
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    globals: true,
    css: true,
  },
});
