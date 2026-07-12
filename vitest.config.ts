import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Scoped unit-test config: only the in-repo `src/**` unit tests run under
// `npm test` / `vitest`. The Playwright e2e specs under `e2e/` are run
// separately via `npm run e2e` and must not be collected by vitest (their
// `test.describe` collides with vitest's global).
export default defineConfig({
  plugins: [react() as any],
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
