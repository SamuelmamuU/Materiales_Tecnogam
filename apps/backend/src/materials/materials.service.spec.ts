/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { MaterialsService, cleanString } from './materials.service';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

describe('MaterialsService', () => {
  let service: MaterialsService;
  let prismaService: PrismaService;
  let httpService: HttpService;

  const mockPrisma = {
    material: {
      count: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockHttp = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HttpService, useValue: mockHttp },
      ],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
    prismaService = module.get<PrismaService>(PrismaService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanString (Normalización de Texto)', () => {
    it('debería corregir palabras corruptas con reemplazo unicode', () => {
      expect(cleanString('HERRAJES DE FIJACIN')).toBe('HERRAJES DE FIJACIÓN');
      expect(cleanString('trifsico')).toBe('trifásico');
      expect(cleanString('Bsico')).toBe('Básico');
      expect(cleanString('WEIDMLLER')).toBe('WEIDMÜLLER');
      expect(cleanString('seales')).toBe('señales');
      expect(cleanString('anlogas')).toBe('análogas');
    });

    it('debería eliminar caracteres de reemplazo aislados sin traducción', () => {
      // Si hay un \uFFFD suelto que no coincide con ninguna palabra del diccionario
      expect(cleanString('Texto\uFFFDConAccento')).toBe('TextoConAccento');
    });

    it('debería manejar strings vacíos de forma segura', () => {
      expect(cleanString('')).toBe('');
      expect(cleanString(null as unknown as string)).toBe('');
    });
  });

  describe('findAll (Consulta con Filtros y Paginación)', () => {
    it('debería retornar datos paginados correctamente', async () => {
      mockPrisma.material.count.mockResolvedValue(10);
      mockPrisma.material.findMany.mockResolvedValue([
        {
          id: '1',
          codigo: 'A',
          descripcion: 'Desc A',
          unidad: 'Pza',
          categoria: 'Cat',
          activo: true,
        },
      ]);

      const result = await service.findAll({ page: 2, limit: 5 });

      expect(prismaService.material.count).toHaveBeenCalled();
      expect(prismaService.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(10);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
    });

    it('debería aplicar filtros de búsqueda por texto', async () => {
      mockPrisma.material.count.mockResolvedValue(1);
      mockPrisma.material.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'Ducto' });

      expect(prismaService.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { codigo: { contains: 'Ducto' } },
              { descripcion: { contains: 'Ducto' } },
            ],
          }),
        }),
      );
    });
  });

  describe('syncWithExternal (Lógica del ETL e Integración)', () => {
    it('debería procesar registros válidos, omitir vacíos y deduplicar en memoria', async () => {
      const mockExternalData = {
        data: {
          data: [
            // Registro válido
            {
              modelo: 'DG-1200',
              descripcion: 'Ducto galvanizado 12"',
              unidad: 'ml',
              tipo: 'CHAROLAS Y ACCESORIOS',
              activo: true,
            },
            // Registro con caracteres corruptos que debe normalizar
            {
              modelo: 'AT-0450',
              descripcion: 'Aislamiento trmico 2"',
              unidad: 'm2',
              tipo: 'ACCESORIOS Y CONSUMIBLES',
              activo: true,
            },
            // Registro vacío (ruido) que debe omitir
            { modelo: '', descripcion: '', unidad: '', tipo: '', activo: true },
            // Registro duplicado en la misma respuesta que debe omitir
            {
              modelo: 'DG-1200',
              descripcion: 'Ducto galvanizado 12" (Mock Duplicado)',
              unidad: 'ml',
              tipo: 'CHAROLAS Y ACCESORIOS',
              activo: true,
            },
            // Registro incompleto que debe omitir
            {
              modelo: 'SP-100',
              descripcion: 'Soporte',
              unidad: '',
              tipo: 'Fijación',
            },
          ],
        },
      };

      mockHttp.get.mockReturnValue(of(mockExternalData));
      mockPrisma.material.upsert.mockResolvedValue({});

      const result = await service.syncWithExternal();

      expect(httpService.get).toHaveBeenCalled();

      // Debe haber insertado/actualizado 2 elementos en base de datos:
      // 'DG-1200' y 'AT-0450' (el duplicado se descarta y el incompleto se salta)
      expect(prismaService.material.upsert).toHaveBeenCalledTimes(2);

      // Verificar que se limpió 'Aislamiento trmico' a 'Aislamiento térmico'
      expect(prismaService.material.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            descripcion: 'Aislamiento térmico 2"',
          }),
        }),
      );

      expect(result).toEqual({
        status: 'success',
        processed: 2,
        skippedEmpty: 2, // El vacío + el incompleto
        skippedDuplicates: 1, // El duplicate 'DG-1200'
      });
    });

    it('debería manejar fallos de red o de API externa de forma segura', async () => {
      mockHttp.get.mockImplementation(() => {
        throw new Error('Timeout / Connection Refused');
      });

      const result = await service.syncWithExternal();

      expect(result.status).toBe('failed');
      expect(result.processed).toBe(0);
      expect(result.error).toBe('Timeout / Connection Refused');
    });
  });
});
