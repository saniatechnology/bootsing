import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` throws when imported outside a React Server environment;
      // point it at an empty stub so server modules are unit-testable in Node.
      "server-only": fileURLToPath(new URL("./src/test-stubs/server-only.ts", import.meta.url)),
    },
  },
});
