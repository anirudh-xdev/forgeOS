import { PrismaClient } from "@prisma/client";
import { Artifact, ArtifactStatus } from "@forgeos/contracts";
import { getPrismaClient } from "../client.js";

export class ArtifactRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? getPrismaClient();
  }

  public async saveArtifact(artifact: Artifact): Promise<Artifact> {
    const record = await this.prisma.artifact.upsert({
      where: { id: artifact.id },
      create: {
        id: artifact.id,
        projectId: artifact.projectId,
        taskId: artifact.taskId,
        type: artifact.type,
        version: artifact.version,
        createdBy: artifact.createdBy,
        content: artifact.content as any,
        status: artifact.status,
      },
      update: {
        content: artifact.content as any,
        status: artifact.status,
        version: artifact.version,
        updatedAt: new Date(),
      },
    });

    return {
      id: record.id,
      projectId: record.projectId,
      taskId: record.taskId ?? undefined,
      type: record.type as any,
      version: record.version,
      createdBy: record.createdBy,
      content: record.content,
      status: record.status as ArtifactStatus,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  public async getArtifact(id: string): Promise<Artifact | null> {
    const record = await this.prisma.artifact.findUnique({
      where: { id },
    });

    if (!record) return null;

    return {
      id: record.id,
      projectId: record.projectId,
      taskId: record.taskId ?? undefined,
      type: record.type as any,
      version: record.version,
      createdBy: record.createdBy,
      content: record.content,
      status: record.status as ArtifactStatus,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  public async listProjectArtifacts(projectId: string): Promise<Artifact[]> {
    const records = await this.prisma.artifact.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });

    return records.map((record) => ({
      id: record.id,
      projectId: record.projectId,
      taskId: record.taskId ?? undefined,
      type: record.type as any,
      version: record.version,
      createdBy: record.createdBy,
      content: record.content,
      status: record.status as ArtifactStatus,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    }));
  }

  public async updateArtifactStatus(
    id: string,
    status: ArtifactStatus
  ): Promise<Artifact> {
    const record = await this.prisma.artifact.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });

    return {
      id: record.id,
      projectId: record.projectId,
      taskId: record.taskId ?? undefined,
      type: record.type as any,
      version: record.version,
      createdBy: record.createdBy,
      content: record.content,
      status: record.status as ArtifactStatus,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
