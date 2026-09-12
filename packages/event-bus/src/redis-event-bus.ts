import { Redis, RedisOptions } from "ioredis";
import { DomainEvent } from "@forgeos/contracts";
import { EventBus, EventHandler, UnsubscribeFn } from "./event-bus.interface.js";

export interface RedisEventBusOptions {
  redisUrl?: string;
  redisOptions?: RedisOptions;
  prefix?: string;
}

export class RedisEventBus implements EventBus {
  private publisher: Redis;
  private subscriber: Redis;
  private prefix: string;
  private handlers = new Map<string, Set<EventHandler>>();

  constructor(options?: RedisEventBusOptions) {
    const url = options?.redisUrl ?? process.env["REDIS_URL"] ?? "redis://localhost:6379";
    this.prefix = options?.prefix ?? "forgeos:events";

    const baseOpts: RedisOptions = {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
      ...(options?.redisOptions ?? {}),
    };

    this.publisher = new Redis(url, baseOpts);
    this.subscriber = new Redis(url, baseOpts);

    this.initSubscriber();
  }

  private initSubscriber(): void {
    this.subscriber.on("message", (channel: string, message: string) => {
      this.dispatch(channel, message);
    });

    this.subscriber.on("pmessage", (_pattern: string, channel: string, message: string) => {
      this.dispatch(channel, message);
    });
  }

  private dispatch(channel: string, message: string): void {
    try {
      const event = JSON.parse(message) as DomainEvent;
      // Strip prefix to match subscription pattern
      const relativeChannel = channel.startsWith(`${this.prefix}:`)
        ? channel.slice(this.prefix.length + 1)
        : channel;

      for (const [pattern, handlerSet] of this.handlers.entries()) {
        if (this.matchesPattern(pattern, relativeChannel)) {
          for (const handler of handlerSet) {
            try {
              void handler(event);
            } catch (err) {
              console.error(`[RedisEventBus] Error in event handler for channel ${channel}:`, err);
            }
          }
        }
      }
    } catch (err) {
      console.error(`[RedisEventBus] Failed to parse message from channel ${channel}:`, err);
    }
  }

  private matchesPattern(pattern: string, channel: string): boolean {
    if (pattern === "*" || pattern === channel) return true;
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      return channel.startsWith(prefix);
    }
    return false;
  }

  public async publish(event: DomainEvent): Promise<void> {
    const serialized = JSON.stringify(event);
    const typeChannel = `${this.prefix}:type:${event.type}`;
    const projectChannel = `${this.prefix}:project:${event.projectId}`;

    await Promise.all([
      this.publisher.publish(typeChannel, serialized),
      this.publisher.publish(projectChannel, serialized),
    ]);
  }

  public async subscribe(
    pattern: string,
    handler: EventHandler
  ): Promise<UnsubscribeFn> {
    let handlerSet = this.handlers.get(pattern);
    if (!handlerSet) {
      handlerSet = new Set();
      this.handlers.set(pattern, handlerSet);

      const redisChannel = `${this.prefix}:${pattern}`;
      if (pattern.includes("*")) {
        await this.subscriber.psubscribe(redisChannel);
      } else {
        await this.subscriber.subscribe(redisChannel);
      }
    }

    handlerSet.add(handler);

    return async () => {
      const set = this.handlers.get(pattern);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          this.handlers.delete(pattern);
          const redisChannel = `${this.prefix}:${pattern}`;
          if (pattern.includes("*")) {
            await this.subscriber.punsubscribe(redisChannel);
          } else {
            await this.subscriber.unsubscribe(redisChannel);
          }
        }
      }
    };
  }

  public async close(): Promise<void> {
    this.handlers.clear();
    await Promise.allSettled([
      this.publisher.quit(),
      this.subscriber.quit(),
    ]);
  }
}
