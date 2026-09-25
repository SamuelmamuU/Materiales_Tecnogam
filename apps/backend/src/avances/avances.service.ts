import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvanceItemTipo, AvanceItemSubtipo, Prisma } from '@prisma/client';

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
    // 1. Tarea 5.3: Validación de negocio
    for (const item of dto.items) {
      if (item.cantidad <= 0) {
        throw new BadRequestException('La cantidad debe ser mayor a cero.');
      }
      if (item.tipo === 'planeado' && !item.materialId) {
        throw new BadRequestException(
          'El materialId es obligatorio cuando el tipo de avance es planeado.',
        );
      }
      if (item.tipo === 'no_planeado' && !item.materialManual) {
        throw new BadRequestException(
          'El campo materialManual (texto libre) es obligatorio para avances no planeados.',
        );
      }
    }

    // 2. Idempotencia: Verificar si ya existe este avance
    const existing = await this.prisma.avance.findUnique({
      where: { id: dto.id },
    });

    if (existing) {
      this.logger.log(
        `Avance con ID ${dto.id} ya existe. Omitiendo duplicado.`,
      );
      return { status: 'skipped_duplicate', id: dto.id };
    }

    // 3. Transacción para insertar el avance y sus detalles
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

      // Insertar items y vincular materiales extras
      for (const item of dto.items) {
        const createdItem = await tx.avanceItem.create({
          data: {
            avanceId: avance.id,
            tipo: item.tipo,
            subtipo: item.subtipo,
            materialId: item.materialId,
            materialManual: item.materialManual,
            cantidad: item.cantidad,
          },
        });

        if (item.materialId) {
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
        } else if (item.materialManual) {
          // Registrar como material extra en obra vinculado al avanceItem
          await tx.materialExtra.create({
            data: {
              proyectoId: dto.proyectoId,
              avanceItemId: createdItem.id,
              materialManual: item.materialManual,
              cantidad: item.cantidad,
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
    id: string;
    proyectoId: string;
    frente: string;
    causa: string;
    duracion: number;
    fecha: string;
  }) {
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
    id: string;
    proyectoId: string;
    categoria: string;
    descripcion: string;
    fecha: string;
    latitud?: number;
    longitud?: number;
    evidenciaUrl?: string;
  }) {
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

  async findAllForProject(
    projectId: string,
    filters: {
      tipo?: AvanceItemTipo;
      subtipo?: AvanceItemSubtipo;
      fechaInicio?: string;
      fechaFin?: string;
    },
  ) {
    const where: Prisma.AvanceWhereInput = { proyectoId: projectId };

    if (filters.fechaInicio || filters.fechaFin) {
      where.fecha = {
        gte: filters.fechaInicio ? new Date(filters.fechaInicio) : undefined,
        lte: filters.fechaFin ? new Date(filters.fechaFin) : undefined,
      };
    }

    if (filters.tipo || filters.subtipo) {
      where.items = {
        some: {
          tipo: filters.tipo,
          subtipo: filters.subtipo,
        },
      };
    }

    return this.prisma.avance.findMany({
      where,
      include: {
        autor: {
          select: { id: true, nombre: true, email: true },
        },
        items: {
          include: { material: true },
        },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async getProgressTimeline(projectId: string) {
    const proyecto = await this.prisma.proyecto.findUnique({
      where: { id: projectId },
      include: {
        materialesCotizados: true,
      },
    });

    if (!proyecto) {
      throw new NotFoundException('El proyecto solicitado no existe.');
    }

    const totalCotizado = proyecto.materialesCotizados.reduce(
      (acc, c) => acc + c.cantidad,
      0,
    );

    // Obtener avances ordenados cronológicamente
    const avances = await this.prisma.avance.findMany({
      where: { proyectoId: projectId },
      include: {
        items: true,
      },
      orderBy: { fecha: 'asc' },
    });

    // Agrupar cantidades instaladas por fecha
    const dailyMap = new Map<string, number>();
    for (const av of avances) {
      const dateStr = av.fecha.toISOString().split('T')[0];
      const dailySum = av.items.reduce((acc, it) => acc + it.cantidad, 0);
      dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + dailySum);
    }

    // Generar la línea de tiempo
    const start = new Date(proyecto.fechaInicio);
    const end = new Date(proyecto.fechaFinEstimada);
    const totalDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );

    const timeline: Array<{
      fecha: string;
      acumuladoReal: number;
      acumuladoPlaneado: number;
      diarioReal: number;
      diarioPlaneado: number;
    }> = [];

    let runningRealSum = 0;
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayIndex = Math.ceil(
        (current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Calcular S-Curve Planeada (conic/sinusoidal distribution)
      // factor va de 0 a 1
      const factor = totalDays > 0 ? dayIndex / totalDays : 1;
      const plannedPercentage = Math.sin((factor * Math.PI) / 2); // S-curve simple
      const acumuladoPlaneado = totalCotizado * plannedPercentage;

      const diarioReal = dailyMap.get(dateStr) || 0;
      runningRealSum += diarioReal;

      timeline.push({
        fecha: dateStr,
        acumuladoReal: parseFloat(runningRealSum.toFixed(1)),
        acumuladoPlaneado: parseFloat(acumuladoPlaneado.toFixed(1)),
        diarioReal: parseFloat(diarioReal.toFixed(1)),
        diarioPlaneado: parseFloat(
          (totalCotizado / (totalDays || 1)).toFixed(1),
        ),
      });

      current.setDate(current.getDate() + 1);
    }

    return timeline;
  }

  async updateAvanceItem(
    itemId: string,
    dto: {
      cantidad?: number;
      materialManual?: string;
      subtipo?: AvanceItemSubtipo;
    },
  ) {
    if (dto.cantidad !== undefined && dto.cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero.');
    }

    // 1. Buscar si existe en AvanceItem
    const existingItem = await this.prisma.avanceItem.findUnique({
      where: { id: itemId },
      include: { avance: true, materialExtra: true },
    });

    if (existingItem) {
      const updatedItem = await this.prisma.avanceItem.update({
        where: { id: itemId },
        data: {
          cantidad: dto.cantidad !== undefined ? Number(dto.cantidad) : undefined,
          materialManual:
            dto.materialManual !== undefined ? dto.materialManual : undefined,
          subtipo: dto.subtipo !== undefined ? dto.subtipo : undefined,
        },
      });

      // Actualizar o sincronizar el registro en materiales_extras si aplica
      if (existingItem.materialExtra) {
        await this.prisma.materialExtra.update({
          where: { id: existingItem.materialExtra.id },
          data: {
            cantidad:
              dto.cantidad !== undefined ? Number(dto.cantidad) : undefined,
            materialManual:
              dto.materialManual !== undefined ? dto.materialManual : undefined,
          },
        });
      } else if (updatedItem.materialManual) {
        await this.prisma.materialExtra.create({
          data: {
            proyectoId: existingItem.avance.proyectoId,
            avanceItemId: existingItem.id,
            materialManual: updatedItem.materialManual,
            cantidad: updatedItem.cantidad,
          },
        });
      }

      this.logger.log(`Item de avance ${itemId} actualizado con éxito.`);
      return updatedItem;
    }

    // 2. Buscar si existe en MaterialExtra
    const existingExtra = await this.prisma.materialExtra.findUnique({
      where: { id: itemId },
    });

    if (existingExtra) {
      const updatedExtra = await this.prisma.materialExtra.update({
        where: { id: itemId },
        data: {
          cantidad:
            dto.cantidad !== undefined ? Number(dto.cantidad) : undefined,
          materialManual:
            dto.materialManual !== undefined ? dto.materialManual : undefined,
        },
      });

      if (existingExtra.avanceItemId) {
        await this.prisma.avanceItem.update({
          where: { id: existingExtra.avanceItemId },
          data: {
            cantidad:
              dto.cantidad !== undefined ? Number(dto.cantidad) : undefined,
            materialManual:
              dto.materialManual !== undefined ? dto.materialManual : undefined,
            subtipo: dto.subtipo !== undefined ? dto.subtipo : undefined,
          },
        });
      }

      this.logger.log(`Material extra ${itemId} actualizado con éxito.`);
      return updatedExtra;
    }

    throw new NotFoundException('El registro de material extra especificado no existe.');
  }

  async deleteAvanceItem(itemId: string) {
    // 1. Buscar si existe en AvanceItem
    const existingItem = await this.prisma.avanceItem.findUnique({
      where: { id: itemId },
      include: { avance: true },
    });

    if (existingItem) {
      const avanceId = existingItem.avanceId;

      // Eliminar el avanceItem (la relación onDelete: Cascade eliminará el materialExtra asociado)
      await this.prisma.avanceItem.delete({
        where: { id: itemId },
      });

      // Si el avance contenedor ya no tiene items, eliminarlo para mantener limpia la bitácora
      const remainingItemsCount = await this.prisma.avanceItem.count({
        where: { avanceId },
      });

      if (remainingItemsCount === 0) {
        await this.prisma.avance.delete({
          where: { id: avanceId },
        });
      }

      this.logger.log(`Item de avance ${itemId} eliminado con éxito.`);
      return { status: 'deleted', id: itemId };
    }

    // 2. Si no es un AvanceItem, buscar si es un MaterialExtra directo
    const existingExtra = await this.prisma.materialExtra.findUnique({
      where: { id: itemId },
    });

    if (existingExtra) {
      if (existingExtra.avanceItemId) {
        const linkedItem = await this.prisma.avanceItem.findUnique({
          where: { id: existingExtra.avanceItemId },
        });

        if (linkedItem) {
          const avanceId = linkedItem.avanceId;
          await this.prisma.avanceItem.delete({
            where: { id: linkedItem.id },
          });

          const remainingItemsCount = await this.prisma.avanceItem.count({
            where: { avanceId },
          });

          if (remainingItemsCount === 0) {
            await this.prisma.avance.delete({
              where: { id: avanceId },
            });
          }

          this.logger.log(`Material extra ${itemId} eliminado (vía AvanceItem).`);
          return { status: 'deleted', id: itemId };
        }
      }

      await this.prisma.materialExtra.delete({
        where: { id: itemId },
      });

      this.logger.log(`Material extra ${itemId} eliminado directamente.`);
      return { status: 'deleted', id: itemId };
    }

    throw new NotFoundException('El registro de material extra especificado no existe.');
  }

  async getMaterialesExtras(projectId: string) {
    return this.prisma.materialExtra.findMany({
      where: { proyectoId: projectId },
      include: {
        avanceItem: {
          include: {
            avance: {
              include: {
                autor: {
                  select: { id: true, nombre: true, email: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateMaterialExtra(
    extraId: string,
    dto: { cantidad?: number; materialManual?: string },
  ) {
    return this.updateAvanceItem(extraId, dto);
  }

  async deleteMaterialExtra(extraId: string) {
    return this.deleteAvanceItem(extraId);
  }
}
