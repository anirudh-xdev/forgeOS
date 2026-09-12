import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from "prom-client";

export class MetricsRegistry {
  private registry: Registry;
  public agentRunsTotal: Counter<string>;
  public agentRunDurationSeconds: Histogram<string>;
  public tokensTotal: Counter<string>;
  public costUsdTotal: Counter<string>;
  public tasksTotal: Counter<string>;
  public activeTasks: Gauge<string>;
  public circuitBreakerTripsTotal: Counter<string>;
  public budgetUtilizationRatio: Gauge<string>;

  constructor(registerDefaultMetrics: boolean = true) {
    this.registry = new Registry();
    if (registerDefaultMetrics) {
      collectDefaultMetrics({ register: this.registry, prefix: "forgeos_process_" });
    }

    this.agentRunsTotal = new Counter({
      name: "forgeos_agent_runs_total",
      help: "Total number of agent executions",
      labelNames: ["agent", "provider", "model", "status"],
      registers: [this.registry],
    });

    this.agentRunDurationSeconds = new Histogram({
      name: "forgeos_agent_run_duration_seconds",
      help: "Duration of agent execution in seconds",
      labelNames: ["agent", "model"],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
      registers: [this.registry],
    });

    this.tokensTotal = new Counter({
      name: "forgeos_tokens_total",
      help: "Total token usage across prompts and completions",
      labelNames: ["type", "agent", "model"],
      registers: [this.registry],
    });

    this.costUsdTotal = new Counter({
      name: "forgeos_cost_usd_total",
      help: "Estimated monetary cost in USD for model executions",
      labelNames: ["agent", "model"],
      registers: [this.registry],
    });

    this.tasksTotal = new Counter({
      name: "forgeos_tasks_total",
      help: "Total tasks processed by outcome status",
      labelNames: ["status"],
      registers: [this.registry],
    });

    this.activeTasks = new Gauge({
      name: "forgeos_active_tasks",
      help: "Number of tasks currently in active running state",
      labelNames: ["agent"],
      registers: [this.registry],
    });

    this.circuitBreakerTripsTotal = new Counter({
      name: "forgeos_circuit_breaker_trips_total",
      help: "Total times circuit breaker halted loops or retries",
      labelNames: ["agent", "loop_type"],
      registers: [this.registry],
    });

    this.budgetUtilizationRatio = new Gauge({
      name: "forgeos_budget_utilization_ratio",
      help: "Current ratio of budget utilized (0.0 to 1.0+)",
      labelNames: ["project_id", "resource"],
      registers: [this.registry],
    });
  }

  public recordAgentRun(params: {
    agent: string;
    provider: string;
    model: string;
    status: "success" | "failed";
    durationMs: number;
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
  }) {
    this.agentRunsTotal.inc({
      agent: params.agent,
      provider: params.provider,
      model: params.model,
      status: params.status,
    });

    this.agentRunDurationSeconds.observe(
      { agent: params.agent, model: params.model },
      params.durationMs / 1000
    );

    if (params.inputTokens > 0) {
      this.tokensTotal.inc(
        { type: "input", agent: params.agent, model: params.model },
        params.inputTokens
      );
    }

    if (params.outputTokens > 0) {
      this.tokensTotal.inc(
        { type: "output", agent: params.agent, model: params.model },
        params.outputTokens
      );
    }

    if (params.costUSD > 0) {
      this.costUsdTotal.inc(
        { agent: params.agent, model: params.model },
        params.costUSD
      );
    }
  }

  public recordCircuitBreakerTrip(agent: string, loopType: string) {
    this.circuitBreakerTripsTotal.inc({ agent, loop_type: loopType });
  }

  public setBudgetUtilization(projectId: string, tokenRatio: number, costRatio: number) {
    this.budgetUtilizationRatio.set({ project_id: projectId, resource: "tokens" }, tokenRatio);
    this.budgetUtilizationRatio.set({ project_id: projectId, resource: "cost" }, costRatio);
  }

  public incrementActiveTasks(agent: string) {
    this.activeTasks.inc({ agent });
  }

  public decrementActiveTasks(agent: string) {
    this.activeTasks.dec({ agent });
  }

  public async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  public getContentType(): string {
    return this.registry.contentType;
  }

  public getRegistry(): Registry {
    return this.registry;
  }
}

export const defaultMetricsRegistry = new MetricsRegistry();
