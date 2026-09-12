import { EventEmitter } from "node:events";
import { DomainEvent } from "@forgeos/contracts";
import { EventBus, EventHandler, UnsubscribeFn } from "./event-bus.interface.js";

export class InMemoryEventBus implements EventBus {
  private emitter = new EventEmitter();

  public async publish(event: DomainEvent): Promise<void> {
    // Emit exact type
    this.emitter.emit(event.type, event);
    // Emit project-specific channel
    this.emitter.emit(`project:${event.projectId}`, event);
    // Emit wildcard all
    this.emitter.emit("*", event);
  }

  public async subscribe(
    pattern: string,
    handler: EventHandler
  ): Promise<UnsubscribeFn> {
    const wrapped = (event: DomainEvent) => {
      void handler(event);
    };

    this.emitter.on(pattern, wrapped);

    return async () => {
      this.emitter.off(pattern, wrapped);
    };
  }

  public async close(): Promise<void> {
    this.emitter.removeAllListeners();
  }
}
