import { defineConfig } from "vitest/config";

// Unit tests, run in happy-dom (a lightweight browser) with the panel opened from a LAN address.
// Run with `npm test`.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "happy-dom",
    environmentOptions: { happyDOM: { url: "http://192.168.1.20:8123/doorbell" } },
    setupFiles: ["test/setup.ts"],
  },
});
