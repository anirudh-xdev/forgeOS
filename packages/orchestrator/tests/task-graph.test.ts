import { describe, it, expect } from "vitest";
import { TaskGraph } from "../src/task-graph.js";
import { AgentTask } from "@forgeos/contracts";
import { ForgeOSError } from "@forgeos/shared";

describe("TaskGraph (DAG Engine)", () => {
  const projectId = "11111111-1111-1111-1111-111111111111";

  it("should schedule root tasks with zero dependencies as ready", () => {
    const graph = new TaskGraph(projectId);

    const task1: AgentTask = {
      id: "task-1",
      projectId,
      agentId: "forgeos-pm-agent",
      input: "Build app",
      dependencies: [],
      status: "PENDING",
      retryCount: 0,
    };

    const task2: AgentTask = {
      id: "task-2",
      projectId,
      agentId: "forgeos-architect-agent",
      input: "Design app",
      dependencies: ["task-1"],
      status: "PENDING",
      retryCount: 0,
    };

    graph.addTask(task1);
    graph.addTask(task2);

    const ready = graph.getReadyTasks();
    expect(ready).toHaveLength(1);
    expect(ready[0]?.id).toBe("task-1");
  });

  it("should unlock dependent task once dependency completes", () => {
    const graph = new TaskGraph(projectId);

    const task1: AgentTask = {
      id: "task-1",
      projectId,
      agentId: "forgeos-pm-agent",
      input: "Build app",
      dependencies: [],
      status: "PENDING",
      retryCount: 0,
    };

    const task2: AgentTask = {
      id: "task-2",
      projectId,
      agentId: "forgeos-architect-agent",
      input: "Design app",
      dependencies: ["task-1"],
      status: "PENDING",
      retryCount: 0,
    };

    graph.addTask(task1);
    graph.addTask(task2);

    // Complete task 1
    graph.updateTaskStatus("task-1", "COMPLETED");

    const ready = graph.getReadyTasks();
    expect(ready).toHaveLength(1);
    expect(ready[0]?.id).toBe("task-2");
  });

  it("should throw an error when a cycle is introduced", () => {
    const graph = new TaskGraph(projectId);

    const taskA: AgentTask = {
      id: "task-a",
      projectId,
      agentId: "agent-a",
      input: "",
      dependencies: ["task-b"], // depends on B
      status: "PENDING",
      retryCount: 0,
    };

    const taskB: AgentTask = {
      id: "task-b",
      projectId,
      agentId: "agent-b",
      input: "",
      dependencies: ["task-a"], // depends on A -> CYCLE!
      status: "PENDING",
      retryCount: 0,
    };

    graph.addTask(taskA);

    expect(() => graph.addTask(taskB)).toThrow(ForgeOSError);
  });
});
