# Architecture Specification

## Topology & Pattern
**Pattern**: Modular Monolith / Event-Driven Services

### Core Components
- **API Gateway** (Handles ingress REST routing): Technologies: Fastify, TypeScript
- **Event Dispatcher** (Pub/Sub message router): Technologies: Redis, Socket.IO

## Database Strategy
- **Engine**: PostgreSQL 16
- **Entities**: User, Project, Artifact, Task
- **Strategy**: Normalized relational schema with foreign key indexes

## API Contracts
### `GET /api/v1/health`
- **Description**: System health and liveness check
- **Response Schema**: `HealthResponse`

### `POST /api/v1/projects`
- **Description**: Initialize a new project execution
- **Response Schema**: `CreateProjectResponse`


## Architecture Decision Records (ADRs)
### ADR: ADR-001: Relational Persistence
- **Decision**: Adopt PostgreSQL 16 with Prisma ORM
- **Alternatives Considered**: MongoDB, SQLite
- **Tradeoffs**: Strong relational integrity at the cost of strict schema migrations
