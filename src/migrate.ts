import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

async function migrate(): Promise<void> {
  console.log("Running prisma migrate deploy...");
  const { stdout, stderr } = await execAsync("pnpm exec prisma migrate deploy");
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  console.log("Migration complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
