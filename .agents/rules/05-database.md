# Database Engineering & Prisma Rules
*Standards for relational schemas, migrations, integrity, and vector database deferral.*

---

## 1. Core Technology & Schema Policy

- **Engine**: PostgreSQL 16+
- **ORM**: Prisma (`packages/database`)
- **Strict Prohibition**: **Do NOT introduce a separate vector database (e.g. Pinecone, Qdrant, Chroma) in v0.1.**
- **pgvector Deferral Policy**: Use standard relational queries initially. `pgvector` will only be introduced when semantic embedding search becomes necessary (Phase 9+).

---

## 2. Core Relational Entities (Specification Section 17)

Every table must have UUID primary keys, created/updated timestamps, and explicit foreign key constraints with indexes:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String    @id @default(uuid())
  email     String    @unique
  name      String?
  projects  Project[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Project {
  id          String            @id @default(uuid())
  userId      String
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  requirement String
  status      String            @default("ACTIVE")
  tasks       AgentTask[]
  artifacts   Artifact[]
  events      DomainEventRecord[]
  reviews     ReviewRecord[]
  decisions   ProjectDecision[]
  budget      ProjectBudget?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([userId])
}

model Agent {
  id           String      @id
  role         String
  capabilities String[]
  inputSchema  Json
  outputSchema Json
  tools        String[]
  tasks        AgentTask[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

model AgentTask {
  id             String           @id @default(uuid())
  projectId      String
  project        Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  agentId        String
  agent          Agent            @relation(fields: [agentId], references: [id])
  input          Json
  expectedOutput Json?
  status         String           @default("PENDING")
  dependencies   TaskDependency[] @relation("DependentTasks")
  dependents     TaskDependency[] @relation("PrerequisiteTasks")
  runs           AgentRun[]
  artifacts      Artifact[]
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@index([projectId])
  @@index([agentId])
  @@index([status])
}

model TaskDependency {
  id             String    @id @default(uuid())
  taskId         String
  task           AgentTask @relation("DependentTasks", fields: [taskId], references: [id], onDelete: Cascade)
  prerequisiteId String
  prerequisite   AgentTask @relation("PrerequisiteTasks", fields: [prerequisiteId], references: [id], onDelete: Cascade)

  @@unique([taskId, prerequisiteId])
  @@index([taskId])
  @@index([prerequisiteId])
}

model Artifact {
  id        String    @id @default(uuid())
  projectId String
  project   Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  taskId    String?
  task      AgentTask? @relation(fields: [taskId], references: [id], onDelete: SetNull)
  type      String
  version   Int       @default(1)
  createdBy String
  content   Json
  status    String    @default("draft") // draft | approved | rejected
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([projectId, type])
  @@index([taskId])
}

model AgentRun {
  id           String    @id @default(uuid())
  taskId       String
  task         AgentTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
  provider     String
  model        String
  startedAt    DateTime  @default(now())
  completedAt  DateTime?
  inputTokens  Int?
  outputTokens Int?
  latencyMs    Int?
  status       String    @default("running") // running | success | failed
  error        String?
  rawOutput    String?

  @@index([taskId])
  @@index([status])
}

model DomainEventRecord {
  id        String   @id @default(uuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  type      String
  taskId    String?
  timestamp DateTime @default(now())
  payload   Json

  @@index([projectId, timestamp])
  @@index([type])
}

model ReviewRecord {
  id             String   @id @default(uuid())
  projectId      String
  project        Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  artifactId     String
  reviewerRole   String
  status         String   // pass | fail
  severity       String?  // blocker | critical | high | medium | low | info
  issues         Json     // structured issues array
  recommendation String?
  createdAt      DateTime @default(now())

  @@index([projectId])
  @@index([artifactId])
}

model ProjectDecision {
  id          String   @id @default(uuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title       String
  context     String
  decision    String
  status      String   @default("ACCEPTED")
  tradeoffs   Json?
  createdAt   DateTime @default(now())

  @@index([projectId])
}

model ProjectBudget {
  id                 String   @id @default(uuid())
  projectId          String   @unique
  project            Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  maxTokens          Int      @default(500000)
  maxCost            Decimal  @default(10.00) @db.Decimal(10, 2)
  maxRuntimeMinutes  Int      @default(60)
  maxRetries         Int      @default(3)
  maxConcurrentAgents Int     @default(4)
  usedTokens         Int      @default(0)
  usedCost           Decimal  @default(0.00) @db.Decimal(10, 2)
  updatedAt          DateTime @updatedAt
}
```

---

## 3. Migration Safety Rules

1. **Zero Manual DB Mutations**: All database changes must be executed via Prisma migration files (`prisma migrate dev` in development, `prisma migrate deploy` in production).
2. **Backward Compatibility**: Migrations must be backwards-compatible to prevent downtime during multi-worker deployments.
3. **Transaction Boundaries**: Complex multi-table writes (such as completing an AgentTask, persisting an Artifact, and emitting an Event) must be wrapped inside `prisma.$transaction`.
