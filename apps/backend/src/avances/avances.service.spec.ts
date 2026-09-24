/* eslint-disable @typescript-eslint/unbound-method */

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */

import { Test, TestingModule } from '@nestjs/testing';
import { AvancesService } from './avances.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AvancesService', () => {
  let service: AvancesService;
  let prismaService: PrismaService;

  const mockPrisma = {
    avance: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    avanceItem: {
      create: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    materialExtra: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    materialCapturado: {
      create: jest.fn(),
    },
    tiempoMuerto: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    incidente: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvancesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AvancesService>(AvancesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAvance (Idempotencia y Transacción)', () => {
    it('debería omitir la inserción si el avance ya existe en la base de datos', async () => {
      mockPrisma.avance.findUnique.mockResolvedValue({ id: 'existing-id' });

      const result = await service.createAvance({
        id: 'existing-id',
        proyectoId: 'proj-1',
        fecha: '2026-08-06T00:00:00Z',
        frente: 'Frente Norte',
        autorId: 'user-1',
        items: [],
      });

      expect(prismaService.avance.findUnique).toHaveBeenCalledWith({
        where: { id: 'existing-id' },
      });
      expect(prismaService.$transaction).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: 'skipped_duplicate',
        id: 'existing-id',
      });
    });

    it('debería realizar la transacción e insertar avance con sus items si es nuevo', async () => {
      mockPrisma.avance.findUnique.mockResolvedValue(null);

      // Simular transacción retornando el avance creado
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.avance.create.mockResolvedValue({ id: 'new-id' });
      mockPrisma.avanceItem.create.mockResolvedValue({ id: 'item-1' });

      const result = await service.createAvance({
        id: 'new-id',
        proyectoId: 'proj-1',
        fecha: '2026-08-06T00:00:00Z',
        frente: 'Frente Norte',
        autorId: 'user-1',
        items: [
          {
            tipo: 'planeado',
            materialId: 'mat-1',
            cantidad: 10,
          },
        ],
      });

      expect(prismaService.avance.findUnique).toHaveBeenCalledWith({
        where: { id: 'new-id' },
      });
      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(mockPrisma.avance.create).toHaveBeenCalled();
      expect(mockPrisma.avanceItem.create).toHaveBeenCalled();
      expect(mockPrisma.materialCapturado.create).toHaveBeenCalled();
      expect(result).toEqual({ status: 'created', id: 'new-id' });
    });
  });

  describe('updateAvanceItem y deleteAvanceItem (Modificar / Eliminar Materiales Extras)', () => {
    it('debería modificar un item de avance y sincronizar el material extra', async () => {
      mockPrisma.avanceItem.findUnique.mockResolvedValue({
        id: 'item-1',
        cantidad: 5,
        materialManual: 'Soporte viejo',
        avance: { proyectoId: 'proj-1' },
        materialExtra: { id: 'extra-1' },
      });

      mockPrisma.avanceItem.update.mockResolvedValue({
        id: 'item-1',
        cantidad: 10,
        materialManual: 'Soporte nuevo 4"',
        subtipo: 'extra',
      });

      const updated = await service.updateAvanceItem('item-1', {
        cantidad: 10,
        materialManual: 'Soporte nuevo 4"',
        subtipo: 'extra',
      });

      expect(mockPrisma.avanceItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: {
          cantidad: 10,
          materialManual: 'Soporte nuevo 4"',
          subtipo: 'extra',
        },
      });
      expect(mockPrisma.materialExtra.update).toHaveBeenCalledWith({
        where: { id: 'extra-1' },
        data: {
          cantidad: 10,
          materialManual: 'Soporte nuevo 4"',
        },
      });
      expect(updated.cantidad).toEqual(10);
    });

    it('debería eliminar un item de avance de material extra y eliminar avance si queda vacío', async () => {
      mockPrisma.avanceItem.findUnique.mockResolvedValue({
        id: 'item-1',
        avanceId: 'av-1',
        avance: { id: 'av-1' },
      });
      mockPrisma.avanceItem.delete.mockResolvedValue({ id: 'item-1' });
      mockPrisma.avanceItem.count.mockResolvedValue(0);
      mockPrisma.avance.delete.mockResolvedValue({ id: 'av-1' });

      const result = await service.deleteAvanceItem('item-1');

      expect(mockPrisma.avanceItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
      expect(mockPrisma.avance.delete).toHaveBeenCalledWith({
        where: { id: 'av-1' },
      });
      expect(result).toEqual({ status: 'deleted', id: 'item-1' });
    });
  });

  describe('createTiempoMuerto', () => {
    it('debería omitir la inserción si el tiempo muerto ya existe', async () => {
      mockPrisma.tiempoMuerto.findUnique.mockResolvedValue({
        id: 'tm-existing',
      });

      const result = await service.createTiempoMuerto({
        id: 'tm-existing',
        proyectoId: 'proj-1',
        frente: 'Frente Sur',
        causa: 'Lluvia',
        duracion: 2,
        fecha: '2026-08-06T00:00:00Z',
      });

      expect(prismaService.tiempoMuerto.findUnique).toHaveBeenCalledWith({
        where: { id: 'tm-existing' },
      });
      expect(prismaService.tiempoMuerto.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: 'skipped_duplicate',
        id: 'tm-existing',
      });
    });

    it('debería insertar el tiempo muerto si es nuevo', async () => {
      mockPrisma.tiempoMuerto.findUnique.mockResolvedValue(null);
      mockPrisma.tiempoMuerto.create.mockResolvedValue({ id: 'tm-new' });

      const result = await service.createTiempoMuerto({
        id: 'tm-new',
        proyectoId: 'proj-1',
        frente: 'Frente Sur',
        causa: 'Lluvia',
        duracion: 2,
        fecha: '2026-08-06T00:00:00Z',
      });

      expect(prismaService.tiempoMuerto.create).toHaveBeenCalled();
      expect(result).toEqual({ status: 'created', id: 'tm-new' });
    });
  });

  describe('createIncidente', () => {
    it('debería omitir la inserción si el incidente ya existe', async () => {
      mockPrisma.incidente.findUnique.mockResolvedValue({ id: 'inc-existing' });

      const result = await service.createIncidente({
        id: 'inc-existing',
        proyectoId: 'proj-1',
        categoria: 'Seguridad',
        descripcion: 'Caída de herramienta',
        fecha: '2026-08-06T00:00:00Z',
      });

      expect(prismaService.incidente.findUnique).toHaveBeenCalledWith({
        where: { id: 'inc-existing' },
      });
      expect(prismaService.incidente.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: 'skipped_duplicate',
        id: 'inc-existing',
      });
    });

    it('debería insertar el incidente si es nuevo', async () => {
      mockPrisma.incidente.findUnique.mockResolvedValue(null);
      mockPrisma.incidente.create.mockResolvedValue({ id: 'inc-new' });

      const result = await service.createIncidente({
        id: 'inc-new',
        proyectoId: 'proj-1',
        categoria: 'Seguridad',
        descripcion: 'Caída de herramienta',
        fecha: '2026-08-06T00:00:00Z',
      });

      expect(prismaService.incidente.create).toHaveBeenCalled();
      expect(result).toEqual({ status: 'created', id: 'inc-new' });
    });
  });
});
