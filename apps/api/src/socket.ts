import { Server as HttpServer } from "node:http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { DomainEvent } from "@forgeos/contracts";

export class SocketGateway {
  private io: SocketIOServer;

  constructor(server: HttpServer, allowedOrigins: string[] = ["*"]) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.setupConnectionHandlers();
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  private setupConnectionHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      // Client subscribes to a specific project room
      socket.on("join_project", (projectId: string) => {
        if (projectId && typeof projectId === "string") {
          socket.join(`project:${projectId}`);
        }
      });

      // Client leaves project room
      socket.on("leave_project", (projectId: string) => {
        if (projectId && typeof projectId === "string") {
          socket.leave(`project:${projectId}`);
        }
      });

      // Client heartbeat / ping
      socket.on("ping", () => {
        socket.emit("pong", { timestamp: Date.now() });
      });
    });
  }

  /**
   * Broadcasts a domain event to all clients in the project room and globally
   */
  public broadcastDomainEvent(event: DomainEvent): void {
    if (event.projectId) {
      this.io.to(`project:${event.projectId}`).emit("domain_event", event);
    }
    // Also emit to global stream
    this.io.emit("domain_event", event);

    // Specialized high-priority events
    if (event.type === "RETRY_REQUESTED") {
      this.io.to(`project:${event.projectId}`).emit("retry_requested", event);
    } else if (event.type === "LOOP_DETECTED") {
      this.io.to(`project:${event.projectId}`).emit("loop_detected", event);
    } else if (event.type === "TASK_STARTED" || event.type === "TASK_COMPLETED" || event.type === "TASK_FAILED") {
      this.io.to(`project:${event.projectId}`).emit("task_status_changed", {
        projectId: event.projectId,
        taskId: event.taskId,
        type: event.type,
        payload: event.payload,
      });
    }
  }

  public async close(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        resolve();
      });
    });
  }
}
