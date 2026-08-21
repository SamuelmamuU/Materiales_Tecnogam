import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { AvancesService } from './avances.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../auth/guards/project.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AvanceItemTipo, AvanceItemSubtipo } from '@prisma/client';

class AvanceItemDto {
  @ApiProperty({ enum: AvanceItemTipo, example: 'planeado' })
  tipo!: AvanceItemTipo;

  @ApiProperty({ enum: AvanceItemSubtipo, required: false, example: 'extra' })
  subtipo?: AvanceItemSubtipo;

  @ApiProperty({
    required: false,
    description: 'ID del material de catálogo si es planeado',
  })
  materialId?: string;

  @ApiProperty({
    required: false,
    description: 'Descripción de texto libre si es no planeado',
  })
  materialManual?: string;

  @ApiProperty({ example: 15, description: 'Cantidad reportada' })
  cantidad!: number;
}

class CreateAvanceDto {
  @ApiProperty({
    example: 'a8e932b1-6a2c-47ea-aef1-ff18e8749a2a',
    description: 'UUID autogenerado por el móvil',
  })
  id!: string;

  @ApiProperty({
    example: 'e5911ce8-c7ff-44f6-9f6a-48472f25e77f',
    description: 'ID del proyecto',
  })
  proyectoId!: string;

  @ApiProperty({
    example: '2026-08-06T00:00:00Z',
    description: 'Fecha de captura',
  })
  fecha!: string;

  @ApiProperty({
    example: 'Frente Norte - Nivel 3',
    description: 'Frente de trabajo',
  })
  frente!: string;

  @ApiProperty({
    required: false,
    example: 19.4326,
    description: 'Latitud GPS',
  })
  latitud?: number;

  @ApiProperty({
    required: false,
    example: -99.1332,
    description: 'Longitud GPS',
  })
  longitud?: number;

  @ApiProperty({
    required: false,
    example: 'http://localhost:9000/evidencias/img.jpg',
    description: 'URL de evidencia',
  })
  evidenciaUrl?: string;

  @ApiProperty({ type: [AvanceItemDto] })
  items!: AvanceItemDto[];
}

class CreateTiempoMuertoDto {
  @ApiProperty({
    example: 'b9e932b1-6a2c-47ea-aef1-ff18e8749a2a',
    description: 'UUID autogenerado por el móvil',
  })
  id!: string;

  @ApiProperty({ example: 'e5911ce8-c7ff-44f6-9f6a-48472f25e77f' })
  proyectoId!: string;

  @ApiProperty({ example: 'Frente Sur' })
  frente!: string;

  @ApiProperty({
    example: 'Falta de material en sitio',
    description: 'Causa del tiempo muerto',
  })
  causa!: string;

  @ApiProperty({ example: 2.5, description: 'Duración en horas' })
  duracion!: number;

  @ApiProperty({ example: '2026-08-06T00:00:00Z' })
  fecha!: string;
}

class CreateIncidenteDto {
  @ApiProperty({
    example: 'c9e932b1-6a2c-47ea-aef1-ff18e8749a2a',
    description: 'UUID autogenerado',
  })
  id!: string;

  @ApiProperty({ example: 'e5911ce8-c7ff-44f6-9f6a-48472f25e77f' })
  proyectoId!: string;

  @ApiProperty({
    example: 'Seguridad',
    description: 'Categoría (Seguridad, Calidad, Clima, etc.)',
  })
  categoria!: string;

  @ApiProperty({ example: 'Caída de herramienta sin lesionados' })
  descripcion!: string;

  @ApiProperty({ example: '2026-08-06T00:00:00Z' })
  fecha!: string;

  @ApiProperty({ required: false, example: 19.4326 })
  latitud?: number;

  @ApiProperty({ required: false, example: -99.1332 })
  longitud?: number;

  @ApiProperty({
    required: false,
    example: 'http://localhost:9000/evidencias/inc.jpg',
  })
  evidenciaUrl?: string;
}

@ApiTags('Avances de Campo')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AvancesController {
  constructor(private readonly avancesService: AvancesService) {}

  @Post('avances')
  @Roles('administrador', 'supervisor', 'trabajador')
  @ApiOperation({ summary: 'Registrar avance diario en campo (Idempotente)' })
  @ApiResponse({
    status: 201,
    description: 'Avance registrado con éxito o detectado como duplicado.',
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado (Rol de cliente no permitido).',
  })
  async createAvance(
    @Request() req: RequestWithUser,
    @Body() dto: CreateAvanceDto,
  ) {
    const user = req.user!;
    const autorId = user.sub;
    return this.avancesService.createAvance({
      ...dto,
      autorId,
    });
  }

  @Post('tiempos-muertos')
  @Roles('administrador', 'supervisor', 'trabajador')
  @ApiOperation({ summary: 'Registrar tiempo muerto en campo (Idempotente)' })
  @ApiResponse({ status: 201, description: 'Tiempo muerto registrado.' })
  async createTiempoMuerto(@Body() dto: CreateTiempoMuertoDto) {
    return this.avancesService.createTiempoMuerto(dto);
  }

  @Post('incidentes')
  @Roles('administrador', 'supervisor', 'trabajador')
  @ApiOperation({ summary: 'Registrar incidente en campo (Idempotente)' })
  @ApiResponse({ status: 201, description: 'Incidente registrado.' })
  async createIncidente(@Body() dto: CreateIncidenteDto) {
    return this.avancesService.createIncidente(dto);
  }

  @Get('projects/:projectId/avances')
  @UseGuards(ProjectGuard)
  @ApiOperation({
    summary:
      'Consultar el historial de avances de un proyecto específico (Valida Scoping)',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto' })
  @ApiQuery({ name: 'tipo', required: false, enum: AvanceItemTipo })
  @ApiQuery({ name: 'subtipo', required: false, enum: AvanceItemSubtipo })
  @ApiQuery({
    name: 'fechaInicio',
    required: false,
    description: 'Formato YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'fechaFin',
    required: false,
    description: 'Formato YYYY-MM-DD',
  })
  async getProjectAvances(
    @Param('projectId') projectId: string,
    @Query('tipo') tipo?: AvanceItemTipo,
    @Query('subtipo') subtipo?: AvanceItemSubtipo,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.avancesService.findAllForProject(projectId, {
      tipo,
      subtipo,
      fechaInicio,
      fechaFin,
    });
  }

  @Get('projects/:projectId/avances/timeline')
  @UseGuards(ProjectGuard)
  @ApiOperation({
    summary:
      'Obtener la línea de tiempo agregada de avances vs planeado (S-Curve)',
  })
  async getProgressTimeline(@Param('projectId') projectId: string) {
    return this.avancesService.getProgressTimeline(projectId);
  }
}
