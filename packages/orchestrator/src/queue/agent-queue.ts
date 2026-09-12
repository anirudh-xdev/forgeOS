import { Queue, QueueOptions } from "bullmq";
import { Redis } from "ioredis";
import { AgentTask } from "@forgeos/contracts";

export interface AgentJobData {
  projectId: string;
  taskId: string;
  agentId: string;
  input: unknown;
  dependencies: string[];
  attempt?: number;
}

export interface AgentQueueOptions {
  redisUrl?: string;
  connection?: Redis;
}

export class AgentQueueManager {
  public readonly planningQueue: Queue<AgentJobData>;
  public readonly codingQueue: Queue<AgentJobData>;
  private connection: Redis;

  constructor(options?: AgentQueueOptions) {
    const url = options?.redisUrl ?? process.env["REDIS_URL"] ?? "redis://localhost:6379";
    this.connection = options?.connection ?? new Redis(url, { maxRetriesPerRequest: null });

    const queueOpts: QueueOptions = {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    };

    this.planningQueue = new Queue<AgentJobData>("agent-planning", queueOpts);
    this.codingQueue = new Queue<AgentJobData>("agent-coding", queueOpts);
  }

  public resolveQueueName(agentId: string): "agent-planning" | "agent-coding" {
    if (agentId.includes("pm") || agentId.includes("architect")) {
      return "agent-planning";
    }
    return "agent-coding";
  }

  public async enqueueTask(task: AgentTask): Promise<string> {
    const queueName = this.resolveQueueName(task.agentId);
    const queue = queueName === "agent-planning" ? this.planningQueue : this.codingQueue;

    // Idempotent Job ID according to spec Section 11 & RSK-04
    const jobId = `task-${task.id}-attempt-${task.retryCount ?? 0}`;

    const job = await queue.add(
      `execute-${task.agentId}`,
      {
        projectId: task.projectId,
        taskId: task.id,
        agentId: task.agentId,
        input: task.input,
        dependencies: task.dependencies,
        attempt: task.retryCount ?? 0,
      },
      {
        jobId,
      }
    );

    return job.id ?? jobId;
  }

  public async close(): Promise<void> {
    await Promise.allSettled([
      this.planningQueue.close(),
      this.codingQueue.close(),
      this.connection.quit(),
    ]);
  }
}
