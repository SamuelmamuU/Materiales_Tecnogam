import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  Put,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard, RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../auth/guards/project.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

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
}
