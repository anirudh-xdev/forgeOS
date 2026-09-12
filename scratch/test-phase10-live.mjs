import { io } from "../apps/api/node_modules/socket.io-client/build/esm/index.js";
import { buildServer } from "../apps/api/dist/server.js";
import { randomUUID } from "node:crypto";

async function main() {
  console.log("\n========================================================");
  console.log("  ForgeOS Phase 10: Live Realtime API & WebSockets E2E");
  console.log("========================================================\n");

  const port = 3001;

  // 1. Boot Fastify API & Socket.IO server connected to live Postgres & Redis
  const serverInstance = await buildServer({
    port,
    corsOrigin: "*",
  });

  const address = await serverInstance.start();
  console.log(`✔ Fastify API & Socket.IO server running at ${address}`);

  // 2. Connect client Socket.IO
  const clientSocket = io(`http://localhost:${port}`, {
    transports: ["websocket"],
    reconnection: false,
  });

  await new Promise((resolve, reject) => {
    clientSocket.on("connect", () => {
      console.log(`✔ Socket.IO client connected (ID: ${clientSocket.id})`);
      resolve();
    });
    clientSocket.on("connect_error", (err) => {
      reject(err);
    });
  });

  const liveEvents = [];
  clientSocket.on("domain_event", (event) => {
    liveEvents.push(event);
    console.log(`  [Socket.IO Stream] [${event.type}] Task: ${event.taskId?.slice(0, 8) ?? "N/A"} - Payload:`, typeof event.payload === "object" ? JSON.stringify(event.payload).slice(0, 80) : event.payload);
  });

  // 3. Launch a project workflow via REST API
  const projectId = randomUUID();
  clientSocket.emit("join_project", projectId);

  console.log(`\nSubmitting POST /api/projects for project ${projectId}...`);
  const createRes = await fetch(`http://localhost:${port}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      requirement: "Build a real-time event-driven notification service with Fastify and Redis Pub/Sub.",
      workflowType: "requirement_to_architecture",
      enableGates: false,
      enableRecovery: false,
    }),
  });

  if (createRes.status !== 202) {
    throw new Error(`Expected 202 Accepted, got: ${createRes.status}`);
  }

  const createBody = await createRes.json();
  console.log("✔ POST /api/projects Response:", createBody);

  // Wait for workflow completion and streaming events over Socket.IO
  console.log("Waiting for real-time WebSocket domain events to stream...");
  const maxWaitMs = 15000;
  const startWait = Date.now();

  while (!liveEvents.some((e) => e.type === "PROJECT_COMPLETED" || e.type === "PROJECT_FAILED")) {
    if (Date.now() - startWait > maxWaitMs) {
      throw new Error("Timed out waiting for workflow completion events over Socket.IO");
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`✔ Received ${liveEvents.length} real-time domain events over WebSocket connection!`);

  // 4. Query GET /api/projects
  const listRes = await fetch(`http://localhost:${port}/api/projects`);
  const listBody = await listRes.json();
  console.log(`✔ GET /api/projects: Retrieved ${listBody.length} project(s)`);

  // 5. Query GET /api/projects/:id/dag
  const dagRes = await fetch(`http://localhost:${port}/api/projects/${projectId}/dag`);
  const dagBody = await dagRes.json();
  console.log(`✔ GET /api/projects/:id/dag: Visualizer graph returned ${dagBody.nodes.length} nodes, ${dagBody.edges.length} edges`);
  console.log(`  DAG Completion Status: isComplete = ${dagBody.isComplete}, hasFailures = ${dagBody.hasFailures}`);

  for (const node of dagBody.nodes) {
    console.log(`  - Node [${node.id.slice(0, 8)}]: Agent=${node.agentId} | Status=${node.status}`);
  }

  // 6. Query GET /api/projects/:id/artifacts/:artifactId
  const detailRes = await fetch(`http://localhost:${port}/api/projects/${projectId}`);
  const detailBody = await detailRes.json();

  if (detailBody.artifacts.length > 0) {
    const sampleArtifact = detailBody.artifacts[0];
    const artRes = await fetch(`http://localhost:${port}/api/projects/${projectId}/artifacts/${sampleArtifact.id}`);
    const artBody = await artRes.json();
    console.log(`✔ GET /api/projects/:id/artifacts/:artifactId: Retrieved '${artBody.type}' deliverable (Status: ${artBody.status})`);

    // 7. Test Human-in-the-Loop Gate Override
    console.log(`Testing POST /api/projects/:id/gates/:gateId/decision (Human Override)...`);
    const overrideRes = await fetch(`http://localhost:${port}/api/projects/${projectId}/gates/${sampleArtifact.id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve",
        reason: "Manual review approved by human operator in control plane.",
        overrideFeedback: "Looks solid and complies with architectural guidelines.",
      }),
    });

    const overrideBody = await overrideRes.json();
    console.log("✔ Human Override Result:", overrideBody);
  }

  // Teardown
  clientSocket.disconnect();
  await serverInstance.stop();

  console.log("\n========================================================");
  console.log("  ✔ Phase 10 Live Realtime API & WebSockets PASSED");
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("FATAL ERROR in test-phase10-live:", err);
  process.exit(1);
});
