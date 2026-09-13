import { prisma } from "../packages/database/dist/index.js";

async function main() {
  const projectId = "71e3aabd-e823-43d0-9cec-6fabf608c041";
  console.log("Updating stuck tasks and project status for", projectId);
  await prisma.agentTask.updateMany({
    where: {
      projectId,
      status: { in: ["RUNNING", "RETRYING", "PENDING"] },
    },
    data: { status: "CANCELLED" },
  });
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "FAILED" },
  });
  console.log("Stuck project cleaned up successfully.");
  await prisma.$disconnect();
}

main().catch(console.error);
