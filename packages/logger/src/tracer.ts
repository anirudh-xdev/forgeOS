import { trace, Span, SpanStatusCode, Tracer } from "@opentelemetry/api";
import { randomUUID } from "node:crypto";
import type { TraceSpanRecord } from "@forgeos/contracts";

export interface SpanOptions {
  projectId?: string;
  taskId?: string;
  agentId?: string;
  parentSpanId?: string;
  attributes?: Record<string, unknown>;
}

export class ForgeTracer {
  private tracer: Tracer;
  private spansByProject: Map<string, TraceSpanRecord[]> = new Map();
  private maxSpansPerProject = 500;

  constructor(serviceName: string = "forgeos") {
    this.tracer = trace.getTracer(serviceName, "0.1.0");
  }

  public getTracer(): Tracer {
    return this.tracer;
  }

  private generateId(length: number = 16): string {
    const chars = "0123456789abcdef";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  public async withSpan<T>(
    name: string,
    options: SpanOptions,
    fn: (span: Span) => Promise<T>
  ): Promise<T> {
    const traceId = this.generateId(32);
    const spanId = this.generateId(16);
    const startTime = new Date();
    const startMs = Date.now();

    const span = this.tracer.startSpan(name);

    if (options.attributes) {
      for (const [k, v] of Object.entries(options.attributes)) {
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          span.setAttribute(k, v);
        } else if (v !== null && v !== undefined) {
          span.setAttribute(k, JSON.stringify(v));
        }
      }
    }

    if (options.projectId) span.setAttribute("forgeos.project_id", options.projectId);
    if (options.taskId) span.setAttribute("forgeos.task_id", options.taskId);
    if (options.agentId) span.setAttribute("forgeos.agent_id", options.agentId);

    let statusCode: "OK" | "ERROR" = "OK";
    let statusMessage: string | undefined = undefined;

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      statusCode = "ERROR";
      statusMessage = err instanceof Error ? err.message : String(err);
      span.recordException(err instanceof Error ? err : new Error(statusMessage));
      span.setStatus({ code: SpanStatusCode.ERROR, message: statusMessage });
      throw err;
    } finally {
      span.end();
      const endTime = new Date();
      const durationMs = Date.now() - startMs;

      const record: TraceSpanRecord = {
        id: randomUUID(),
        traceId,
        spanId,
        parentSpanId: options.parentSpanId,
        name,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMs,
        attributes: {
          ...(options.attributes ?? {}),
          ...(options.projectId ? { "forgeos.project_id": options.projectId } : {}),
          ...(options.taskId ? { "forgeos.task_id": options.taskId } : {}),
          ...(options.agentId ? { "forgeos.agent_id": options.agentId } : {}),
        },
        status: {
          code: statusCode,
          message: statusMessage,
        },
      };

      if (options.projectId) {
        this.recordSpan(options.projectId, record);
      }
    }
  }

  public recordSpan(projectId: string, span: TraceSpanRecord): void {
    if (!this.spansByProject.has(projectId)) {
      this.spansByProject.set(projectId, []);
    }
    const list = this.spansByProject.get(projectId)!;
    list.push(span);
    if (list.length > this.maxSpansPerProject) {
      list.shift();
    }
  }

  public getSpans(projectId?: string): TraceSpanRecord[] {
    if (projectId) {
      return this.spansByProject.get(projectId) ?? [];
    }
    const all: TraceSpanRecord[] = [];
    for (const spans of this.spansByProject.values()) {
      all.push(...spans);
    }
    return all.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  public clearSpans(projectId?: string): void {
    if (projectId) {
      this.spansByProject.delete(projectId);
    } else {
      this.spansByProject.clear();
    }
  }
}

export const defaultTracer = new ForgeTracer();
