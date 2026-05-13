import { spawn } from "node:child_process";

const port = process.env.PORT || "4173";
const command = `npx vite preview --host 0.0.0.0 --port ${String(port)}`;

const child = spawn(command, {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
