import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard, RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../auth/guards/project.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Proyectos')
@Controller('projects')
@UseGuards(JwtAuthGuard)
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
}
