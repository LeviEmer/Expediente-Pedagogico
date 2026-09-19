import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

// Gestión de sucursales — exclusivo del ADMIN (dueño de la app). Ver
// common/branch-access.ts para cómo se usa branchId en el resto del sistema.
@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.branch.findMany({ orderBy: { name: "asc" } });
  }

  create(dto: CreateBranchDto) {
    return this.prisma.branch.create({ data: { name: dto.name } });
  }

  async update(id: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException("Sucursal no encontrada");
    return this.prisma.branch.update({ where: { id }, data: dto });
  }
}
