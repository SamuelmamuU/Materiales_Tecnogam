import { Controller, Get, Post, Query } from '@nestjs/common';
import { MaterialsService } from './materials.service';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
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
  async syncMaterials() {
    return this.materialsService.syncWithExternal();
  }

  // Endpoint mock que simula el sistema externo de la empresa para pruebas locales y CI/CD
  @Get('external-mock')
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
          // Contiene caracteres corruptos para probar la limpieza de strings
          modelo: 'AT-0450',
          descripcion: 'Aislamiento trmico 2" (Mock)',
          unidad: 'm2',
          tipo: 'ACCESORIOS Y CONSUMIBLES',
          activo: true,
        },
        {
          // Registro duplicado de DG-1200 para probar la omisión de duplicados
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
