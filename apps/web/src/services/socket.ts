import { io, Socket } from "socket.io-client";
import { DomainEvent } from "../types.js";

class SocketService {
  private socket: Socket | null = null;
  private currentProjectId: string | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  public connect(url: string = window.location.origin): Socket {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(url, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("[Socket.IO] Connected with ID:", this.socket?.id);
      if (this.currentProjectId) {
        this.socket?.emit("join_project", this.currentProjectId);
      }
      this.notify("connection_change", true);
    });

    this.socket.on("disconnect", () => {
      console.log("[Socket.IO] Disconnected");
      this.notify("connection_change", false);
    });

    this.socket.on("domain_event", (event: DomainEvent) => {
      this.notify("domain_event", event);
    });

    this.socket.on("task_status_changed", (data: any) => {
      this.notify("task_status_changed", data);
    });

    this.socket.on("retry_requested", (event: DomainEvent) => {
      this.notify("retry_requested", event);
    });

    this.socket.on("loop_detected", (event: DomainEvent) => {
      this.notify("loop_detected", event);
    });

    return this.socket;
  }

  public subscribeToProject(projectId: string): void {
    if (this.currentProjectId && this.currentProjectId !== projectId) {
      this.socket?.emit("leave_project", this.currentProjectId);
    }
    this.currentProjectId = projectId;
    this.socket?.emit("join_project", projectId);
  }

  public on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private notify(event: string, data: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in socket listener for ${event}:`, err);
        }
      }
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
