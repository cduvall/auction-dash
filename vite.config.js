import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3456,
    proxy: {
      "/api": "http://localhost:3457",
    },
  },
});
