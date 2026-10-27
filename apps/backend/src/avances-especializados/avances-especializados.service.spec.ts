import { Test, TestingModule } from '@nestjs/testing';
import {
  AvancesEspecializadosService,
  ORANGE_COLUMNS,
} from './avances-especializados.service';
import { PrismaService } from '../prisma/prisma.service';
import { Rol } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AvancesEspecializadosService', () => {
  let service: AvancesEspecializadosService;
  let prisma: Partial<PrismaService>;

  beforeEach(async () => {
    prisma = {
      proyecto: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'proj-1', fechaCulminacion: null }),
      } as any,
      usuario: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', nombre: 'Supervisor Prueba' }),
      } as any,
      avanceInstrumentacion: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'row-1',
            proyectoId: 'proj-1',
            item: 1,
            tag: 'LI001',
            instaladoPlanta: '0',
            celdasAudit: {
              instaladoPlanta: {
                usuarioId: 'admin-1',
                usuarioNombre: 'Admin',
                fechaEdicion: '2026-10-18T10:00:00Z',
              },
            },
          },
        ]),
        findUnique: jest.fn().mockResolvedValue({
          id: 'row-1',
          proyectoId: 'proj-1',
          item: 1,
          tag: 'LI001',
          instaladoPlanta: '0',
          celdasAudit: {},
        }),
        update: jest.fn().mockImplementation(({ data }) => ({
          id: 'row-1',
          proyectoId: 'proj-1',
          item: 1,
          tag: 'LI001',
          ...data,
        })),
        count: jest.fn().mockResolvedValue(1),
      } as any,
      avanceCeldaAuditoria: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvancesEspecializadosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AvancesEspecializadosService>(
      AvancesEspecializadosService,
    );
  });

  it('debe suprimir celdasAudit cuando el rol es supervisor', async () => {
    const res = await service.getRows('proj-1', 'instrumentacion', {
      id: 'sup-1',
      rol: Rol.supervisor,
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].celdasAudit).toBeUndefined();
    expect(res.rows[0].tag).toBe('LI001');
  });

  it('debe incluir celdasAudit cuando el rol es administrador', async () => {
    const res = await service.getRows('proj-1', 'instrumentacion', {
      id: 'admin-1',
      rol: Rol.administrador,
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].celdasAudit).toBeDefined();
    expect(res.rows[0].celdasAudit.instaladoPlanta).toBeDefined();
  });

  it('debe RECHAZAR con 403 Forbidden si un supervisor intenta modificar una columna negra (Admin)', async () => {
    await expect(
      service.updateRow(
        'proj-1',
        'instrumentacion',
        'row-1',
        { tag: 'TAG_HACKEADO' }, // Columna negra
        { id: 'sup-1', rol: Rol.supervisor },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debe PERMITIR y auditar si un supervisor modifica una columna naranja (Avance)', async () => {
    const res = await service.updateRow(
      'proj-1',
      'instrumentacion',
      'row-1',
      { instaladoPlanta: '1' }, // Columna naranja
      { id: 'sup-1', rol: Rol.supervisor },
    );

    expect(prisma.avanceInstrumentacion!.update).toHaveBeenCalled();
    expect(prisma.avanceCeldaAuditoria!.createMany).toHaveBeenCalled();
    // Como es supervisor, el retorno suprime celdasAudit
    expect(res.celdasAudit).toBeUndefined();
    expect(res.instaladoPlanta).toBe('1');
  });

  it('debe incluir conectorRapido y sensorPosicion en las columnas mutables de valvulas y excluir comisioning', () => {
    expect(ORANGE_COLUMNS.valvulas).toContain('conectorRapido');
    expect(ORANGE_COLUMNS.valvulas).toContain('sensorPosicion');
    expect(ORANGE_COLUMNS.valvulas).not.toContain('comisioning');
    expect(ORANGE_COLUMNS.valvulas).toContain('comisionamiento');
  });

  it('debe generar plantilla CSV para instrumentacion sin Cant ni EVK', () => {
    const { content } = service.generateCsvTemplate('instrumentacion');
    const headerLine = content.split('\n')[0];
    const headers = headerLine.split(',');
    expect(headers).not.toContain('Cant');
    expect(headers).not.toContain('EVK');
    expect(headers).toContain('Item');
    expect(headers).toContain('Tag');
    expect(headers).toContain('Servicio que Suple');
    expect(headers).toContain('Ubicacion');
  });

  it('debe generar plantilla CSV para motor sin las 10 columnas tecnicas eliminadas', () => {
    const { content } = service.generateCsvTemplate('motor');
    const headerLine = content.split('\n')[0];
    const headers = headerLine.split(',');
    expect(headers).not.toContain('FLA Current');
    expect(headers).not.toContain('FLA 1.25 Current');
    expect(headers).not.toContain('Temperature Factor');
    expect(headers).not.toContain('Grouping Factor');
    expect(headers).not.toContain('Wires Per Phase');
    expect(headers).not.toContain('Voltage Loss Factor');
    expect(headers).not.toContain('Cable Length Mts');
    expect(headers).not.toContain('Voltage Loss Pct');
    expect(headers).not.toContain('Wire Gauge');
    expect(headers).not.toContain('Ground Wire Gauge');
    expect(headers).toContain('Part');
    expect(headers).toContain('TAG');
    expect(headers).toContain('Description');
    expect(headers).toContain('Operating Mode');
    expect(headers).toContain('Voltage');
    expect(headers).toContain('HP');
    expect(headers).toContain('Phases');
    expect(headers).toContain('Ubicacion');
    expect(headers).toContain('Tamano Cable');
  });
});
