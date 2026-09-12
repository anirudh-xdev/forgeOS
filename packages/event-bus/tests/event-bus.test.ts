import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { DomainEvent } from "@forgeos/contracts";
import { InMemoryEventBus } from "../src/in-memory-event-bus.js";
import { RedisEventBus } from "../src/redis-event-bus.js";

describe("Event Bus Implementations", () => {
  describe("InMemoryEventBus", () => {
    it("should publish and receive events by pattern", async () => {
      const bus = new InMemoryEventBus();
      const received: DomainEvent[] = [];

      await bus.subscribe("*", (event) => {
        received.push(event);
      });

      const event: DomainEvent = {
        id: randomUUID(),
        type: "TASK_COMPLETED",
        projectId: randomUUID(),
        timestamp: new Date().toISOString(),
        payload: { test: true },
      };

      await bus.publish(event);
      expect(received).toHaveLength(1);
      expect(received[0]?.id).toBe(event.id);

      await bus.close();
    });
  });

  describe("RedisEventBus (Integration)", () => {
    let redisBus: RedisEventBus;

    afterAll(async () => {
      if (redisBus) {
        await redisBus.close();
      }
    });

    it("should publish and receive events via Redis Pub/Sub", async () => {
      redisBus = new RedisEventBus({
        redisUrl: "redis://localhost:6379",
        prefix: `test:events:${Date.now()}`,
      });

      const testProjectId = randomUUID();
      const received: DomainEvent[] = [];

      // Subscribe to project channel
      await redisBus.subscribe(`project:${testProjectId}`, (event) => {
        received.push(event);
      });

      // Small delay to ensure subscription is established in Redis
      await new Promise((resolve) => setTimeout(resolve, 100));

      const event: DomainEvent = {
        id: randomUUID(),
        type: "SPEC_APPROVED",
        projectId: testProjectId,
        timestamp: new Date().toISOString(),
        payload: { deliverable: "ProductSpecification" },
      };

      await redisBus.publish(event);

      // Wait for delivery
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(received.length).toBeGreaterThanOrEqual(1);
      expect(received[0]?.projectId).toBe(testProjectId);
      expect(received[0]?.type).toBe("SPEC_APPROVED");
    });
  });
});
