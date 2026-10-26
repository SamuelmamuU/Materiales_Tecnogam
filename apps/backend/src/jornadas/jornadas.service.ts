import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoJornada } from '@prisma/client';
import {
  IniciarJornadaDto,
  CambiarEstadoJornadaDto,
  FinalizarJornadaDto,
} from './dto/jornada.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class JornadasService {
  private readonly logger = new Logger(JornadasService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getStartOfDay(date: Date = new Date()): Date {
    return new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
  }

  /**
   * Obtiene la jornada del día actual para el supervisor y proyecto indicados,
   * calculando las horas en vivo según el tiempo transcurrido desde el último cambio.
   */
  async getJornadaHoy(projectId: string, userId: string) {
    const today = this.getStartOfDay();

    const jornada = await this.prisma.jornadaLaboral.findUnique({
      where: {
        proyectoId_supervisorId_fecha: {
          proyectoId: projectId,
          supervisorId: userId,
          fecha: today,
        },
      },
      include: {
        supervisor: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
        eventos: {
          orderBy: { inicio: 'asc' },
        },
      },
    });

    if (!jornada) return null;

    const now = new Date();
    const deltaMs = Math.max(
      0,
      now.getTime() - new Date(jornada.ultimoCambioEstado).getTime(),
    );
    const deltaHours = deltaMs / (1000 * 60 * 60);

    let horasTrabajadasLive = jornada.horasTrabajadas;
    let horasTiempoMuertoLive = jornada.horasTiempoMuerto;
    let horasComidaLive = jornada.horasComida;

    if (jornada.estado === EstadoJornada.TRABAJANDO) {
      horasTrabajadasLive += deltaHours;
    } else if (jornada.estado === EstadoJornada.TIEMPO_MUERTO) {
      horasTiempoMuertoLive += deltaHours;
    } else if (jornada.estado === EstadoJornada.COMIDA) {
      horasComidaLive += deltaHours;
    }

    return {
      ...jornada,
      horasTrabajadasLive: Number(horasTrabajadasLive.toFixed(3)),
      horasTiempoMuertoLive: Number(horasTiempoMuertoLive.toFixed(3)),
      horasComidaLive: Number(horasComidaLive.toFixed(3)),
    };
  }

  /**
   * Inicia la jornada de hoy. Si no existía, la crea en estado TRABAJANDO.
   * Si ya existía y estaba en pausa o comida, reanuda a TRABAJANDO.
   */
  async iniciarJornada(
    projectId: string,
    userId: string,
    dto?: IniciarJornadaDto,
  ) {
    const today = this.getStartOfDay();
    const now = new Date();

    const existing = await this.prisma.jornadaLaboral.findUnique({
      where: {
        proyectoId_supervisorId_fecha: {
          proyectoId: projectId,
          supervisorId: userId,
          fecha: today,
        },
      },
      include: { eventos: { orderBy: { inicio: 'desc' }, take: 1 } },
    });

    if (existing) {
      if (existing.estado === EstadoJornada.FINALIZADA) {
        throw new BadRequestException(
          'La jornada de hoy ya fue finalizada. No se pueden reabrir jornadas concluidas.',
        );
      }

      if (existing.estado === EstadoJornada.TRABAJANDO) {
        return existing;
      }

      // Reanudando desde TIEMPO_MUERTO o COMIDA
      return this.cambiarEstado(projectId, userId, {
        nuevoEstado: 'TRABAJANDO',
        motivo: 'Reanudación de labores',
      });
    }

    // Crear nueva jornada
    await this.prisma.$transaction(async (tx) => {
      const jornada = await tx.jornadaLaboral.create({
        data: {
          proyectoId: projectId,
          supervisorId: userId,
          fecha: today,
          estado: EstadoJornada.TRABAJANDO,
          horaInicio: now,
          ultimoCambioEstado: now,
          notas: dto?.notas ?? null,
        },
      });

      await tx.jornadaEvento.create({
        data: {
          jornadaId: jornada.id,
          tipoEstado: EstadoJornada.TRABAJANDO,
          inicio: now,
          motivo: 'Inicio de jornada laboral',
        },
      });

      return jornada;
    });

    this.logger.log(
      `Jornada iniciada para supervisor ${userId} en proyecto ${projectId}`,
    );
    return this.getJornadaHoy(projectId, userId);
  }

  /**
   * Transiciona la jornada a otro estado operativo:
   * TRABAJANDO -> TIEMPO_MUERTO o COMIDA
   * TIEMPO_MUERTO -> TRABAJANDO o COMIDA
   * COMIDA -> TRABAJANDO
   */
  async cambiarEstado(
    projectId: string,
    userId: string,
    dto: CambiarEstadoJornadaDto,
  ) {
    const today = this.getStartOfDay();
    const now = new Date();

    const jornada = await this.prisma.jornadaLaboral.findUnique({
      where: {
        proyectoId_supervisorId_fecha: {
          proyectoId: projectId,
          supervisorId: userId,
          fecha: today,
        },
      },
      include: {
        eventos: {
          where: { fin: null },
          orderBy: { inicio: 'desc' },
          take: 1,
        },
      },
    });

    if (!jornada) {
      throw new NotFoundException(
        'No se ha iniciado una jornada laboral el día de hoy.',
      );
    }

    if (jornada.estado === EstadoJornada.FINALIZADA) {
      throw new BadRequestException(
        'La jornada ya está finalizada y no puede cambiar de estado.',
      );
    }

    if (jornada.estado === (dto.nuevoEstado as EstadoJornada)) {
      return this.getJornadaHoy(projectId, userId);
    }

    const deltaMs = Math.max(
      0,
      now.getTime() - new Date(jornada.ultimoCambioEstado).getTime(),
    );
    const deltaHours = deltaMs / (1000 * 60 * 60);

    let nuevasHorasTrabajadas = jornada.horasTrabajadas;
    let nuevasHorasTiempoMuerto = jornada.horasTiempoMuerto;
    let nuevasHorasComida = jornada.horasComida;

    if (jornada.estado === EstadoJornada.TRABAJANDO) {
      nuevasHorasTrabajadas += deltaHours;
    } else if (jornada.estado === EstadoJornada.TIEMPO_MUERTO) {
      nuevasHorasTiempoMuerto += deltaHours;
    } else if (jornada.estado === EstadoJornada.COMIDA) {
      nuevasHorasComida += deltaHours;
    }

    await this.prisma.$transaction(async (tx) => {
      // Cerrar evento activo si existe
      if (jornada.eventos.length > 0) {
        const eventoActivo = jornada.eventos[0];
        await tx.jornadaEvento.update({
          where: { id: eventoActivo.id },
          data: {
            fin: now,
            duracion: Number(deltaHours.toFixed(3)),
          },
        });
      }

      // Crear nuevo evento
      await tx.jornadaEvento.create({
        data: {
          jornadaId: jornada.id,
          tipoEstado: dto.nuevoEstado,
          inicio: now,
          motivo: dto.motivo ?? null,
        },
      });

      // Actualizar jornada
      await tx.jornadaLaboral.update({
        where: { id: jornada.id },
        data: {
          estado: dto.nuevoEstado,
          horasTrabajadas: Number(nuevasHorasTrabajadas.toFixed(3)),
          horasTiempoMuerto: Number(nuevasHorasTiempoMuerto.toFixed(3)),
          horasComida: Number(nuevasHorasComida.toFixed(3)),
          ultimoCambioEstado: now,
        },
      });
    });

    // Sincronizar tiempo muerto en la tabla general si hubo acumulación
    if (nuevasHorasTiempoMuerto > 0) {
      await this.sincronizarTiempoMuerto(
        projectId,
        userId,
        today,
        nuevasHorasTiempoMuerto,
        dto.motivo,
      );
    }

    return this.getJornadaHoy(projectId, userId);
  }

  /**
   * Finaliza la jornada del día actual, cerrando todos los relojes.
   */
  async finalizarJornada(
    projectId: string,
    userId: string,
    dto?: FinalizarJornadaDto,
  ) {
    const today = this.getStartOfDay();
    const now = new Date();

    const jornada = await this.prisma.jornadaLaboral.findUnique({
      where: {
        proyectoId_supervisorId_fecha: {
          proyectoId: projectId,
          supervisorId: userId,
          fecha: today,
        },
      },
      include: {
        eventos: {
          where: { fin: null },
          orderBy: { inicio: 'desc' },
          take: 1,
        },
      },
    });

    if (!jornada) {
      throw new NotFoundException(
        'No se ha iniciado una jornada el día de hoy.',
      );
    }

    if (jornada.estado === EstadoJornada.FINALIZADA) {
      return this.getJornadaHoy(projectId, userId);
    }

    const deltaMs = Math.max(
      0,
      now.getTime() - new Date(jornada.ultimoCambioEstado).getTime(),
    );
    const deltaHours = deltaMs / (1000 * 60 * 60);

    let nuevasHorasTrabajadas = jornada.horasTrabajadas;
    let nuevasHorasTiempoMuerto = jornada.horasTiempoMuerto;
    let nuevasHorasComida = jornada.horasComida;

    if (jornada.estado === EstadoJornada.TRABAJANDO) {
      nuevasHorasTrabajadas += deltaHours;
    } else if (jornada.estado === EstadoJornada.TIEMPO_MUERTO) {
      nuevasHorasTiempoMuerto += deltaHours;
    } else if (jornada.estado === EstadoJornada.COMIDA) {
      nuevasHorasComida += deltaHours;
    }

    await this.prisma.$transaction(async (tx) => {
      // Cerrar evento activo
      if (jornada.eventos.length > 0) {
        const eventoActivo = jornada.eventos[0];
        await tx.jornadaEvento.update({
          where: { id: eventoActivo.id },
          data: {
            fin: now,
            duracion: Number(deltaHours.toFixed(3)),
          },
        });
      }

      // Evento de fin
      await tx.jornadaEvento.create({
        data: {
          jornadaId: jornada.id,
          tipoEstado: EstadoJornada.FINALIZADA,
          inicio: now,
          fin: now,
          duracion: 0,
          motivo: dto?.notas ?? 'Cierre regular de jornada',
        },
      });

      // Actualizar jornada a FINALIZADA
      await tx.jornadaLaboral.update({
        where: { id: jornada.id },
        data: {
          estado: EstadoJornada.FINALIZADA,
          horaFin: now,
          horasTrabajadas: Number(nuevasHorasTrabajadas.toFixed(3)),
          horasTiempoMuerto: Number(nuevasHorasTiempoMuerto.toFixed(3)),
          horasComida: Number(nuevasHorasComida.toFixed(3)),
          ultimoCambioEstado: now,
          notas: dto?.notas
            ? `${jornada.notas ?? ''} | Cierre: ${dto.notas}`.trim()
            : jornada.notas,
        },
      });
    });

    if (nuevasHorasTiempoMuerto > 0) {
      await this.sincronizarTiempoMuerto(
        projectId,
        userId,
        today,
        nuevasHorasTiempoMuerto,
        dto?.notas,
      );
    }

    return this.getJornadaHoy(projectId, userId);
  }

  /**
   * Sincroniza las horas de tiempo muerto del día en la tabla tiempos_muertos del proyecto.
   */
  private async sincronizarTiempoMuerto(
    projectId: string,
    supervisorId: string,
    fecha: Date,
    duracionHoras: number,
    motivo?: string,
  ) {
    try {
      const supervisor = await this.prisma.usuario.findUnique({
        where: { id: supervisorId },
        select: { nombre: true },
      });
      const supervisorNombre = supervisor?.nombre || 'Supervisor';

      const frenteTag = `Jornada Supervisor: ${supervisorNombre}`;
      const causaText = motivo?.trim()
        ? `Paro en jornada: ${motivo.trim()}`
        : `Tiempo muerto reportado en jornada por ${supervisorNombre}`;

      // Buscar si ya existe un registro de tiempo muerto para este frente y fecha
      const existing = await this.prisma.tiempoMuerto.findFirst({
        where: {
          proyectoId: projectId,
          frente: frenteTag,
          fecha: {
            gte: fecha,
            lt: new Date(fecha.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      if (existing) {
        await this.prisma.tiempoMuerto.update({
          where: { id: existing.id },
          data: {
            duracion: Number(duracionHoras.toFixed(2)),
            causa: causaText,
          },
        });
      } else {
        await this.prisma.tiempoMuerto.create({
          data: {
            id: randomUUID(),
            proyectoId: projectId,
            frente: frenteTag,
            causa: causaText,
            duracion: Number(duracionHoras.toFixed(2)),
            fecha: fecha,
          },
        });
      }
    } catch (err: any) {
      this.logger.error(`Error al sincronizar tiempo muerto: ${err.message}`);
    }
  }

  /**
   * Lista el historial de jornadas de un proyecto con sus supervisores y eventos.
   */
  async getHistorialJornadas(projectId: string) {
    return this.prisma.jornadaLaboral.findMany({
      where: { proyectoId: projectId },
      include: {
        supervisor: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
        eventos: {
          orderBy: { inicio: 'asc' },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 50,
    });
  }
}
