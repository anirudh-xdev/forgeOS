import { prisma } from "../packages/database/dist/index.js";

async function main() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    include: {
      tasks: { include: { runs: true } },
      artifacts: true,
      events: { take: 10, orderBy: { timestamp: "desc" } },
    },
  });

  for (const p of projects) {
    console.log("\n==============================================");
    console.log("Project:", p.id, "Status:", p.status, "Req:", p.requirement.slice(0, 60));
    console.log("Tasks:");
    for (const t of p.tasks) {
      console.log(`  [${t.agentId}] status=${t.status}, runs=${t.runs.length}`);
    }
    console.log("Artifacts:");
    for (const a of p.artifacts) {
      console.log(`  [${a.type}] status=${a.status}, createdBy=${a.createdBy}`);
    }
    console.log("Recent Events:");
    for (const e of p.events) {
      console.log(`  [${e.type}]`, JSON.stringify(e.payload));
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
