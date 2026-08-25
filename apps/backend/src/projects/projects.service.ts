import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const project = await this.prisma.proyecto.findUnique({
      where: { id },
      include: {
        hitos: true,
        miembros: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                rol: true,
              },
            },
          },
        },
        materialesCotizados: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('El proyecto solicitado no existe.');
    }

    return project;
  }

  async findAllForUser(userId: string, userRol: string) {
    // Si el usuario es administrador, puede ver todos los proyectos
    if (userRol === 'administrador') {
      return this.prisma.proyecto.findMany({
        include: { hitos: true },
      });
    }

    // Si es supervisor, trabajador o cliente, solo ve los proyectos donde es miembro
    return this.prisma.proyecto.findMany({
      where: {
        miembros: {
          some: {
            usuarioId: userId,
          },
        },
      },
      include: { hitos: true },
    });
  }

  async getDashboardData(projectId: string) {
    const project = await this.prisma.proyecto.findUnique({
      where: { id: projectId },
      include: {
        hitos: true,
      },
    });

    if (!project) {
      throw new NotFoundException('El proyecto solicitado no existe.');
    }

    const hitos = project.hitos;

    const cotizados = await this.prisma.materialCotizado.findMany({
      where: { proyectoId: projectId },
      include: { material: true },
    });

    const capturados = await this.prisma.materialCapturado.findMany({
      where: { proyectoId: projectId },
      include: { material: true },
    });

    const declaraciones = await this.prisma.declaracionMaterial.findMany({
      where: { proyectoId: projectId },
      include: { material: true },
    });

    const incidentes = await this.prisma.incidente.findMany({
      where: { proyectoId: projectId },
      orderBy: { fecha: 'desc' },
    });

    const tiemposMuertos = await this.prisma.tiempoMuerto.findMany({
      where: { proyectoId: projectId },
      orderBy: { fecha: 'desc' },
    });

    const reconciliationMap = new Map<
      string,
      {
        codigo: string;
        descripcion: string;
        unidad: string;
        cotizado: number;
        recibido: number;
        declaradoCliente: number;
        instalado: number;
      }
    >();

    for (const c of cotizados) {
      reconciliationMap.set(c.materialId, {
        codigo: c.material.codigo,
        descripcion: c.material.descripcion,
        unidad: c.material.unidad,
        cotizado: c.cantidad,
        recibido: 0,
        declaradoCliente: 0,
        instalado: 0,
      });
    }

    for (const d of declaraciones) {
      if (!reconciliationMap.has(d.materialId)) {
        reconciliationMap.set(d.materialId, {
          codigo: d.material.codigo,
          descripcion: d.material.descripcion,
          unidad: d.material.unidad,
          cotizado: 0,
          recibido: 0,
          declaradoCliente: 0,
          instalado: 0,
        });
      }
      const entry = reconciliationMap.get(d.materialId)!;
      if (d.estado === 'real_recibido') {
        entry.recibido += d.cantidad;
      } else if (d.estado === 'declarado_cliente') {
        entry.declaradoCliente += d.cantidad;
      }
    }

    for (const cap of capturados) {
      if (cap.materialId) {
        if (!reconciliationMap.has(cap.materialId)) {
          reconciliationMap.set(cap.materialId, {
            codigo: cap.material?.codigo || 'Manual',
            descripcion: cap.material?.descripcion || cap.materialManual || '',
            unidad: cap.material?.unidad || 'pza',
            cotizado: 0,
            recibido: 0,
            declaradoCliente: 0,
            instalado: 0,
          });
        }
        const entry = reconciliationMap.get(cap.materialId)!;
        entry.instalado += cap.cantidad;
      }
    }

    const reconciliation = Array.from(reconciliationMap.entries()).map(
      ([materialId, data]) => ({
        materialId,
        ...data,
        discrepancia: data.instalado - data.cotizado,
      }),
    );

    const totalCotizado = cotizados.reduce((acc, c) => acc + c.cantidad, 0);
    const totalInstalado = capturados.reduce((acc, c) => acc + c.cantidad, 0);
    const totalRecibido = declaraciones
      .filter((d) => d.estado === 'real_recibido')
      .reduce((acc, d) => acc + d.cantidad, 0);

    const avanceGeneral =
      totalCotizado > 0 ? (totalInstalado / totalCotizado) * 100 : 0;

    const totalTiemposMuertosHoras = tiemposMuertos.reduce(
      (acc, t) => acc + t.duracion,
      0,
    );

    const openIncidentes = incidentes.filter(
      (i) => i.estatus === 'abierto',
    ).length;
    const resolvedIncidentes = incidentes.filter(
      (i) => i.estatus === 'resuelto',
    ).length;

    return {
      proyecto: {
        id: project.id,
        nombre: project.nombre,
        cliente: project.cliente,
        fechaInicio: project.fechaInicio,
        fechaFinEstimada: project.fechaFinEstimada,
      },
      kpis: {
        totalCotizado,
        totalInstalado,
        totalRecibido,
        avanceGeneral,
        totalTiemposMuertosHoras,
        openIncidentes,
        resolvedIncidentes,
      },
      hitos,
      reconciliation,
      incidentes,
      tiemposMuertos,
    };
  }

  async resolveIncidente(incidenteId: string) {
    const existing = await this.prisma.incidente.findUnique({
      where: { id: incidenteId },
    });
    if (!existing) {
      throw new NotFoundException('El incidente solicitado no existe.');
    }
    return this.prisma.incidente.update({
      where: { id: incidenteId },
      data: { estatus: 'resuelto' },
    });
  }

  async create(data: Prisma.ProyectoCreateInput) {
    return this.prisma.proyecto.create({
      data,
    });
  }

  async update(id: string, data: Partial<Prisma.ProyectoUpdateInput>) {
    await this.findOne(id);
    return this.prisma.proyecto.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.proyecto.delete({
      where: { id },
      select: {
        id: true,
        nombre: true,
      },
    });
  }

  async addMember(projectId: string, userId: string) {
    await this.findOne(projectId);
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });
    if (!user)
      throw new NotFoundException('El usuario especificado no existe.');

    const existing = await this.prisma.memberProyecto.findUnique({
      where: {
        usuarioId_proyectoId: { usuarioId: userId, proyectoId: projectId },
      },
    });
    if (existing) return existing;

    return this.prisma.memberProyecto.create({
      data: {
        proyectoId: projectId,
        usuarioId: userId,
      },
    });
  }

  async removeMember(projectId: string, userId: string) {
    await this.findOne(projectId);
    const existing = await this.prisma.memberProyecto.findUnique({
      where: {
        usuarioId_proyectoId: { usuarioId: userId, proyectoId: projectId },
      },
    });
    if (!existing) {
      throw new NotFoundException('El usuario no es miembro de este proyecto.');
    }

    return this.prisma.memberProyecto.delete({
      where: {
        usuarioId_proyectoId: { usuarioId: userId, proyectoId: projectId },
      },
    });
  }

  async createHito(
    projectId: string,
    data: {
      nombre: string;
      fechaObjetivo: string;
      estatus?: 'pendiente' | 'completado' | 'atrasado';
    },
  ) {
    await this.findOne(projectId);
    return this.prisma.hito.create({
      data: {
        nombre: data.nombre,
        fechaObjetivo: new Date(data.fechaObjetivo),
        estatus: data.estatus || 'pendiente',
        proyectoId: projectId,
      },
    });
  }

  async updateHito(
    hitoId: string,
    data: {
      nombre?: string;
      fechaObjetivo?: string;
      estatus?: 'pendiente' | 'completado' | 'atrasado';
    },
  ) {
    const existing = await this.prisma.hito.findUnique({
      where: { id: hitoId },
    });
    if (!existing) throw new NotFoundException('El hito solicitado no existe.');

    const updateData: Prisma.HitoUpdateInput = {};
    if (data.nombre) updateData.nombre = data.nombre;
    if (data.fechaObjetivo)
      updateData.fechaObjetivo = new Date(data.fechaObjetivo);
    if (data.estatus) updateData.estatus = data.estatus;

    return this.prisma.hito.update({
      where: { id: hitoId },
      data: updateData,
    });
  }

  async removeHito(hitoId: string) {
    const existing = await this.prisma.hito.findUnique({
      where: { id: hitoId },
    });
    if (!existing) throw new NotFoundException('El hito solicitado no existe.');

    return this.prisma.hito.delete({
      where: { id: hitoId },
    });
  }

  async bulkImportMaterials(proyectoId: string, items: {
    codigo: string;
    descripcion: string;
    unidad: string;
    categoria?: string;
    cantidad: number;
  }[]) {
    await this.findOne(proyectoId);

    for (const item of items) {
      try {
        const cleanedCodigo = item.codigo ? item.codigo.trim() : '';
        if (!cleanedCodigo) continue;

        // 1. Encontrar o crear el material en el catálogo maestro
        let material = await this.prisma.material.findUnique({
          where: { codigo: cleanedCodigo },
        });

        if (!material) {
          material = await this.prisma.material.create({
            data: {
              codigo: cleanedCodigo,
              descripcion: item.descripcion?.trim() || 'Material Importado',
              unidad: item.unidad?.trim() || 'pza',
              categoria: item.categoria?.trim() || 'General',
              activo: true,
            },
          });
        } else {
          // Si el material existe pero difiere en descripción/unidad, lo actualizamos con los datos del CSV
          material = await this.prisma.material.update({
            where: { id: material.id },
            data: {
              descripcion: item.descripcion?.trim() || material.descripcion,
              unidad: item.unidad?.trim() || material.unidad,
              categoria: item.categoria?.trim() || material.categoria,
            },
          });
        }

        // 2. Crear o actualizar la relación en el proyecto
        await this.prisma.materialCotizado.upsert({
          where: {
            proyectoId_materialId: {
              proyectoId,
              materialId: material.id,
            },
          },
          update: {
            cantidad: Number(item.cantidad),
          },
          create: {
            proyectoId,
            materialId: material.id,
            cantidad: Number(item.cantidad),
          },
        });
      } catch (err) {
        console.error(`Error importando material ${item.codigo}:`, err);
      }
    }

    return this.findOne(proyectoId);
  }

  async addMaterial(proyectoId: string, materialId: string, cantidad: number) {
    await this.findOne(proyectoId);
    
    await this.prisma.materialCotizado.upsert({
      where: {
        proyectoId_materialId: {
          proyectoId,
          materialId,
        },
      },
      update: {
        cantidad,
      },
      create: {
        proyectoId,
        materialId,
        cantidad,
      },
    });

    return this.findOne(proyectoId);
  }

  async removeMaterial(proyectoId: string, materialId: string) {
    await this.findOne(proyectoId);
    
    await this.prisma.materialCotizado.delete({
      where: {
        proyectoId_materialId: {
          proyectoId,
          materialId,
        },
      },
    });

    return this.findOne(proyectoId);
  }
}
