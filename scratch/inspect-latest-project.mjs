import { prisma } from "../packages/database/dist/index.js";

async function run() {
  const p = await prisma.project.findFirst({
    orderBy: { createdAt: "desc" },
    include: { tasks: true, artifacts: true },
  });
  if (!p) {
    console.log("No projects found");
    return;
  }
  console.log("Latest Project:", p.id, "Status:", p.status);
  console.log("\nTasks:");
  for (const t of p.tasks) {
    console.log(`- [${t.agentId}] status=${t.status} retries=${t.retryCount} error=${t.error || "none"}`);
  }
  console.log("\nArtifacts:");
  for (const a of p.artifacts) {
    console.log(`- [${a.type}] status=${a.status} version=${a.version} name=${a.name}`);
    if (a.type === "SourceCode") {
      console.log(`  [SourceCode content]:`, JSON.stringify(a.content, null, 2));
    }
  }
  await prisma.$disconnect();
}

run().catch(console.error);
