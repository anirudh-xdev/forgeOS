import { prisma } from "../packages/database/dist/index.js";

async function main() {
  const artifacts = await prisma.artifact.findMany({
    where: { projectId: "71e3aabd-e823-43d0-9cec-6fabf608c041" },
    orderBy: { createdAt: "asc" },
  });

  for (const a of artifacts) {
    console.log(`\n========================================`);
    console.log(`Artifact: ${a.type} (v${a.version}) by ${a.createdBy} - Status: ${a.status}`);
    if (a.type === "DatabaseSchema") {
      console.log("DatabaseSchema Content:", JSON.stringify(a.content, null, 2).slice(0, 500));
    } else if (a.type === "UISpecification") {
      console.log("UISpecification Content:", JSON.stringify(a.content, null, 2).slice(0, 500));
    } else if (a.type === "ReviewReport") {
      console.log("ReviewReport Content:", JSON.stringify(a.content, null, 2));
    } else if (a.type === "SecurityReport") {
      console.log("SecurityReport Content:", JSON.stringify(a.content, null, 2));
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
