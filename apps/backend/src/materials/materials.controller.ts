import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Materiales')
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener catálogo de materiales paginado y filtrado',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Búsqueda por código o descripción',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filtrar por categoría',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    description: 'Filtrar por estado activo (true/false)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad de registros por página (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna lista de materiales y metadata.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado (JWT inválido o ausente).',
  })
  async getMaterials(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('active') active?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.materialsService.findAll({
      search,
      category,
      active,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrador', 'supervisor')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Sincronizar catálogo con el sistema de la empresa (Solo Admin/Supervisor)',
  })
  @ApiResponse({
    status: 200,
    description: 'Sincronización finalizada con éxito.',
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Prohibido. Rol insuficiente.' })
  async syncMaterials() {
    return this.materialsService.syncWithExternal();
  }

  @Get('external-mock')
  @ApiOperation({
    summary:
      'Mock público que simula el sistema externo de inventario de la empresa (Para testing)',
  })
  @ApiResponse({ status: 200, description: 'Retorna catálogo simulado.' })
  getExternalMock() {
    return {
      total: 3,
      data: [
        {
          modelo: 'DG-1200',
          descripcion: 'Ducto galvanizado 12" (Mock)',
          unidad: 'ml',
          tipo: 'CHAROLAS Y ACCESORIOS',
          activo: true,
        },
        {
          modelo: 'AT-0450',
          descripcion: 'Aislamiento trmico 2" (Mock)',
          unidad: 'm2',
          tipo: 'ACCESORIOS Y CONSUMIBLES',
          activo: true,
        },
        {
          modelo: 'DG-1200',
          descripcion: 'Ducto galvanizado 12" (Mock Duplicado)',
          unidad: 'ml',
          tipo: 'CHAROLAS Y ACCESORIOS',
          activo: true,
        },
      ],
    };
  }
}
