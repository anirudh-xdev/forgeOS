import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getPrismaClient, disconnectPrisma } from "../src/client.js";
import { ArtifactRepository } from "../src/repositories/artifact.repository.js";
import { ProjectRepository } from "../src/repositories/project.repository.js";

describe("Database Repositories (Integration)", () => {
  const prisma = getPrismaClient();
  const projectRepo = new ProjectRepository(prisma);
  const artifactRepo = new ArtifactRepository(prisma);

  const testProjectId = `test-proj-${Date.now()}`;
  let testUser: { id: string; email: string };

  beforeAll(async () => {
    // Ensure test user exists
    testUser = await projectRepo.findOrCreateDefaultUser(
      "test-developer@forgeos.local",
      "Test Developer"
    );
  });

  afterAll(async () => {
    // Clean up created test project and disconnect
    try {
      await prisma.project.deleteMany({
        where: { id: testProjectId },
      });
    } catch {
      // ignore
    }
    await disconnectPrisma();
  });

  it("should create a project and initialize its budget", async () => {
    const project = await projectRepo.createProject({
      id: testProjectId,
      userId: testUser.id,
      name: "Test ForgeOS Workspace",
      requirement: "Build a persistent multi-agent system",
    });

    expect(project.id).toBe(testProjectId);
    expect(project.name).toBe("Test ForgeOS Workspace");
    expect(project.budget).toBeDefined();
    expect(project.budget?.maxTokens).toBe(500000);
  });

  it("should save and retrieve an agent task", async () => {
    const taskId = `task-${Date.now()}`;
    const task = await projectRepo.saveAgentTask({
      id: taskId,
      projectId: testProjectId,
      agentId: "pm-agent",
      input: { requirement: "Test PM spec" },
      status: "PENDING",
    });

    expect(task.id).toBe(taskId);
    expect(task.agentId).toBe("pm-agent");
    expect(task.status).toBe("PENDING");

    const updatedTask = await projectRepo.updateTaskStatus(taskId, "IN_PROGRESS");
    expect(updatedTask.status).toBe("IN_PROGRESS");
  });

  it("should persist an artifact and update its status", async () => {
    const artifactId = `art-${Date.now()}`;
    const artifact = await artifactRepo.saveArtifact({
      id: artifactId,
      projectId: testProjectId,
      type: "ProductSpecification",
      version: 1,
      createdBy: "pm-agent",
      content: {
        title: "Test Feature Spec",
        overview: "Spec for testing artifact persistence",
        functionalRequirements: ["F1: Persistence"],
        nonFunctionalRequirements: ["N1: High throughput"],
        constraints: [],
        acceptanceCriteria: ["AC1: Database saves artifact"],
      },
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(artifact.id).toBe(artifactId);
    expect(artifact.type).toBe("ProductSpecification");
    expect(artifact.status).toBe("draft");

    const fetched = await artifactRepo.getArtifact(artifactId);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(artifactId);
    expect(fetched?.createdBy).toBe("pm-agent");

    // Update status to approved
    const approved = await artifactRepo.updateArtifactStatus(
      artifactId,
      "approved"
    );
    expect(approved.status).toBe("approved");

    // List artifacts for project
    const list = await artifactRepo.listProjectArtifacts(testProjectId);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some((a) => a.id === artifactId)).toBe(true);
  });

  it("should record domain events and agent execution runs", async () => {
    const taskId = `task-run-${Date.now()}`;
    await projectRepo.saveAgentTask({
      id: taskId,
      projectId: testProjectId,
      agentId: "architect-agent",
      input: { requirement: "Architecture generation" },
      status: "COMPLETED",
    });

    const run = await projectRepo.saveAgentRun({
      taskId,
      provider: "ollama",
      model: "deepseek-coder:latest",
      inputTokens: 120,
      outputTokens: 450,
      latencyMs: 1250,
      status: "success",
    });

    expect(run.id).toBeDefined();
    expect(run.taskId).toBe(taskId);
    expect(run.status).toBe("success");

    const event = await projectRepo.saveDomainEvent({
      projectId: testProjectId,
      type: "artifact.created",
      taskId,
      payload: { artifactType: "ArchitectureSpecification" },
    });

    expect(event.id).toBeDefined();
    expect(event.type).toBe("artifact.created");

    const events = await projectRepo.listDomainEvents(testProjectId);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });
});
