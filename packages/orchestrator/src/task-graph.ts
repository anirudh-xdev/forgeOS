import { ForgeOSError } from "@forgeos/shared";
import { AgentTask, TaskStatus } from "@forgeos/contracts";

export class TaskGraph {
  public readonly projectId: string;
  private tasks = new Map<string, AgentTask>();

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  public addTask(task: AgentTask): void {
    if (this.tasks.has(task.id)) {
      throw new ForgeOSError(`Task with id '${task.id}' already exists in graph.`, "DUPLICATE_TASK", 400);
    }
    this.tasks.set(task.id, { ...task });
    this.assertNoCycles();
  }

  public getTask(taskId: string): AgentTask {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new ForgeOSError(`Task '${taskId}' not found in task graph.`, "TASK_NOT_FOUND", 404);
    }
    return task;
  }

  public getAllTasks(): AgentTask[] {
    return Array.from(this.tasks.values());
  }

  public updateTaskStatus(taskId: string, status: TaskStatus): void {
    const task = this.getTask(taskId);
    task.status = status;
    task.updatedAt = new Date().toISOString();
  }

  public prepareRetry(taskId: string, augmentedInput?: unknown): AgentTask {
    const task = this.getTask(taskId);
    task.status = "PENDING";
    task.retryCount = (task.retryCount ?? 0) + 1;
    if (augmentedInput !== undefined) {
      task.input = augmentedInput;
    }
    task.updatedAt = new Date().toISOString();
    return task;
  }

  public getReadyTasks(): AgentTask[] {
    const ready: AgentTask[] = [];

    for (const task of this.tasks.values()) {
      if (task.status !== "PENDING") {
        continue;
      }

      // Check all dependencies
      const allDependenciesCompleted = task.dependencies.every((depId) => {
        const dep = this.tasks.get(depId);
        return dep && dep.status === "COMPLETED";
      });

      if (allDependenciesCompleted) {
        ready.push(task);
      }
    }

    return ready;
  }

  public isComplete(): boolean {
    return Array.from(this.tasks.values()).every(
      (task) => task.status === "COMPLETED" || task.status === "CANCELLED"
    );
  }

  public hasFailures(): boolean {
    return Array.from(this.tasks.values()).some((task) => task.status === "FAILED");
  }

  private assertNoCycles(): void {
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      inStack.add(nodeId);

      const task = this.tasks.get(nodeId);
      if (task) {
        for (const depId of task.dependencies) {
          if (!visited.has(depId)) {
            if (dfs(depId)) return true;
          } else if (inStack.has(depId)) {
            return true; // Cycle detected
          }
        }
      }

      inStack.delete(nodeId);
      return false;
    };

    for (const taskId of this.tasks.keys()) {
      if (!visited.has(taskId)) {
        if (dfs(taskId)) {
          throw new ForgeOSError("Circular dependency detected in TaskGraph.", "CYCLE_DETECTED", 400);
        }
      }
    }
  }
}
