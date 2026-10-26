import { Test, TestingModule } from '@nestjs/testing';
import { JornadasService } from './jornadas.service';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoJornada } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('JornadasService', () => {
  let service: JornadasService;
  let prisma: PrismaService;

  const mockPrisma = {
    jornadaLaboral: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    jornadaEvento: {
      create: jest.fn(),
      update: jest.fn(),
    },
    usuario: {
      findUnique: jest.fn(),
    },
    tiempoMuerto: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JornadasService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<JornadasService>(JornadasService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('iniciarJornada', () => {
    it('debe crear una nueva jornada si no existe para hoy', async () => {
      mockPrisma.jornadaLaboral.findUnique.mockResolvedValueOnce(null);

      const fakeJornada = {
        id: 'j-1',
        proyectoId: 'p-1',
        supervisorId: 'u-1',
        estado: EstadoJornada.TRABAJANDO,
        horaInicio: new Date(),
        horasTrabajadas: 0,
        horasTiempoMuerto: 0,
        horasComida: 0,
        ultimoCambioEstado: new Date(),
        eventos: [],
      };

      mockPrisma.jornadaLaboral.create.mockResolvedValue(fakeJornada);
      mockPrisma.jornadaEvento.create.mockResolvedValue({});
      mockPrisma.jornadaLaboral.findUnique.mockResolvedValueOnce(fakeJornada);

      const res = await service.iniciarJornada('p-1', 'u-1');
      expect(res).toBeDefined();
      expect(mockPrisma.jornadaLaboral.create).toHaveBeenCalled();
      expect(mockPrisma.jornadaEvento.create).toHaveBeenCalled();
    });

    it('debe arrojar BadRequestException si la jornada ya fue finalizada hoy', async () => {
      mockPrisma.jornadaLaboral.findUnique.mockResolvedValue({
        id: 'j-1',
        estado: EstadoJornada.FINALIZADA,
      });

      await expect(service.iniciarJornada('p-1', 'u-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cambiarEstado', () => {
    it('debe conmutar de TRABAJANDO a TIEMPO_MUERTO y acumular horas trabajadas', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const existingJornada = {
        id: 'j-1',
        proyectoId: 'p-1',
        supervisorId: 'u-1',
        fecha: new Date(),
        estado: EstadoJornada.TRABAJANDO,
        horaInicio: tenMinutesAgo,
        horasTrabajadas: 1.0,
        horasTiempoMuerto: 0,
        horasComida: 0,
        ultimoCambioEstado: tenMinutesAgo,
        eventos: [{ id: 'ev-1', fin: null }],
      };

      mockPrisma.jornadaLaboral.findUnique
        .mockResolvedValueOnce(existingJornada)
        .mockResolvedValueOnce({
          ...existingJornada,
          estado: EstadoJornada.TIEMPO_MUERTO,
          horasTrabajadas: 1.167,
        });

      mockPrisma.jornadaEvento.update.mockResolvedValue({});
      mockPrisma.jornadaEvento.create.mockResolvedValue({});
      mockPrisma.jornadaLaboral.update.mockResolvedValue({});
      mockPrisma.usuario.findUnique.mockResolvedValue({
        nombre: 'Supervisor 1',
      });

      const res = await service.cambiarEstado('p-1', 'u-1', {
        nuevoEstado: 'TIEMPO_MUERTO',
        motivo: 'Falta de material en frente',
      });

      expect(res).toBeDefined();
      expect(mockPrisma.jornadaEvento.update).toHaveBeenCalled();
      expect(mockPrisma.jornadaEvento.create).toHaveBeenCalled();
    });
  });

  describe('finalizarJornada', () => {
    it('debe cerrar la jornada y colocar estado FINALIZADA', async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const existingJornada = {
        id: 'j-1',
        proyectoId: 'p-1',
        supervisorId: 'u-1',
        fecha: new Date(),
        estado: EstadoJornada.TRABAJANDO,
        horaInicio: fiveMinutesAgo,
        horasTrabajadas: 2.0,
        horasTiempoMuerto: 0.5,
        horasComida: 1.0,
        ultimoCambioEstado: fiveMinutesAgo,
        eventos: [{ id: 'ev-1', fin: null }],
      };

      mockPrisma.jornadaLaboral.findUnique
        .mockResolvedValueOnce(existingJornada)
        .mockResolvedValueOnce({
          ...existingJornada,
          estado: EstadoJornada.FINALIZADA,
        });

      mockPrisma.jornadaEvento.update.mockResolvedValue({});
      mockPrisma.jornadaEvento.create.mockResolvedValue({});
      mockPrisma.jornadaLaboral.update.mockResolvedValue({});

      const res = await service.finalizarJornada('p-1', 'u-1', {
        notas: 'Fin de jornada con éxito',
      });

      expect(res).toBeDefined();
      expect(mockPrisma.jornadaLaboral.update).toHaveBeenCalled();
    });
  });
});
