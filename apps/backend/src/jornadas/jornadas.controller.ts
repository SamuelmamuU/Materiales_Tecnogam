import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JornadasService } from './jornadas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { ProjectGuard } from '../auth/guards/project.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  IniciarJornadaDto,
  CambiarEstadoJornadaDto,
  FinalizarJornadaDto,
} from './dto/jornada.dto';

@ApiTags('Control de Jornada y Tiempos Muertos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard, RolesGuard)
@Controller('projects/:projectId/jornadas')
export class JornadasController {
  constructor(private readonly service: JornadasService) {}

  @Get('hoy')
  @Roles('supervisor', 'administrador', 'trabajador')
  @ApiOperation({
    summary: 'Consultar la jornada activa del día de hoy',
    description:
      'Retorna el estado de la jornada, horas trabajadas y horas de tiempo muerto calculadas en vivo.',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto activo' })
  @ApiResponse({
    status: 200,
    description: 'Jornada activa del día o null si no ha iniciado',
  })
  async getJornadaHoy(
    @Param('projectId') projectId: string,
    @Request() req: RequestWithUser,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.service.getJornadaHoy(projectId, req.user.sub);
  }

  @Post('iniciar')
  @Roles('supervisor', 'administrador', 'trabajador')
  @ApiOperation({
    summary: 'Iniciar jornada de trabajo diaria',
    description:
      'Registra la hora de entrada y arranca el conteo de tiempo trabajado (TRABAJANDO). Si estaba en pausa, reanuda labores.',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto activo' })
  @ApiBody({ type: IniciarJornadaDto, required: false })
  @ApiResponse({ status: 201, description: 'Jornada iniciada con éxito' })
  async iniciarJornada(
    @Param('projectId') projectId: string,
    @Request() req: RequestWithUser,
    @Body() dto: IniciarJornadaDto,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.service.iniciarJornada(projectId, req.user.sub, dto);
  }

  @Post('cambiar-estado')
  @Roles('supervisor', 'administrador', 'trabajador')
  @ApiOperation({
    summary: 'Conmutar estado operativo (Trabajando, Tiempo Muerto, Comida)',
    description:
      'Permite pausar el reloj de trabajo e iniciar el conteo de tiempo muerto, activar la pausa de comida o reanudar el trabajo.',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto activo' })
  @ApiBody({ type: CambiarEstadoJornadaDto })
  @ApiResponse({
    status: 200,
    description: 'Estado conmutado y deltas acumulados',
  })
  async cambiarEstado(
    @Param('projectId') projectId: string,
    @Request() req: RequestWithUser,
    @Body() dto: CambiarEstadoJornadaDto,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.service.cambiarEstado(projectId, req.user.sub, dto);
  }

  @Post('finalizar')
  @Roles('supervisor', 'administrador', 'trabajador')
  @ApiOperation({
    summary: 'Finalizar jornada laboral del día',
    description:
      'Cierra definitivamente la jornada diaria, detiene todos los relojes y consolida los tiempos muertos.',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto activo' })
  @ApiBody({ type: FinalizarJornadaDto, required: false })
  @ApiResponse({ status: 200, description: 'Jornada finalizada exitosamente' })
  async finalizarJornada(
    @Param('projectId') projectId: string,
    @Request() req: RequestWithUser,
    @Body() dto: FinalizarJornadaDto,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.service.finalizarJornada(projectId, req.user.sub, dto);
  }

  @Get()
  @Roles('supervisor', 'administrador')
  @ApiOperation({
    summary: 'Consultar historial de jornadas del proyecto',
    description:
      'Obtiene el registro histórico de jornadas, tiempos trabajados y tiempos muertos para auditoría.',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto activo' })
  @ApiResponse({ status: 200, description: 'Lista de jornadas del proyecto' })
  async getHistorialJornadas(@Param('projectId') projectId: string) {
    return this.service.getHistorialJornadas(projectId);
  }
}
