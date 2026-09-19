import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { BranchesService } from "./branches.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("branches")
export class BranchesController {
  constructor(private branchesService: BranchesService) {}

  @Get()
  @Roles("ADMIN", "GENERAL_SUPERVISOR")
  findAll() {
    return this.branchesService.findAll();
  }

  @Post()
  @Roles("ADMIN")
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Patch(":id")
  @Roles("ADMIN")
  update(@Param("id") id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }
}
