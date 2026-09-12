import { DomainEvent } from "@forgeos/contracts";

export type EventHandler = (event: DomainEvent) => Promise<void> | void;
export type UnsubscribeFn = () => Promise<void>;

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(pattern: string, handler: EventHandler): Promise<UnsubscribeFn>;
  close(): Promise<void>;
}
