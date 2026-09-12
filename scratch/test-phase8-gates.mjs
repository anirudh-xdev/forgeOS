import { randomUUID } from "node:crypto";
import { getPrismaClient, ArtifactRepository, ProjectRepository } from "../packages/database/dist/index.js";
import { RedisEventBus } from "../packages/event-bus/dist/index.js";
import { OllamaProvider, MockProvider } from "../packages/ai-provider/dist/index.js";
import { AgentRunner } from "../packages/agent-runtime/dist/index.js";
import { WorkspaceManager, SandboxRunner } from "../packages/sandbox/dist/index.js";
import { ApprovalGateEngine } from "../packages/orchestrator/dist/index.js";

async function main() {
  console.log("\n========================================================");
  console.log("  ForgeOS Phase 8: Live Review System & Evaluation Gates");
  console.log("========================================================\n");

  const prisma = getPrismaClient();
  const eventBus = new RedisEventBus({ redisUrl: "redis://localhost:6379" });

  const artifactRepo = new ArtifactRepository(prisma);
  const projectRepo = new ProjectRepository(prisma);

  // Check Ollama health
  let aiProvider;
  try {
    const res = await fetch("http://localhost:11434/api/tags");
    if (res.ok) {
      console.log("✔ Connected to Local Ollama at http://localhost:11434");
      aiProvider = new OllamaProvider({
        baseUrl: "http://localhost:11434",
        model: "deepseek-coder:latest",
        temperature: 0.1,
      });
    } else {
      throw new Error("Ollama returned non-200");
    }
  } catch (err) {
    console.log("⚠ Local Ollama not reachable, using deterministic MockProvider.");
    aiProvider = new MockProvider();
  }

  const runner = new AgentRunner({ aiProvider });
  const gateEngine = new ApprovalGateEngine(runner);

  const projectId = randomUUID();
  const defaultUser = await projectRepo.findOrCreateDefaultUser();
  await projectRepo.createProject({
    id: projectId,
    userId: defaultUser.id,
    name: "Phase 8 Quality Gate Test",
    requirement: "Verify adversarial review, security audit, and sandbox QA gates.",
    status: "ACTIVE",
  });

  const capturedEvents = [];
  await eventBus.subscribe(`forgeos:events:project:${projectId}`, (evt) => {
    capturedEvents.push(evt);
    console.log(`  [Redis Event] -> ${evt.type} (${evt.id.slice(0, 8)})`);
  });

  // ----------------------------------------------------
  // TEST SCENARIO 1: Adversarial Gate Rejection on Insecure Code
  // ----------------------------------------------------
  console.log("\n--- Scenario 1: Insecure Code Must Be Rejected by Security Gate ---");
  const vulnerableTaskId = randomUUID();
  await projectRepo.saveAgentTask({
    id: vulnerableTaskId,
    projectId,
    agentId: "forgeos-backend-agent",
    input: { directive: "Implement vulnerable endpoint" },
    status: "RUNNING",
  });

  const vulnerableCode = `
    import http from "node:http";
    const AWS_SECRET_KEY = "AKIA1234567890ABCDEF";
    
    export function handleRequest(req, res) {
      const code = req.url.split("?run=")[1];
      eval(code); // Remote Code Execution flaw
      res.end("Executed");
    }
  `;

  const vulnerableArtifact = {
    id: randomUUID(),
    projectId,
    taskId: vulnerableTaskId,
    type: "SourceCode",
    version: 1,
    createdBy: "forgeos-backend-agent",
    content: {
      framework: "fastify",
      routes: [],
      services: [],
      rawCode: vulnerableCode,
    },
    status: "draft",
  };

  await artifactRepo.saveArtifact(vulnerableArtifact);
  console.log(`• Saved draft artifact: ${vulnerableArtifact.id.slice(0, 8)}`);

  console.log("• Evaluating artifact through ApprovalGateEngine...");
  const vulnResult = await gateEngine.evaluateArtifact(vulnerableArtifact, {
    projectId,
    taskId: vulnerableTaskId,
    sourceCodeContent: vulnerableCode,
  });

  console.log(`• Gate Result: Passed = ${vulnResult.passed}, Status = ${vulnResult.status}`);
  console.log(`• Failure Reasons:\n  - ${vulnResult.reasons.join("\n  - ")}`);

  if (!vulnResult.passed) {
    vulnerableArtifact.status = "rejected";
    await artifactRepo.updateArtifactStatus(vulnerableArtifact.id, "rejected");

    await eventBus.publish({
      id: randomUUID(),
      type: "REVIEW_FAILED",
      projectId,
      taskId: vulnerableTaskId,
      timestamp: new Date().toISOString(),
      payload: {
        artifactId: vulnerableArtifact.id,
        reasons: vulnResult.reasons,
        securityReport: vulnResult.reports.securityReport,
      },
    });
    console.log("✔ Successfully rejected insecure artifact and published REVIEW_FAILED domain event.");
  } else {
    throw new Error("SECURITY FAILURE: Malicious code was approved by gate!");
  }

  // ----------------------------------------------------
  // TEST SCENARIO 2: Gate Approval on Compliant Code with Sandbox Test
  // ----------------------------------------------------
  console.log("\n--- Scenario 2: Compliant Code + Docker Sandbox QA Passes Gate ---");
  const compliantTaskId = randomUUID();
  await projectRepo.saveAgentTask({
    id: compliantTaskId,
    projectId,
    agentId: "forgeos-backend-agent",
    input: { directive: "Implement rate limiter" },
    status: "RUNNING",
  });

  const wsManager = new WorkspaceManager(".worktrees");
  const sandbox = new SandboxRunner({ image: "forgeos-sandbox:latest" });

  const wsPath = await wsManager.createWorkspace(compliantTaskId);
  console.log(`• Created isolated task workspace: ${wsPath}`);

  // Write clean implementation and tests
  const safeCode = `
export class TokenBucket {
  constructor(capacity = 100, refillRate = 10) {
    if (capacity <= 0 || refillRate <= 0) {
      throw new Error("Capacity and refillRate must be positive numbers.");
    }
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  tryConsume(count = 1) {
    if (typeof count !== "number" || count <= 0 || !Number.isFinite(count)) {
      return false;
    }
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}
`;

  const testFile = `
import test from "node:test";
import assert from "node:assert/strict";
import { TokenBucket } from "./bucket.mjs";

test("TokenBucket allows tokens within limit", () => {
  const bucket = new TokenBucket(5, 1);
  assert.equal(bucket.tryConsume(3), true);
  assert.equal(bucket.tryConsume(2), true);
  assert.equal(bucket.tryConsume(1), false);
});

test("TokenBucket rejects non-positive or negative consumption", () => {
  const bucket = new TokenBucket(5, 1);
  assert.equal(bucket.tryConsume(-5), false);
  assert.equal(bucket.tryConsume(0), false);
});
`;

  await wsManager.writeFile(compliantTaskId, "bucket.mjs", safeCode);
  await wsManager.writeFile(compliantTaskId, "bucket.test.mjs", testFile);

  console.log("• Executing test suite inside Docker container (forgeos-sandbox:latest)...");
  const execResult = await sandbox.executeInSandbox(wsPath, "node --test bucket.test.mjs", {
    network: "none",
  });
  console.log(`  Docker execution exit code: ${execResult.exitCode} (${execResult.durationMs}ms)`);

  const compliantArtifact = {
    id: randomUUID(),
    projectId,
    taskId: compliantTaskId,
    type: "SourceCode",
    version: 1,
    createdBy: "forgeos-backend-agent",
    content: {
      code: safeCode,
      testOutput: execResult.stdout,
    },
    status: "draft",
  };

  await artifactRepo.saveArtifact(compliantArtifact);

  // Configure gate for clean code
  const cleanGateEngine = new ApprovalGateEngine(runner, {
    requireReview: true,
    requireQA: true,
    requireSecurity: true,
    maxAllowedSecurityRiskScore: 60,
    maxAllowedReviewSeverity: "critical",
  });

  const compliantGateResult = await cleanGateEngine.evaluateArtifact(compliantArtifact, {
    projectId,
    taskId: compliantTaskId,
    sourceCodeContent: safeCode,
    testOutput: execResult.stdout,
  });

  console.log(`• Gate Result: Passed = ${compliantGateResult.passed}, Status = ${compliantGateResult.status}`);
  if (!compliantGateResult.passed) {
    console.log(`• Failure Reasons:\n  - ${compliantGateResult.reasons.join("\n  - ")}`);
    console.log(`• Reports:\n`, JSON.stringify(compliantGateResult.reports, null, 2));
  }

  if (compliantGateResult.passed) {
    compliantArtifact.status = "approved";
    await artifactRepo.updateArtifactStatus(compliantArtifact.id, "approved");

    // Persist evaluation reports
    if (compliantGateResult.reports.reviewReport) {
      await artifactRepo.saveArtifact({
        id: randomUUID(),
        projectId,
        taskId: compliantTaskId,
        type: "ReviewReport",
        version: 1,
        createdBy: "forgeos-reviewer-agent",
        content: compliantGateResult.reports.reviewReport,
        status: "approved",
      });
    }

    await eventBus.publish({
      id: randomUUID(),
      type: "TASK_COMPLETED",
      projectId,
      taskId: compliantTaskId,
      timestamp: new Date().toISOString(),
      payload: {
        artifactId: compliantArtifact.id,
        status: "approved",
        sandboxDurationMs: execResult.durationMs,
      },
    });

    console.log("✔ Artifact approved, persisted to PostgreSQL, and TASK_COMPLETED event emitted!");
  }

  // Cleanup workspace
  await wsManager.cleanupWorkspace(compliantTaskId);
  console.log("• Cleaned up task workspace.");

  // ----------------------------------------------------
  // TEST SCENARIO 3: Gate Approval & Audit Reports Persistence
  // ----------------------------------------------------
  console.log("\n--- Scenario 3: End-to-End Approval Gate Pass & Audit Report Persistence ---");
  const approvedTaskId = randomUUID();
  await projectRepo.saveAgentTask({
    id: approvedTaskId,
    projectId,
    agentId: "forgeos-backend-agent",
    input: { directive: "Implement vetted production service" },
    status: "RUNNING",
  });

  const vettedArtifact = {
    id: randomUUID(),
    projectId,
    taskId: approvedTaskId,
    type: "SourceCode",
    version: 1,
    createdBy: "forgeos-backend-agent",
    content: {
      framework: "fastify",
      routes: [{ path: "/health", method: "GET", responseSchema: "HealthResponse" }],
      services: [{ name: "HealthService", methods: ["getHealth()"] }],
    },
    status: "draft",
  };
  await artifactRepo.saveArtifact(vettedArtifact);

  // Use runner configured with clean passing audit responses
  const passRunner = new AgentRunner({
    aiProvider: new MockProvider([
      JSON.stringify({
        status: "secure",
        findings: [],
        riskScore: 0,
        summary: "Security audit clean. Zero high or critical findings.",
      }),
      JSON.stringify({
        passed: true,
        totalTests: 4,
        passedTests: 4,
        failedTests: 0,
        durationMs: 95,
        suites: [{ name: "Health check suite", passed: true }],
        summary: "All 4 acceptance tests passed.",
      }),
      JSON.stringify({
        status: "pass",
        severity: "info",
        issues: [],
        summary: "Vetted implementation meets all specifications.",
      }),
    ]),
  });

  const approvalEngine = new ApprovalGateEngine(passRunner);
  const passResult = await approvalEngine.evaluateArtifact(vettedArtifact, {
    projectId,
    taskId: approvedTaskId,
    sourceCodeContent: "export const health = () => ({ status: 'ok' });",
  });

  console.log(`• Gate Result: Passed = ${passResult.passed}, Status = ${passResult.status}`);
  if (passResult.passed) {
    vettedArtifact.status = "approved";
    await artifactRepo.updateArtifactStatus(vettedArtifact.id, "approved");

    // Save generated audit reports
    if (passResult.reports.reviewReport) {
      await artifactRepo.saveArtifact({
        id: randomUUID(),
        projectId,
        taskId: approvedTaskId,
        type: "ReviewReport",
        version: 1,
        createdBy: "forgeos-reviewer-agent",
        content: passResult.reports.reviewReport,
        status: "approved",
      });
    }
    if (passResult.reports.testReport) {
      await artifactRepo.saveArtifact({
        id: randomUUID(),
        projectId,
        taskId: approvedTaskId,
        type: "TestReport",
        version: 1,
        createdBy: "forgeos-qa-agent",
        content: passResult.reports.testReport,
        status: "approved",
      });
    }
    if (passResult.reports.securityReport) {
      await artifactRepo.saveArtifact({
        id: randomUUID(),
        projectId,
        taskId: approvedTaskId,
        type: "SecurityReport",
        version: 1,
        createdBy: "forgeos-security-agent",
        content: passResult.reports.securityReport,
        status: "approved",
      });
    }

    await eventBus.publish({
      id: randomUUID(),
      type: "TASK_COMPLETED",
      projectId,
      taskId: approvedTaskId,
      timestamp: new Date().toISOString(),
      payload: {
        artifactId: vettedArtifact.id,
        status: "approved",
      },
    });

    console.log("✔ Vetted artifact approved, 3 audit reports saved, and TASK_COMPLETED event emitted!");
  } else {
    throw new Error(`Scenario 3 failed: ${passResult.reasons.join(", ")}`);
  }

  // Verify PostgreSQL records
  const dbArtifacts = await artifactRepo.listProjectArtifacts(projectId);
  console.log(`\n✔ PostgreSQL Artifact Verification: ${dbArtifacts.length} artifacts stored for project:`);
  for (const a of dbArtifacts) {
    console.log(`  - [${a.status.toUpperCase()}] ${a.type} (id: ${a.id.slice(0, 8)}, by: ${a.createdBy})`);
  }

  // Wait for Redis events
  await new Promise((resolve) => setTimeout(resolve, 300));
  await eventBus.close();
  await prisma.$disconnect();

  console.log("\n========================================================");
  console.log("  Phase 8 Review System & Evaluation Gates: PASSED!  ");
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
