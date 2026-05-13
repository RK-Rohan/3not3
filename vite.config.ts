import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fastpspMiddlewarePlugin } from "./fastpspMiddleware";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), fastpspMiddlewarePlugin(env)],
  };
});
