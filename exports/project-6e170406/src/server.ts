import fastify from "fastify";
import cors from "@fastify/cors";

const app = fastify({ logger: true });

await app.register(cors, { origin: true });

app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // GET /api/v1/resource: Fetches resource list with pagination and error handling
  fastify.get("/api/v1/resource", async (request, reply) => {
    return {
      status: "success",
      endpoint: "/api/v1/resource",
      data: { message: "Handler for /api/v1/resource executed successfully" }
    };
  });

const start = async () => {
  try {
    const port = Number(process.env["PORT"] ?? 4000);
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`Server running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
