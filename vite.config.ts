/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the Express backend in dev so the browser only
    // ever talks to a same-origin /api and the API key stays server-side.
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
  test: {
    environment: "node",
  },
});
