export class ResourceService {
  public async findAll() {
    return { success: true, method: "findAll" };
  }

  public async findById() {
    return { success: true, method: "findById" };
  }

  public async create() {
    return { success: true, method: "create" };
  }
}
