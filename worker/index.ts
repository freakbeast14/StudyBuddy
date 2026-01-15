import Boss from "pg-boss";
import { env } from "@/env";
import { processDocumentJob } from "@/jobs/processDocument";
import { JOBS } from "@/jobs/types";

async function main() {
  const boss = new Boss({ connectionString: env.DATABASE_URL });
  await boss.start();
  // eslint-disable-next-line no-console
  console.log("pg-boss worker started");

  await boss.work(JOBS.PROCESS_DOCUMENT, async (job) => {
    await processDocumentJob(job.data);
    return true;
  });

  const shutdown = async () => {
    // eslint-disable-next-line no-console
    console.log("Shutting down worker...");
    await boss.stop({ timeout: 5000 });
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Worker failed to start", error);
  process.exit(1);
});
