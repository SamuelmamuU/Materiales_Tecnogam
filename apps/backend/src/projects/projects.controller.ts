import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../auth/guards/project.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Prisma } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiProperty,
} from '@nestjs/swagger';

class CreateProjectDto {
  @ApiProperty({ example: 'Torre Sur - Fase 1' })
  nombre!: string;

  @ApiProperty({ example: 'Grupo Vega' })
  cliente!: string;

  @ApiProperty({ example: '2026-09-01T00:00:00Z' })
  fechaInicio!: string;

  @ApiProperty({ example: '2027-03-01T00:00:00Z' })
  fechaFinEstimada!: string;
}

class UpdateProjectDto {
  @ApiProperty({ example: 'Torre Sur - Fase 1 Modificada', required: false })
  nombre?: string;

  @ApiProperty({ example: 'Grupo Vega Inc.', required: false })
  cliente?: string;

  @ApiProperty({ example: '2026-09-01T00:00:00Z', required: false })
  fechaInicio?: string;

  @ApiProperty({ example: '2027-04-01T00:00:00Z', required: false })
  fechaFinEstimada?: string;
}

class AssignMemberDto {
  @ApiProperty({ example: 'usuario-uuid-aquí' })
  usuarioId!: string;
}

class CreateHitoDto {
  @ApiProperty({ example: 'Preparación de terreno' })
  nombre!: string;

  @ApiProperty({ example: '2026-09-15T00:00:00Z' })
  fechaObjetivo!: string;

  @ApiProperty({
    enum: ['pendiente', 'completado', 'atrasado'],
    default: 'pendiente',
    required: false,
  })
  estatus?: 'pendiente' | 'completado' | 'atrasado';
}

class UpdateHitoDto {
  @ApiProperty({
    example: 'Preparación de terreno completada',
    required: false,
  })
  nombre?: string;

  @ApiProperty({ example: '2026-09-20T00:00:00Z', required: false })
  fechaObjetivo?: string;

  @ApiProperty({
    enum: ['pendiente', 'completado', 'atrasado'],
    required: false,
  })
  estatus?: 'pendiente' | 'completado' | 'atrasado';
}

class BulkMaterialItemDto {
  @ApiProperty({ example: 'VL-2210' })
  codigo!: string;

  @ApiProperty({ example: 'Válvula de compuerta 4"' })
  descripcion!: string;

  @ApiProperty({ example: 'pza' })
  unidad!: string;

  @ApiProperty({ example: 'Válvulas', required: false })
  categoria?: string;

  @ApiProperty({ example: 15 })
  cantidad!: number;
}

class AddMaterialDto {
  @ApiProperty({ example: 'material-uuid-here' })
  materialId!: string;

  @ApiProperty({ example: 25 })
  cantidad!: number;
}

@ApiTags('Proyectos')
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Obtener todos los proyectos accesibles para el usuario autenticado',
  })
  @ApiResponse({ status: 200, description: 'Retorna la lista de proyectos.' })
  async getMyProjects(@Request() req: RequestWithUser) {
    const user = req.user!;
    const userId = user.sub;
    const userRol = user.rol;
    return this.projectsService.findAllForUser(userId, userRol);
  }

  @Post()
  @Roles('administrador')
  @ApiOperation({ summary: 'Crear un nuevo proyecto (Solo Administrador)' })
  @ApiResponse({ status: 201, description: 'Proyecto creado con éxito.' })
  async createProject(@Body() dto: CreateProjectDto) {
    return this.projectsService.create({
      nombre: dto.nombre,
      cliente: dto.cliente,
      fechaInicio: new Date(dto.fechaInicio),
      fechaFinEstimada: new Date(dto.fechaFinEstimada),
    });
  }

  @Put(':projectId')
  @Roles('administrador')
  @ApiOperation({
    summary: 'Actualizar un proyecto existente (Solo Administrador)',
  })
  @ApiResponse({ status: 200, description: 'Proyecto actualizado con éxito.' })
  @ApiResponse({ status: 404, description: 'El proyecto no existe.' })
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const updateData: Partial<Prisma.ProyectoUpdateInput> = {};
    if (dto.nombre) updateData.nombre = dto.nombre;
    if (dto.cliente) updateData.cliente = dto.cliente;
    if (dto.fechaInicio) updateData.fechaInicio = new Date(dto.fechaInicio);
    if (dto.fechaFinEstimada)
      updateData.fechaFinEstimada = new Date(dto.fechaFinEstimada);
    return this.projectsService.update(projectId, updateData);
  }

  @Delete(':projectId')
  @Roles('administrador')
  @ApiOperation({ summary: 'Eliminar un proyecto (Solo Administrador)' })
  @ApiResponse({ status: 200, description: 'Proyecto eliminado.' })
  @ApiResponse({ status: 404, description: 'El proyecto no existe.' })
  async deleteProject(@Param('projectId') projectId: string) {
    return this.projectsService.remove(projectId);
  }

  @Get(':projectId')
  @UseGuards(ProjectGuard) // Enforce scoping verification!
  @ApiOperation({
    summary:
      'Obtener el detalle de un proyecto específico (Valida scoping de pertenencia)',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID del proyecto en formato UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna el detalle completo del proyecto.',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado. El usuario no pertenece al proyecto.',
  })
  @ApiResponse({ status: 404, description: 'El proyecto no existe.' })
  async getProjectDetail(@Param('projectId') projectId: string) {
    return this.projectsService.findOne(projectId);
  }

  @Get(':projectId/dashboard')
  @UseGuards(ProjectGuard) // Enforce scoping verification!
  @ApiOperation({
    summary:
      'Obtener los datos consolidados del dashboard para un proyecto específico',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID del proyecto',
  })
  @ApiResponse({
    status: 200,
    description:
      'Retorna KPIs, hitos, conciliación de materiales, incidentes y tiempos muertos.',
  })
  async getProjectDashboard(@Param('projectId') projectId: string) {
    return this.projectsService.getDashboardData(projectId);
  }

  @Put('incidentes/:incidenteId/resolver')
  @Roles('administrador', 'supervisor')
  @ApiOperation({
    summary: 'Marcar un incidente como resuelto',
  })
  @ApiParam({
    name: 'incidenteId',
    description: 'ID del incidente a resolver',
  })
  @ApiResponse({
    status: 200,
    description: 'Incidente marcado como resuelto con éxito.',
  })
  async resolveIncidente(@Param('incidenteId') incidenteId: string) {
    return this.projectsService.resolveIncidente(incidenteId);
  }

  @Post(':projectId/members')
  @Roles('administrador')
  @ApiOperation({
    summary:
      'Asignar un usuario como miembro de un proyecto (Solo Administrador)',
  })
  @ApiResponse({ status: 201, description: 'Usuario asignado con éxito.' })
  async addProjectMember(
    @Param('projectId') projectId: string,
    @Body() dto: AssignMemberDto,
  ) {
    return this.projectsService.addMember(projectId, dto.usuarioId);
  }

  @Delete(':projectId/members/:userId')
  @Roles('administrador')
  @ApiOperation({
    summary: 'Remover un usuario de un proyecto (Solo Administrador)',
  })
  @ApiResponse({ status: 200, description: 'Usuario removido del proyecto.' })
  async removeProjectMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    return this.projectsService.removeMember(projectId, userId);
  }

  @Post(':projectId/hitos')
  @Roles('administrador')
  @ApiOperation({
    summary: 'Crear un nuevo hito en el proyecto (Solo Administrador)',
  })
  @ApiResponse({ status: 201, description: 'Hito creado con éxito.' })
  async createHito(
    @Param('projectId') projectId: string,
    @Body() dto: CreateHitoDto,
  ) {
    return this.projectsService.createHito(projectId, dto);
  }

  @Put(':projectId/hitos/:hitoId')
  @Roles('administrador')
  @ApiOperation({
    summary: 'Actualizar un hito existente (Solo Administrador)',
  })
  @ApiResponse({ status: 200, description: 'Hito actualizado con éxito.' })
  async updateHito(
    @Param('hitoId') hitoId: string,
    @Body() dto: UpdateHitoDto,
  ) {
    return this.projectsService.updateHito(hitoId, dto);
  }

  @Delete(':projectId/hitos/:hitoId')
  @Roles('administrador')
  @ApiOperation({
    summary: 'Eliminar un hito del proyecto (Solo Administrador)',
  })
  @ApiResponse({ status: 200, description: 'Hito eliminado.' })
  async deleteHito(@Param('hitoId') hitoId: string) {
    return this.projectsService.removeHito(hitoId);
  }

  @Post(':projectId/materials/bulk')
  @Roles('administrador')
  @ApiOperation({
    summary: 'Importar listado de materiales en lote desde Excel/CSV (Solo Administrador)',
  })
  @ApiResponse({ status: 200, description: 'Materiales importados con éxito.' })
  async bulkImportMaterials(
    @Param('projectId') projectId: string,
    @Body() items: BulkMaterialItemDto[],
  ) {
    return this.projectsService.bulkImportMaterials(projectId, items);
  }

  @Post(':projectId/materials')
  @Roles('administrador')
  @ApiOperation({
    summary: 'Agregar un material del catálogo maestro al proyecto (Solo Administrador)',
  })
  @ApiResponse({ status: 200, description: 'Material agregado con éxito.' })
  async addMaterial(
    @Param('projectId') projectId: string,
    @Body() dto: AddMaterialDto,
  ) {
    return this.projectsService.addMaterial(projectId, dto.materialId, dto.cantidad);
  }

  @Delete(':projectId/materials/:materialId')
  @Roles('administrador')
  @ApiOperation({
    summary: 'Eliminar un material cotizado del proyecto (Solo Administrador)',
  })
  @ApiResponse({ status: 200, description: 'Material eliminado del proyecto.' })
  async removeMaterial(
    @Param('projectId') projectId: string,
    @Param('materialId') materialId: string,
  ) {
    return this.projectsService.removeMaterial(projectId, materialId);
  }
}
