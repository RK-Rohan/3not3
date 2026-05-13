import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fastpspMiddlewarePlugin } from "./fastpspMiddleware";

export default defineConfig({
  plugins: [react(), fastpspMiddlewarePlugin()],
});
