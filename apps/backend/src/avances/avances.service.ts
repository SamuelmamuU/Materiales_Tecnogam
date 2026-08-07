import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvanceItemTipo, AvanceItemSubtipo } from '@prisma/client';

@Injectable()
export class AvancesService {
  private readonly logger = new Logger(AvancesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createAvance(dto: {
    id: string; // UUID generado por el móvil
    proyectoId: string;
    fecha: string;
    frente: string;
    autorId: string;
    latitud?: number;
    longitud?: number;
    evidenciaUrl?: string;
    items: Array<{
      tipo: AvanceItemTipo;
      subtipo?: AvanceItemSubtipo;
      materialId?: string;
      materialManual?: string;
      cantidad: number;
    }>;
  }) {
    // 1. Idempotencia: Verificar si ya existe este avance
    const existing = await this.prisma.avance.findUnique({
      where: { id: dto.id },
    });

    if (existing) {
      this.logger.log(
        `Avance con ID ${dto.id} ya existe. Omitiendo duplicado.`,
      );
      return { status: 'skipped_duplicate', id: dto.id };
    }

    // 2. Transacción para insertar el avance y sus detalles
    const result = await this.prisma.$transaction(async (tx) => {
      const avance = await tx.avance.create({
        data: {
          id: dto.id,
          proyectoId: dto.proyectoId,
          fecha: new Date(dto.fecha),
          frente: dto.frente,
          autorId: dto.autorId,
          latitud: dto.latitud,
          longitud: dto.longitud,
          evidenciaUrl: dto.evidenciaUrl,
        },
      });

      // Insertar items
      const itemsToCreate = dto.items.map((item) => ({
        avanceId: avance.id,
        tipo: item.tipo,
        subtipo: item.subtipo,
        materialId: item.materialId,
        materialManual: item.materialManual,
        cantidad: item.cantidad,
      }));

      await tx.avanceItem.createMany({
        data: itemsToCreate,
      });

      // Opcional: Actualizar automáticamente el estado de hitos
      // Si la cantidad reportada cumple alguna meta, se podría automatizar.
      // Por ahora registramos la captura física del material
      for (const item of dto.items) {
        if (item.materialId) {
          // Registrar en materiales capturados para control/dashboard
          await tx.materialCapturado.create({
            data: {
              proyectoId: dto.proyectoId,
              materialId: item.materialId,
              materialManual: item.materialManual,
              cantidad: item.cantidad,
              fecha: new Date(dto.fecha),
              latitud: dto.latitud,
              longitud: dto.longitud,
              evidenciaUrl: dto.evidenciaUrl,
            },
          });
        }
      }

      return avance;
    });

    this.logger.log(`Avance creado con éxito: ${result.id}`);
    return { status: 'created', id: result.id };
  }

  async createTiempoMuerto(dto: {
    id: string; // UUID
    proyectoId: string;
    frente: string;
    causa: string;
    duracion: number;
    fecha: string;
  }) {
    // Idempotencia
    const existing = await this.prisma.tiempoMuerto.findUnique({
      where: { id: dto.id },
    });

    if (existing) {
      this.logger.log(
        `Tiempo Muerto con ID ${dto.id} ya existe. Omitiendo duplicado.`,
      );
      return { status: 'skipped_duplicate', id: dto.id };
    }

    const result = await this.prisma.tiempoMuerto.create({
      data: {
        id: dto.id,
        proyectoId: dto.proyectoId,
        frente: dto.frente,
        causa: dto.causa,
        duracion: dto.duracion,
        fecha: new Date(dto.fecha),
      },
    });

    this.logger.log(`Tiempo Muerto creado con éxito: ${result.id}`);
    return { status: 'created', id: result.id };
  }

  async createIncidente(dto: {
    id: string; // UUID
    proyectoId: string;
    categoria: string;
    descripcion: string;
    fecha: string;
    latitud?: number;
    longitud?: number;
    evidenciaUrl?: string;
  }) {
    // Idempotencia
    const existing = await this.prisma.incidente.findUnique({
      where: { id: dto.id },
    });

    if (existing) {
      this.logger.log(
        `Incidente con ID ${dto.id} ya existe. Omitiendo duplicado.`,
      );
      return { status: 'skipped_duplicate', id: dto.id };
    }

    const result = await this.prisma.incidente.create({
      data: {
        id: dto.id,
        proyectoId: dto.proyectoId,
        categoria: dto.categoria,
        descripcion: dto.descripcion,
        fecha: new Date(dto.fecha),
        latitud: dto.latitud,
        longitud: dto.longitud,
        evidenciaUrl: dto.evidenciaUrl,
        estatus: 'abierto',
      },
    });

    this.logger.log(`Incidente creado con éxito: ${result.id}`);
    return { status: 'created', id: result.id };
  }
}
