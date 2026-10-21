import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Response,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AvancesEspecializadosService } from './avances-especializados.service';
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
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import type { Response as ExpressResponse } from 'express';
import { Rol } from '@prisma/client';

@ApiTags('Avances Especializados')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('projects/:projectId/avances-especializados')
export class AvancesEspecializadosController {
  constructor(private readonly service: AvancesEspecializadosService) {}

  @Get(':modulo')
  @ApiOperation({
    summary:
      'Consultar filas de avance especializado (Instrumentación, Válvulas, Motor)',
    description:
      'Retorna filas de la especialidad. Si el usuario es Administrador, incluye celdasAudit con autor y timestamp por celda. Si es Supervisor o Trabajador, la auditoría se remueve por completo.',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto' })
  @ApiParam({
    name: 'modulo',
    description: 'Especialidad: instrumentacion | valvulas | motor',
  })
  async getRows(
    @Param('projectId') projectId: string,
    @Param('modulo') modulo: string,
    @Request() req: RequestWithUser,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.service.getRows(projectId, modulo, {
      id: req.user.sub,
      rol: req.user.rol as Rol,
    });
  }

  @Post(':modulo/rows')
  @Roles('administrador')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary:
      'Crear un nuevo registro técnico en la tabla (Exclusivo Administrador)',
    description:
      'Permite al Administrador registrar una nueva fila técnica (columnas negras) en la especialidad seleccionada.',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto' })
  @ApiParam({
    name: 'modulo',
    description: 'instrumentacion | valvulas | motor',
  })
  async createRow(
    @Param('projectId') projectId: string,
    @Param('modulo') modulo: string,
    @Body() data: Record<string, any>,
    @Request() req: RequestWithUser,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.service.createRow(projectId, modulo, data, {
      id: req.user.sub,
      rol: req.user.rol as Rol,
    });
  }

  @Post(':modulo/import-csv')
  @Roles('administrador')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary:
      'Importar masivamente registros técnicos vía archivo CSV (Exclusivo Administrador)',
    description:
      'Recibe el contenido en texto de un archivo CSV y crea los registros técnicos para la especialidad.',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto' })
  @ApiParam({
    name: 'modulo',
    description: 'instrumentacion | valvulas | motor',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        csv: { type: 'string', description: 'Contenido raw del archivo CSV' },
      },
      required: ['csv'],
    },
  })
  async importCsv(
    @Param('projectId') projectId: string,
    @Param('modulo') modulo: string,
    @Body() body: { csv: string },
    @Request() req: RequestWithUser,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.service.importFromCsv(projectId, modulo, body.csv, {
      id: req.user.sub,
      rol: req.user.rol as Rol,
    });
  }

  @Get(':modulo/template-csv')
  @ApiOperation({
    summary: 'Descargar plantilla oficial CSV para la especialidad',
    description:
      'Retorna un archivo CSV delimitado por comas con los nombres exactos de columnas requeridas.',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto' })
  @ApiParam({
    name: 'modulo',
    description: 'instrumentacion | valvulas | motor',
  })
  downloadTemplateCsv(
    @Param('modulo') modulo: string,
    @Response() res: ExpressResponse,
  ) {
    const { filename, content } = this.service.generateCsvTemplate(modulo);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return res.status(HttpStatus.OK).send(content);
  }

  @Post(':modulo/load-sample')
  @Roles('administrador')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary:
      'Cargar datos de ejemplo desde docs/Tabla de Avances.xlsx (Exclusivo Administrador)',
    description:
      'Siembra las especificaciones técnicas completas del Excel de prueba para la especialidad en este proyecto.',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto' })
  @ApiParam({
    name: 'modulo',
    description: 'instrumentacion | valvulas | motor',
  })
  async loadSample(
    @Param('projectId') projectId: string,
    @Param('modulo') modulo: string,
    @Request() req: RequestWithUser,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.service.loadSampleSeed(projectId, modulo, {
      id: req.user.sub,
      rol: req.user.rol as Rol,
    });
  }

  @Put(':modulo/rows/:rowId')
  @ApiOperation({
    summary: 'Actualizar celda(s) de una fila de avance',
    description:
      'Supervisores solo pueden actualizar columnas de avance (naranjas). Administradores pueden actualizar cualquier columna. Registra auditoría celda por celda.',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto' })
  @ApiParam({
    name: 'modulo',
    description: 'instrumentacion | valvulas | motor',
  })
  @ApiParam({ name: 'rowId', description: 'UUID de la fila' })
  async updateRow(
    @Param('projectId') projectId: string,
    @Param('modulo') modulo: string,
    @Param('rowId') rowId: string,
    @Body() updates: Record<string, any>,
    @Request() req: RequestWithUser,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.service.updateRow(projectId, modulo, rowId, updates, {
      id: req.user.sub,
      rol: req.user.rol as Rol,
    });
  }

  @Put(':modulo/batch')
  @ApiOperation({
    summary: 'Actualización por lote de avances especializados',
    description: 'Guarda múltiples filas modificadas en una sola llamada.',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto' })
  @ApiParam({
    name: 'modulo',
    description: 'instrumentacion | valvulas | motor',
  })
  async batchUpdate(
    @Param('projectId') projectId: string,
    @Param('modulo') modulo: string,
    @Body()
    body: { rows: Array<{ rowId: string; updates: Record<string, any> }> },
    @Request() req: RequestWithUser,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.service.batchUpdate(projectId, modulo, body.rows || [], {
      id: req.user.sub,
      rol: req.user.rol as Rol,
    });
  }

  @Get(':modulo/export')
  @ApiOperation({
    summary: 'Exportar a Excel (.xlsx) con estilos corporativos',
    description:
      'Descarga archivo Excel con encabezados negros (Admin) y naranjas (Supervisor). Administradores ven columnas de auditoría; supervisores no.',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto' })
  @ApiParam({
    name: 'modulo',
    description: 'instrumentacion | valvulas | motor',
  })
  async exportExcel(
    @Param('projectId') projectId: string,
    @Param('modulo') modulo: string,
    @Request() req: RequestWithUser,
    @Response() res: ExpressResponse,
  ) {
    if (!req.user) throw new UnauthorizedException();
    const buffer = await this.service.exportToExcel(projectId, modulo, {
      id: req.user.sub,
      rol: req.user.rol as Rol,
    });

    const filename = `Avance_${modulo.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    return res.status(HttpStatus.OK).send(buffer);
  }
}
