import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Rol } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

export const ORANGE_COLUMNS: Record<string, string[]> = {
  instrumentacion: [
    'instaladoPlanta',
    'cableado',
    'cantidadCable',
    'peinadoCinchado',
    'conexionPlanta',
    'conexionTablero',
    'pruebas',
    'nota',
  ],
  valvulas: [
    'cableadoNeum',
    'cableNeumInstal',
    'peinadoNeum',
    'conectorRapido',
    'conexionPlantaNeum',
    'conexionManifold',
    'pruebasNeum',
    'notasNeum',
    'cableadoCtrl',
    'cableCtrlInstal',
    'peinadoCtrl',
    'sensorPosicion',
    'conexionPlantaCtrl',
    'conexionTableroCtrl',
    'comisionamiento',
    'notasCtrl',
  ],
  motor: [
    'cableado',
    'cantidadCable',
    'peinadoCinchado',
    'pruebasAislMotor',
    'pruebasAislCirc',
    'conexionMotor',
    'conexionCcm',
    'motorSoloRun',
    'notas',
  ],
};

@Injectable()
export class AvancesEspecializadosService {
  private readonly logger = new Logger(AvancesEspecializadosService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene las filas de la pestaña especializada.
   * Si el usuario no es administrador, elimina el campo celdasAudit de cada registro.
   */
  async getRows(
    projectId: string,
    modulo: string,
    user: { id: string; rol: Rol },
  ) {
    const validModulo = this.normalizeModulo(modulo);

    let rows: any[] = [];
    if (validModulo === 'instrumentacion') {
      rows = await this.prisma.avanceInstrumentacion.findMany({
        where: { proyectoId: projectId },
        orderBy: { item: 'asc' },
      });
    } else if (validModulo === 'valvulas') {
      rows = await this.prisma.avanceValvula.findMany({
        where: { proyectoId: projectId },
        orderBy: { item: 'asc' },
      });
    } else if (validModulo === 'motor') {
      rows = await this.prisma.avanceMotor.findMany({
        where: { proyectoId: projectId },
        orderBy: { part: 'asc' },
      });
    }

    // Regla de Seguridad y Privacidad: Si NO es administrador, suprimir celdasAudit
    if (user.rol !== Rol.administrador) {
      rows = rows.map((r) => {
        const { celdasAudit, ...rest } = r;
        return rest;
      });
    }

    return { modulo: validModulo, rows };
  }

  /**
   * Crea un nuevo registro técnico (columna negra) en la especialidad.
   * Exclusivo para Administrador.
   */
  async createRow(
    projectId: string,
    modulo: string,
    data: Record<string, any>,
    user: { id: string; rol: Rol },
  ) {
    if (user.rol !== Rol.administrador) {
      throw new ForbiddenException(
        'Solo el administrador tiene autorización para agregar nuevos registros técnicos.',
      );
    }

    const validModulo = this.normalizeModulo(modulo);
    await this.checkProjectNotCulminated(projectId);

    if (validModulo === 'instrumentacion') {
      const currentCount = await this.prisma.avanceInstrumentacion.count({
        where: { proyectoId: projectId },
      });
      const item = data.item ? parseInt(data.item, 10) : currentCount + 1;
      return this.prisma.avanceInstrumentacion.create({
        data: {
          proyectoId: projectId,
          item: isNaN(item) ? currentCount + 1 : item,
          tipoVariable: String(data.tipoVariable || 'NIVEL').trim(),
          equipoAsoc: String(data.equipoAsoc || '').trim(),
          tag: String(data.tag || `TAG-${item}`).trim(),
          servicioSuple: String(data.servicioSuple || '').trim(),
          ubicacion: String(data.ubicacion || 'NIVEL 0').trim(),
          instaladoPlanta: '0',
          cableado: '0',
          cantidadCable: 0,
          peinadoCinchado: '0',
          conexionPlanta: '0',
          conexionTablero: '0',
          pruebas: '0',
          nota: data.nota ? String(data.nota).trim() : null,
        },
      });
    } else if (validModulo === 'valvulas') {
      const currentCount = await this.prisma.avanceValvula.count({
        where: { proyectoId: projectId },
      });
      const item = data.item ? parseInt(data.item, 10) : currentCount + 1;
      return this.prisma.avanceValvula.create({
        data: {
          proyectoId: projectId,
          item: isNaN(item) ? currentCount + 1 : item,
          tag: String(data.tag || `VALV-${item}`).trim(),
          servicioCumple: String(data.servicioCumple || '').trim(),
          funcionamiento: String(data.funcionamiento || 'Manual').trim(),
          tipoValvula: String(data.tipoValvula || 'Bola').trim(),
          ubicacion: String(data.ubicacion || 'Nivel 0').trim(),
          falla: String(data.falla || '-').trim(),
          notaAdmin: data.notaAdmin ? String(data.notaAdmin).trim() : null,
          cableadoNeum: '0',
          cableNeumInstal: 0,
          peinadoNeum: '0',
          conectorRapido: 'Pendiente',
          conexionPlantaNeum: '0',
          conexionManifold: '0',
          pruebasNeum: '0',
          notasNeum: null,
          cableadoCtrl: '0',
          cableCtrlInstal: '0',
          peinadoCtrl: '0',
          sensorPosicion: 'Pendiente',
          conexionPlantaCtrl: '0',
          conexionTableroCtrl: '0',
          comisionamiento: '0',
          notasCtrl: null,
        },
      });
    } else if (validModulo === 'motor') {
      const currentCount = await this.prisma.avanceMotor.count({
        where: { proyectoId: projectId },
      });
      const part = String(data.part || `${currentCount + 1}`).trim();
      return this.prisma.avanceMotor.create({
        data: {
          proyectoId: projectId,
          part,
          tag: String(data.tag || `MOT-${part}`).trim(),
          description: String(data.description || '').trim(),
          operatingMode: String(data.operatingMode || 'ATP').trim(),
          voltage: String(data.voltage || '440').trim(),
          hp: String(data.hp || '1').trim(),
          phases: String(data.phases || '3').trim(),
          ubicacion: String(data.ubicacion || 'Nivel 0').trim(),
          tamanoCable: String(data.tamanoCable || '3X10AWG').trim(),
          cableado: '0',
          cantidadCable: 0,
          peinadoCinchado: '0',
          pruebasAislMotor: '0',
          pruebasAislCirc: '0',
          conexionMotor: '0',
          conexionCcm: '0',
          motorSoloRun: '0',
          notas: null,
        },
      });
    }
  }

  /**
   * Importa masivamente registros técnicos desde un archivo CSV.
   * Exclusivo para Administrador.
   */
  async importFromCsv(
    projectId: string,
    modulo: string,
    csvContent: string,
    user: { id: string; rol: Rol },
  ) {
    if (user.rol !== Rol.administrador) {
      throw new ForbiddenException(
        'Solo el administrador tiene autorización para importar datos vía CSV.',
      );
    }

    const validModulo = this.normalizeModulo(modulo);
    await this.checkProjectNotCulminated(projectId);

    if (!csvContent || typeof csvContent !== 'string') {
      throw new BadRequestException('El contenido del archivo CSV está vacío.');
    }

    const { headers, rows } = this.parseCsv(csvContent);
    if (headers.length === 0 || rows.length === 0) {
      throw new BadRequestException(
        'No se detectaron filas de datos válidas en el archivo CSV.',
      );
    }

    const normalizedHeaders = headers.map((h) =>
      h
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim(),
    );

    let insertedCount = 0;

    if (validModulo === 'instrumentacion') {
      const getColVal = (row: string[], pattern: RegExp) => {
        const idx = normalizedHeaders.findIndex((h) => pattern.test(h));
        return idx !== -1 ? row[idx] : undefined;
      };

      const startItem =
        (await this.prisma.avanceInstrumentacion.count({
          where: { proyectoId: projectId },
        })) + 1;

      const dataToInsert = rows.map((row, idx) => {
        const rawItem = getColVal(row, /^item$/i);
        const item = rawItem ? parseInt(rawItem, 10) : startItem + idx;
        const tag = getColVal(row, /^tag$/i) || `TAG-${item}`;
        return {
          proyectoId: projectId,
          item: isNaN(item) ? startItem + idx : item,
          tipoVariable: getColVal(row, /variable|tipo/i) || 'NIVEL',
          equipoAsoc: getColVal(row, /equipo/i) || '',
          tag,
          servicioSuple: getColVal(row, /servicio/i) || '',
          ubicacion: getColVal(row, /ubicacion/i) || 'NIVEL 0',
          instaladoPlanta: '0',
          cableado: '0',
          cantidadCable: 0,
          peinadoCinchado: '0',
          conexionPlanta: '0',
          conexionTablero: '0',
          pruebas: '0',
          nota: getColVal(row, /nota/i) || null,
        };
      });

      if (dataToInsert.length > 0) {
        const res = await this.prisma.avanceInstrumentacion.createMany({
          data: dataToInsert,
        });
        insertedCount = res.count;
      }
    } else if (validModulo === 'valvulas') {
      const getColVal = (row: string[], pattern: RegExp) => {
        const idx = normalizedHeaders.findIndex((h) => pattern.test(h));
        return idx !== -1 ? row[idx] : undefined;
      };

      const startItem =
        (await this.prisma.avanceValvula.count({
          where: { proyectoId: projectId },
        })) + 1;

      const dataToInsert = rows.map((row, idx) => {
        const rawItem = getColVal(row, /^item$/i);
        const item = rawItem ? parseInt(rawItem, 10) : startItem + idx;
        const tag = getColVal(row, /^tag$/i) || `VALV-${item}`;
        return {
          proyectoId: projectId,
          item: isNaN(item) ? startItem + idx : item,
          tag,
          servicioCumple: getColVal(row, /servicio/i) || '',
          funcionamiento: getColVal(row, /funcionamiento/i) || 'Manual',
          tipoValvula: getColVal(row, /tipo/i) || 'Bola',
          ubicacion: getColVal(row, /ubicacion/i) || 'Nivel 0',
          falla: getColVal(row, /falla/i) || '-',
          notaAdmin: getColVal(row, /nota/i) || null,
          cableadoNeum: '0',
          cableNeumInstal: 0,
          peinadoNeum: '0',
          conectorRapido: 'Pendiente',
          conexionPlantaNeum: '0',
          conexionManifold: '0',
          pruebasNeum: '0',
          notasNeum: null,
          cableadoCtrl: '0',
          cableCtrlInstal: '0',
          peinadoCtrl: '0',
          sensorPosicion: 'Pendiente',
          conexionPlantaCtrl: '0',
          conexionTableroCtrl: '0',
          comisionamiento: '0',
          notasCtrl: null,
        };
      });

      if (dataToInsert.length > 0) {
        const res = await this.prisma.avanceValvula.createMany({
          data: dataToInsert,
        });
        insertedCount = res.count;
      }
    } else if (validModulo === 'motor') {
      const getColVal = (row: string[], pattern: RegExp) => {
        const idx = normalizedHeaders.findIndex((h) => pattern.test(h));
        return idx !== -1 ? row[idx] : undefined;
      };

      const startCount = await this.prisma.avanceMotor.count({
        where: { proyectoId: projectId },
      });

      const dataToInsert = rows.map((row, idx) => {
        const part = getColVal(row, /^part$/i) || `${startCount + idx + 1}`;
        const tag = getColVal(row, /^tag$/i) || `MOT-${part}`;
        return {
          proyectoId: projectId,
          part,
          tag,
          description: getColVal(row, /desc/i) || '',
          operatingMode: getColVal(row, /operat|modo/i) || 'ATP',
          voltage: getColVal(row, /volt/i) || '440',
          hp: getColVal(row, /^hp$/i) || '1',
          phases: getColVal(row, /phase|fase/i) || '3',
          ubicacion: getColVal(row, /ubicacion/i) || 'Nivel 0',
          tamanoCable: getColVal(row, /tamano/i) || '3X10AWG',
          cableado: '0',
          cantidadCable: 0,
          peinadoCinchado: '0',
          pruebasAislMotor: '0',
          pruebasAislCirc: '0',
          conexionMotor: '0',
          conexionCcm: '0',
          motorSoloRun: '0',
          notas: null,
        };
      });

      if (dataToInsert.length > 0) {
        const res = await this.prisma.avanceMotor.createMany({
          data: dataToInsert,
        });
        insertedCount = res.count;
      }
    }

    return { success: true, count: insertedCount, modulo: validModulo };
  }

  /**
   * Genera el contenido de una plantilla CSV con los encabezados y 1 fila de ejemplo.
   */
  generateCsvTemplate(modulo: string): { filename: string; content: string } {
    const validModulo = this.normalizeModulo(modulo);
    if (validModulo === 'instrumentacion') {
      const headers = [
        'Item',
        'Tipo de Variable',
        'Equipo Asociado',
        'Tag',
        'Servicio que Suple',
        'Ubicacion',
        'Nota',
      ];
      const sample = [
        '1',
        'NIVEL',
        'RA01',
        'LI001',
        'Sensor Radar de nivel continuo',
        'NIVEL 1',
        'Opcional',
      ];
      return {
        filename: 'Plantilla_Instrumentacion.csv',
        content: `${headers.join(',')}\n${sample.join(',')}\n`,
      };
    } else if (validModulo === 'valvulas') {
      const headers = [
        'ITEM',
        'TAG',
        'Servicio que Cumple',
        'Funcionamiento',
        'Tipo de Valvula',
        'Ubicacion',
        'Falla',
        'Nota',
      ];
      const sample = [
        '1',
        'GOS01',
        'Carga a recibidores',
        'Manual',
        'Bola',
        'Nivel 0',
        '-',
        'Con sensor de posicion',
      ];
      return {
        filename: 'Plantilla_Valvulas.csv',
        content: `${headers.join(',')}\n${sample.join(',')}\n`,
      };
    } else {
      const headers = [
        'Part',
        'TAG',
        'Description',
        'Operating Mode',
        'Voltage',
        'HP',
        'Phases',
        'Ubicacion',
        'Tamano Cable',
      ];
      const sample = [
        '0.1',
        'PA14001',
        'CHARGING PUMP',
        'ATP',
        '440',
        '5',
        '3',
        'Nivel 0',
        '3X10AWG',
      ];
      return {
        filename: 'Plantilla_Motor.csv',
        content: `${headers.join(',')}\n${sample.join(',')}\n`,
      };
    }
  }

  /**
   * Carga manual bajo demanda de los datos del Excel de ejemplo (para facilitar testing del Administrador).
   */
  async loadSampleSeed(
    projectId: string,
    modulo: string,
    user: { id: string; rol: Rol },
  ) {
    if (user.rol !== Rol.administrador) {
      throw new ForbiddenException(
        'Solo el administrador puede cargar los datos de ejemplo.',
      );
    }
    const validModulo = this.normalizeModulo(modulo);
    await this.checkProjectNotCulminated(projectId);
    await this.ensureInitialSeed(projectId, validModulo);
    return {
      success: true,
      message: `Datos de ejemplo cargados exitosamente para ${validModulo}`,
    };
  }

  private parseCsv(text: string): { headers: string[]; rows: string[][] } {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const firstLine = lines[0];
    const delimiter =
      firstLine.includes(';') &&
      (firstLine.match(/;/g)?.length || 0) >
        (firstLine.match(/,/g)?.length || 0)
        ? ';'
        : ',';

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine);
    return { headers, rows };
  }

  private async checkProjectNotCulminated(projectId: string) {
    const project = await this.prisma.proyecto.findUnique({
      where: { id: projectId },
      select: { fechaCulminacion: true },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    if (project.fechaCulminacion) {
      throw new BadRequestException(
        'El proyecto ha sido culminado y se encuentra en modo solo lectura.',
      );
    }
  }

  /**
   * Actualiza una fila de la pestaña especializada.
   * Supervisores SOLO pueden actualizar columnas naranjas.
   * Administradores pueden actualizar cualquier columna.
   * Registra auditoría celda por celda.
   */
  async updateRow(
    projectId: string,
    modulo: string,
    rowId: string,
    updates: Record<string, any>,
    user: { id: string; nombre?: string; rol: Rol },
  ) {
    const validModulo = this.normalizeModulo(modulo);

    let userNombre = user.nombre;
    if (!userNombre) {
      const u = await this.prisma.usuario.findUnique({
        where: { id: user.id },
        select: { nombre: true },
      });
      userNombre = u?.nombre || 'Usuario';
    }

    // Validar culminación del proyecto
    const project = await this.prisma.proyecto.findUnique({
      where: { id: projectId },
      select: { fechaCulminacion: true },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    if (project.fechaCulminacion) {
      throw new BadRequestException(
        'El proyecto ha sido culminado y se encuentra en modo solo lectura.',
      );
    }

    // Validar columnas si el usuario es supervisor
    const allowedOrangeCols = ORANGE_COLUMNS[validModulo] || [];
    if (user.rol === Rol.supervisor) {
      for (const key of Object.keys(updates)) {
        if (!allowedOrangeCols.includes(key)) {
          throw new ForbiddenException(
            `Los supervisores solo tienen autorización para modificar columnas de avance (naranjas). La columna '${key}' es de administración técnica.`,
          );
        }
      }
    }

    // Obtener la fila existente
    let existingRow: any = null;
    if (validModulo === 'instrumentacion') {
      existingRow = await this.prisma.avanceInstrumentacion.findUnique({
        where: { id: rowId },
      });
    } else if (validModulo === 'valvulas') {
      existingRow = await this.prisma.avanceValvula.findUnique({
        where: { id: rowId },
      });
    } else if (validModulo === 'motor') {
      existingRow = await this.prisma.avanceMotor.findUnique({
        where: { id: rowId },
      });
    }

    if (!existingRow || existingRow.proyectoId !== projectId) {
      throw new NotFoundException(
        'Fila de avance no encontrada en este proyecto',
      );
    }

    // Actualizar celdasAudit y generar registros inmutables de auditoría
    const currentAudit: Record<string, any> =
      (existingRow.celdasAudit as Record<string, any>) || {};
    const nowIso = new Date().toISOString();
    const auditLogsToCreate: any[] = [];

    const sanitizedData: Record<string, any> = {};

    for (const [colKey, rawVal] of Object.entries(updates)) {
      if (
        colKey === 'id' ||
        colKey === 'proyectoId' ||
        colKey === 'celdasAudit'
      )
        continue;

      let val = rawVal;
      // Convertir a número si la columna es numérica (ej: cantidadCable)
      if (
        (colKey === 'cantidadCable' || colKey === 'cableNeumInstal') &&
        val !== null &&
        val !== undefined
      ) {
        val = parseFloat(val) || 0;
      }

      sanitizedData[colKey] = val;

      const prevValStr = String(existingRow[colKey] ?? '');
      const newValStr = String(val ?? '');

      if (prevValStr !== newValStr) {
        // Actualizar caché de última edición
        currentAudit[colKey] = {
          usuarioId: user.id,
          usuarioNombre: userNombre,
          fechaEdicion: nowIso,
        };

        // Guardar log inmutable
        auditLogsToCreate.push({
          modulo: validModulo,
          filaId: rowId,
          columna: colKey,
          valorAnterior: prevValStr,
          valorNuevo: newValStr,
          usuarioId: user.id,
        });
      }
    }

    sanitizedData.celdasAudit = currentAudit;

    // Ejecutar actualización
    let updatedRow: any = null;
    if (validModulo === 'instrumentacion') {
      updatedRow = await this.prisma.avanceInstrumentacion.update({
        where: { id: rowId },
        data: sanitizedData,
      });
    } else if (validModulo === 'valvulas') {
      updatedRow = await this.prisma.avanceValvula.update({
        where: { id: rowId },
        data: sanitizedData,
      });
    } else if (validModulo === 'motor') {
      updatedRow = await this.prisma.avanceMotor.update({
        where: { id: rowId },
        data: sanitizedData,
      });
    }

    // Insertar logs de auditoría en background o transacción
    if (auditLogsToCreate.length > 0) {
      await this.prisma.avanceCeldaAuditoria.createMany({
        data: auditLogsToCreate,
      });
    }

    // Suprimir celdasAudit si no es admin
    if (user.rol !== Rol.administrador) {
      const { celdasAudit, ...rest } = updatedRow;
      return rest;
    }

    return updatedRow;
  }

  /**
   * Actualización por lote (útil para el guardado de la tabla editable).
   */
  async batchUpdate(
    projectId: string,
    modulo: string,
    rowsUpdates: Array<{ rowId: string; updates: Record<string, any> }>,
    user: { id: string; nombre?: string; rol: Rol },
  ) {
    const results = [];
    for (const item of rowsUpdates) {
      const updated = await this.updateRow(
        projectId,
        modulo,
        item.rowId,
        item.updates,
        user,
      );
      results.push(updated);
    }
    return { success: true, updatedCount: results.length };
  }

  /**
   * Genera el archivo Excel estilizado respetando headers negros/naranjas
   * y agregando columnas de auditoría únicamente para Administradores.
   */
  async exportToExcel(
    projectId: string,
    modulo: string,
    user: { id: string; rol: Rol },
  ): Promise<Buffer> {
    const validModulo = this.normalizeModulo(modulo);
    const { rows } = await this.getRows(projectId, validModulo, {
      id: user.id,
      rol: Rol.administrador, // Obtenemos con auditoría interna para evaluarla
    });

    const workbook = new ExcelJS.Workbook();
    const sheetTitle =
      validModulo === 'instrumentacion'
        ? 'INSTRUMENTACION'
        : validModulo === 'valvulas'
          ? 'VALVULAS'
          : 'MOTOR';
    const worksheet = workbook.addWorksheet(sheetTitle);

    const isAdmin = user.rol === Rol.administrador;

    if (validModulo === 'instrumentacion') {
      this.buildInstrumentacionExcel(worksheet, rows, isAdmin);
    } else if (validModulo === 'valvulas') {
      this.buildValvulasExcel(worksheet, rows, isAdmin);
    } else if (validModulo === 'motor') {
      this.buildMotorExcel(worksheet, rows, isAdmin);
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  private normalizeModulo(m: string): 'instrumentacion' | 'valvulas' | 'motor' {
    const lower = (m || '').toLowerCase().trim();
    if (lower.includes('instru')) return 'instrumentacion';
    if (lower.includes('valv')) return 'valvulas';
    if (lower.includes('motor')) return 'motor';
    throw new BadRequestException(
      `Módulo inválido: '${m}'. Opciones permitidas: 'instrumentacion', 'valvulas', 'motor'`,
    );
  }

  // --- Constructores de Excel con estilo corporativo ---

  private buildInstrumentacionExcel(
    ws: ExcelJS.Worksheet,
    rows: any[],
    isAdmin: boolean,
  ) {
    // Encabezado Fila 1: Grupos
    const adminColCount = 6;
    const supervisorColCount = 8;

    // Fila 1: Super Headers
    ws.mergeCells(1, 1, 1, adminColCount);
    const superAdmin = ws.getCell(1, 1);
    superAdmin.value =
      'INFORMACIÓN QUE SUBE EL ADMINISTRADOR AL INICIO DEL PROYECTO';
    this.applyHeaderStyle(superAdmin, '1C1C1A', 'FFFFFF');

    const supColStart = adminColCount + 1;
    const totalCols = isAdmin
      ? adminColCount + supervisorColCount * 2
      : adminColCount + supervisorColCount;
    ws.mergeCells(1, supColStart, 1, totalCols);
    const superSup = ws.getCell(1, supColStart);
    superSup.value = 'INFORMACIÓN QUE VA INTRODUCIENDO EL SUPERVISOR EN PLANTA';
    this.applyHeaderStyle(superSup, 'C55A11', 'FFFFFF');

    // Fila 2: Columnas
    const headers = [
      { key: 'item', label: 'Item', isOrange: false },
      { key: 'tipoVariable', label: 'Tipo de VARIABLE', isOrange: false },
      {
        key: 'equipoAsoc',
        label: 'Equipo asociado al Instrumento',
        isOrange: false,
      },
      { key: 'tag', label: 'Tag', isOrange: false },
      { key: 'servicioSuple', label: 'Servicio que suple', isOrange: false },
      { key: 'ubicacion', label: 'Ubicación', isOrange: false },
      { key: 'instaladoPlanta', label: 'instalado en Planta', isOrange: true },
      { key: 'cableado', label: 'CABLEADO', isOrange: true },
      { key: 'cantidadCable', label: 'Cantidad de Cable [m]', isOrange: true },
      { key: 'peinadoCinchado', label: 'Peinado y Cinchado', isOrange: true },
      {
        key: 'conexionPlanta',
        label: 'CONEXIÓN y etiquetado en planta',
        isOrange: true,
      },
      {
        key: 'conexionTablero',
        label: 'CONEXIÓN y etiquetado en tablero',
        isOrange: true,
      },
      { key: 'pruebas', label: 'PRUEBAs', isOrange: true },
      { key: 'nota', label: 'Nota', isOrange: true },
    ];

    let cIdx = 1;
    for (const h of headers) {
      const cell = ws.getCell(2, cIdx);
      cell.value = h.label;
      this.applyHeaderStyle(cell, h.isOrange ? 'E97132' : '2E2E2C', 'FFFFFF');
      cIdx++;

      if (h.isOrange && isAdmin) {
        const auditCell = ws.getCell(2, cIdx);
        auditCell.value = `${h.label} (Auditoría)`;
        this.applyHeaderStyle(auditCell, '5F5E5A', 'FFFFFF');
        cIdx++;
      }
    }

    // Datos
    let rIdx = 3;
    for (const r of rows) {
      cIdx = 1;
      const audit = (r.celdasAudit as Record<string, any>) || {};
      for (const h of headers) {
        const cell = ws.getCell(rIdx, cIdx);
        cell.value = r[h.key] ?? '';
        this.applyDataBorders(cell);
        cIdx++;

        if (h.isOrange && isAdmin) {
          const auditCell = ws.getCell(rIdx, cIdx);
          const colAudit = audit[h.key];
          auditCell.value = colAudit
            ? `${colAudit.usuarioNombre || 'Usuario'} - ${new Date(colAudit.fechaEdicion).toLocaleDateString()} ${new Date(colAudit.fechaEdicion).toLocaleTimeString()}`
            : 'Sin modif.';
          this.applyDataBorders(auditCell);
          auditCell.font = { italic: true, size: 9, color: { argb: '71717A' } };
          cIdx++;
        }
      }
      rIdx++;
    }

    this.autoFitColumns(ws);
  }

  private buildValvulasExcel(
    ws: ExcelJS.Worksheet,
    rows: any[],
    isAdmin: boolean,
  ) {
    // Fila 1: Super Headers
    ws.mergeCells(1, 1, 1, 8);
    const superAdmin = ws.getCell(1, 1);
    superAdmin.value =
      'DATOS QUE DEBE CONTENER LA TABLA QUE VA A SUBIR EL ADMINISTRADOR';
    this.applyHeaderStyle(superAdmin, '1C1C1A', 'FFFFFF');

    const totalSupCols = isAdmin ? 16 * 2 : 16;
    ws.mergeCells(1, 9, 1, 8 + totalSupCols);
    const superSup = ws.getCell(1, 9);
    superSup.value = 'INFORMACIÓN QUE VA A LLENAR EL SUPERVISOR EN PLANTA';
    this.applyHeaderStyle(superSup, 'C55A11', 'FFFFFF');

    const headers = [
      { key: 'item', label: 'ITEM', isOrange: false },
      { key: 'tag', label: 'TAG', isOrange: false },
      { key: 'servicioCumple', label: 'Servicio que cumple', isOrange: false },
      {
        key: 'funcionamiento',
        label: 'FUNCIONAMIENTO DE VALVULA',
        isOrange: false,
      },
      { key: 'tipoValvula', label: 'Tipo DE VALVULA', isOrange: false },
      { key: 'ubicacion', label: 'UBICACIÓN', isOrange: false },
      { key: 'falla', label: 'FALLA', isOrange: false },
      { key: 'notaAdmin', label: 'Nota', isOrange: false },
      // Neumática
      {
        key: 'cableadoNeum',
        label: 'CABLEADO NEUMATICO (tubing/manguera)',
        isOrange: true,
      },
      {
        key: 'cableNeumInstal',
        label: 'Cable NEUMATICO (tubing) Instalado [m]',
        isOrange: true,
      },
      { key: 'peinadoNeum', label: 'pinado y cinchado', isOrange: true },
      { key: 'conectorRapido', label: 'Conector Rápido', isOrange: true },
      {
        key: 'conexionPlantaNeum',
        label: 'CONEXIÓN y etiquetado EN PLANTA',
        isOrange: true,
      },
      {
        key: 'conexionManifold',
        label: 'CONEXIÓN y etiquetado MANINFOLD',
        isOrange: true,
      },
      { key: 'pruebasNeum', label: 'PRUEBAS', isOrange: true },
      { key: 'notasNeum', label: 'NOTAS (Neum)', isOrange: true },
      // Control
      { key: 'cableadoCtrl', label: 'CABLEADO (Ctrl)', isOrange: true },
      { key: 'cableCtrlInstal', label: 'Cable instalado [m]', isOrange: true },
      {
        key: 'peinadoCtrl',
        label: 'Peinado y Cinchado de cable',
        isOrange: true,
      },
      { key: 'sensorPosicion', label: 'Sensor de posición', isOrange: true },
      {
        key: 'conexionPlantaCtrl',
        label: 'CONEXIÓN Y ETIQUETADO EN PLANTA (Ctrl)',
        isOrange: true,
      },
      {
        key: 'conexionTableroCtrl',
        label: 'CONEXIÓN Y ETIQUETADO EN TABLERO',
        isOrange: true,
      },
      { key: 'comisionamiento', label: 'COMISIONAMIENTO', isOrange: true },
      { key: 'notasCtrl', label: 'NOTAS (Ctrl)', isOrange: true },
    ];

    let cIdx = 1;
    for (const h of headers) {
      const cell = ws.getCell(2, cIdx);
      cell.value = h.label;
      this.applyHeaderStyle(cell, h.isOrange ? 'E97132' : '2E2E2C', 'FFFFFF');
      cIdx++;

      if (h.isOrange && isAdmin) {
        const auditCell = ws.getCell(2, cIdx);
        auditCell.value = `${h.label} (Auditoría)`;
        this.applyHeaderStyle(auditCell, '5F5E5A', 'FFFFFF');
        cIdx++;
      }
    }

    let rIdx = 3;
    for (const r of rows) {
      cIdx = 1;
      const audit = (r.celdasAudit as Record<string, any>) || {};
      for (const h of headers) {
        const cell = ws.getCell(rIdx, cIdx);
        cell.value = r[h.key] ?? '';
        this.applyDataBorders(cell);
        cIdx++;

        if (h.isOrange && isAdmin) {
          const auditCell = ws.getCell(rIdx, cIdx);
          const colAudit = audit[h.key];
          auditCell.value = colAudit
            ? `${colAudit.usuarioNombre || 'Usuario'} - ${new Date(colAudit.fechaEdicion).toLocaleDateString()} ${new Date(colAudit.fechaEdicion).toLocaleTimeString()}`
            : 'Sin modif.';
          this.applyDataBorders(auditCell);
          auditCell.font = { italic: true, size: 9, color: { argb: '71717A' } };
          cIdx++;
        }
      }
      rIdx++;
    }

    this.autoFitColumns(ws);
  }

  private buildMotorExcel(
    ws: ExcelJS.Worksheet,
    rows: any[],
    isAdmin: boolean,
  ) {
    ws.mergeCells(1, 1, 1, 9);
    const superAdmin = ws.getCell(1, 1);
    superAdmin.value =
      'DATOS QUE DEBE CONTENER LA TABLA QUE VA A SUBIR EL ADMINISTRADOR';
    this.applyHeaderStyle(superAdmin, '1C1C1A', 'FFFFFF');

    const totalSupCols = isAdmin ? 9 * 2 : 9;
    ws.mergeCells(1, 10, 1, 9 + totalSupCols);
    const superSup = ws.getCell(1, 10);
    superSup.value = 'Información que debe ir llenando el supervisor en planta';
    this.applyHeaderStyle(superSup, 'C55A11', 'FFFFFF');

    const headers = [
      { key: 'part', label: 'Part', isOrange: false },
      { key: 'tag', label: 'TAG', isOrange: false },
      { key: 'description', label: 'DESCRIPTION', isOrange: false },
      { key: 'operatingMode', label: 'OPERATING MODE', isOrange: false },
      { key: 'voltage', label: 'VOLTAGE', isOrange: false },
      { key: 'hp', label: 'HP', isOrange: false },
      { key: 'phases', label: 'PHASES', isOrange: false },
      { key: 'ubicacion', label: 'Ubicación', isOrange: false },
      { key: 'tamanoCable', label: 'TAMAÑ. CABLE', isOrange: false },
      { key: 'cableado', label: 'CABLEADO', isOrange: true },
      { key: 'cantidadCable', label: 'Cantidad de cable (m)', isOrange: true },
      { key: 'peinadoCinchado', label: 'Peinado y cinchado', isOrange: true },
      {
        key: 'pruebasAislMotor',
        label: 'PRUEBAS AISLAMIENTO MOTOR',
        isOrange: true,
      },
      {
        key: 'pruebasAislCirc',
        label: 'PRUEBAS AISLAMIENTO CIRCUITO',
        isOrange: true,
      },
      {
        key: 'conexionMotor',
        label: 'CONEXIÓN y etiquetado motor',
        isOrange: true,
      },
      {
        key: 'conexionCcm',
        label: 'CONEXIÓN Y ETIQUETADO CCM',
        isOrange: true,
      },
      { key: 'motorSoloRun', label: 'MOTOR SOLO-RUN', isOrange: true },
      { key: 'notas', label: 'NOTAS', isOrange: true },
    ];

    let cIdx = 1;
    for (const h of headers) {
      const cell = ws.getCell(2, cIdx);
      cell.value = h.label;
      this.applyHeaderStyle(cell, h.isOrange ? 'E97132' : '2E2E2C', 'FFFFFF');
      cIdx++;

      if (h.isOrange && isAdmin) {
        const auditCell = ws.getCell(2, cIdx);
        auditCell.value = `${h.label} (Auditoría)`;
        this.applyHeaderStyle(auditCell, '5F5E5A', 'FFFFFF');
        cIdx++;
      }
    }

    let rIdx = 3;
    for (const r of rows) {
      cIdx = 1;
      const audit = (r.celdasAudit as Record<string, any>) || {};
      for (const h of headers) {
        const cell = ws.getCell(rIdx, cIdx);
        cell.value = r[h.key] ?? '';
        this.applyDataBorders(cell);
        cIdx++;

        if (h.isOrange && isAdmin) {
          const auditCell = ws.getCell(rIdx, cIdx);
          const colAudit = audit[h.key];
          auditCell.value = colAudit
            ? `${colAudit.usuarioNombre || 'Usuario'} - ${new Date(colAudit.fechaEdicion).toLocaleDateString()} ${new Date(colAudit.fechaEdicion).toLocaleTimeString()}`
            : 'Sin modif.';
          this.applyDataBorders(auditCell);
          auditCell.font = { italic: true, size: 9, color: { argb: '71717A' } };
          cIdx++;
        }
      }
      rIdx++;
    }

    this.autoFitColumns(ws);
  }

  private applyHeaderStyle(
    cell: ExcelJS.Cell,
    bgColor: string,
    fgColor: string,
  ) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF' + bgColor },
    };
    cell.font = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: { argb: 'FF' + fgColor },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      right: { style: 'thin', color: { argb: 'FFB0B0B0' } },
    };
  }

  private applyDataBorders(cell: ExcelJS.Cell) {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  }

  private autoFitColumns(ws: ExcelJS.Worksheet) {
    ws.columns.forEach((column) => {
      let maxLen = 12;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const val = cell.value ? cell.value.toString() : '';
        maxLen = Math.max(maxLen, Math.min(val.length + 3, 40));
      });
      column.width = maxLen;
    });
  }

  // --- Seeder inicial desde docs/Tabla de Avances.xlsx ---

  private async ensureInitialSeed(
    projectId: string,
    modulo: 'instrumentacion' | 'valvulas' | 'motor',
  ) {
    try {
      if (modulo === 'instrumentacion') {
        const count = await this.prisma.avanceInstrumentacion.count({
          where: { proyectoId: projectId },
        });
        if (count > 0) return;
      } else if (modulo === 'valvulas') {
        const count = await this.prisma.avanceValvula.count({
          where: { proyectoId: projectId },
        });
        if (count > 0) return;
      } else if (modulo === 'motor') {
        const count = await this.prisma.avanceMotor.count({
          where: { proyectoId: projectId },
        });
        if (count > 0) return;
      }

      // Buscar archivo excel
      const candidates = [
        path.resolve(process.cwd(), 'docs/Tabla de Avances.xlsx'),
        path.resolve(process.cwd(), '../../docs/Tabla de Avances.xlsx'),
        path.resolve(__dirname, '../../../docs/Tabla de Avances.xlsx'),
      ];
      const excelPath = candidates.find((p) => fs.existsSync(p));
      if (!excelPath) {
        this.logger.warn(
          `No se encontró docs/Tabla de Avances.xlsx para auto-seed en ${projectId}`,
        );
        return;
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);

      if (modulo === 'instrumentacion') {
        const ws =
          workbook.getWorksheet('INSTRUMENTACIÓN') ||
          workbook.getWorksheet('INSTRUMENTACION');
        if (ws) {
          const rowsToInsert: any[] = [];
          for (let r = 5; r <= ws.rowCount; r++) {
            const itemVal = ws.getCell(r, 2).text?.trim(); // Col B
            const tagVal = ws.getCell(r, 5).text?.trim(); // Col E
            if (!itemVal && !tagVal) continue;

            const item = parseInt(itemVal) || r - 4;
            const tipoVariable = ws.getCell(r, 3).text?.trim() || 'NIVEL';
            const equipoAsoc = ws.getCell(r, 4).text?.trim() || '';
            const tag = tagVal || `TAG-${item}`;
            const cant = parseInt(ws.getCell(r, 6).text?.trim()) || 1;
            const servicioSuple = ws.getCell(r, 7).text?.trim() || '';
            const ubicacion = ws.getCell(r, 8).text?.trim() || 'NIVEL 0';
            const evk = ws.getCell(r, 9).text?.trim() || '';

            // Supervisor inicial
            const instaladoPlanta = ws.getCell(r, 10).text?.trim() || '0';
            const cableado = ws.getCell(r, 11).text?.trim() || '0';
            const cantidadCable =
              parseFloat(ws.getCell(r, 12).text?.trim()) || 0;
            const peinadoCinchado = ws.getCell(r, 13).text?.trim() || '0';
            const conexionPlanta = ws.getCell(r, 14).text?.trim() || '0';
            const conexionTablero = ws.getCell(r, 15).text?.trim() || '0';
            const pruebas = ws.getCell(r, 16).text?.trim() || '0';
            const nota = ws.getCell(r, 17).text?.trim() || '';

            rowsToInsert.push({
              proyectoId: projectId,
              item,
              tipoVariable,
              equipoAsoc,
              tag,
              servicioSuple,
              ubicacion,
              instaladoPlanta,
              cableado,
              cantidadCable,
              peinadoCinchado,
              conexionPlanta,
              conexionTablero,
              pruebas,
              nota,
            });
          }

          if (rowsToInsert.length > 0) {
            await this.prisma.avanceInstrumentacion.createMany({
              data: rowsToInsert,
            });
            this.logger.log(
              `Se sembraron ${rowsToInsert.length} filas en AvanceInstrumentacion para proyecto ${projectId}`,
            );
          }
        }
      } else if (modulo === 'valvulas') {
        const ws = workbook.getWorksheet('VALVULAS');
        if (ws) {
          const rowsToInsert: any[] = [];
          for (let r = 5; r <= ws.rowCount; r++) {
            const itemVal = ws.getCell(r, 2).text?.trim(); // Col B
            const tagVal = ws.getCell(r, 3).text?.trim(); // Col C
            if (!itemVal && !tagVal) continue;

            const item = parseInt(itemVal) || r - 4;
            const tag = tagVal || `VALV-${item}`;
            const servicioCumple = ws.getCell(r, 4).text?.trim() || '';
            const funcionamiento = ws.getCell(r, 5).text?.trim() || 'Manual';
            const tipoValvula = ws.getCell(r, 6).text?.trim() || 'Bola';
            const ubicacion = ws.getCell(r, 7).text?.trim() || 'Nivel 0';
            const falla = ws.getCell(r, 8).text?.trim() || '-';
            const notaAdmin = ws.getCell(r, 9).text?.trim() || '';

            // Neumática (J..P -> cols 10..16)
            const cableadoNeum = ws.getCell(r, 10).text?.trim() || '0';
            const cableNeumInstal =
              parseFloat(ws.getCell(r, 11).text?.trim()) || 0;
            const peinadoNeum = ws.getCell(r, 12).text?.trim() || '0';
            const conexionPlantaNeum = ws.getCell(r, 13).text?.trim() || '0';
            const conexionManifold = ws.getCell(r, 14).text?.trim() || '0';
            const pruebasNeum = ws.getCell(r, 15).text?.trim() || '0';
            const notasNeum = ws.getCell(r, 16).text?.trim() || '';

            // Control (R..Y -> cols 18..25)
            const cableadoCtrl = ws.getCell(r, 18).text?.trim() || '0';
            const cableCtrlInstal = ws.getCell(r, 19).text?.trim() || '0';
            const peinadoCtrl = ws.getCell(r, 20).text?.trim() || '0';
            const conexionPlantaCtrl = ws.getCell(r, 21).text?.trim() || '0';
            const conexionTableroCtrl = ws.getCell(r, 22).text?.trim() || '0';
            // En plantillas previas la col 23 era comisioning y col 24 comisionamiento; unificamos en comisionamiento
            const rawCol23 = ws.getCell(r, 23).text?.trim() || '0';
            const rawCol24 = ws.getCell(r, 24).text?.trim() || '0';
            const comisionamiento =
              rawCol24 !== '0' && rawCol24 !== '' ? rawCol24 : rawCol23;
            const notasCtrl = ws.getCell(r, 25).text?.trim() || '';

            rowsToInsert.push({
              proyectoId: projectId,
              item,
              tag,
              servicioCumple,
              funcionamiento,
              tipoValvula,
              ubicacion,
              falla,
              notaAdmin,
              cableadoNeum,
              cableNeumInstal,
              peinadoNeum,
              conectorRapido: 'Pendiente',
              conexionPlantaNeum,
              conexionManifold,
              pruebasNeum,
              notasNeum,
              cableadoCtrl,
              cableCtrlInstal,
              peinadoCtrl,
              sensorPosicion: 'Pendiente',
              conexionPlantaCtrl,
              conexionTableroCtrl,
              comisionamiento,
              notasCtrl,
            });
          }

          if (rowsToInsert.length > 0) {
            await this.prisma.avanceValvula.createMany({ data: rowsToInsert });
            this.logger.log(
              `Se sembraron ${rowsToInsert.length} filas en AvanceValvula para proyecto ${projectId}`,
            );
          }
        }
      } else if (modulo === 'motor') {
        const ws = workbook.getWorksheet('MOTOR');
        if (ws) {
          const rowsToInsert: any[] = [];
          for (let r = 10; r <= ws.rowCount; r++) {
            const partVal = ws.getCell(r, 1).text?.trim(); // Col A
            const tagVal = ws.getCell(r, 2).text?.trim(); // Col B
            if (!partVal && !tagVal) continue;

            const part = partVal || `${r - 9}`;
            const tag = tagVal || `MOT-${part}`;
            const description = ws.getCell(r, 3).text?.trim() || '';
            const operatingMode = ws.getCell(r, 4).text?.trim() || 'ATP';
            const voltage = ws.getCell(r, 5).text?.trim() || '440';
            const hp = ws.getCell(r, 6).text?.trim() || '1';
            const phases = ws.getCell(r, 7).text?.trim() || '3';
            const flaCurrent = ws.getCell(r, 8).text?.trim() || '0';
            const fla125Current = ws.getCell(r, 9).text?.trim() || '0';
            const temperatureFactor = ws.getCell(r, 10).text?.trim() || '0.82';
            const groupingFactor = ws.getCell(r, 11).text?.trim() || '1';
            const wiresPerPhase = ws.getCell(r, 12).text?.trim() || '1';
            const voltageLossFactor = ws.getCell(r, 13).text?.trim() || '-';
            const cableLengthMts = ws.getCell(r, 14).text?.trim() || '-';
            const voltageLossPct = ws.getCell(r, 15).text?.trim() || '-';
            const wireGauge = ws.getCell(r, 16).text?.trim() || '-';
            const groundWireGauge = ws.getCell(r, 17).text?.trim() || '-';
            const ubicacion = ws.getCell(r, 18).text?.trim() || 'Nivel 0';
            const tamanoCable = ws.getCell(r, 19).text?.trim() || '3X10AWG';

            // Supervisor (T..AB -> cols 20..28)
            const cableado = ws.getCell(r, 20).text?.trim() || '0';
            const cantidadCable =
              parseFloat(ws.getCell(r, 21).text?.trim()) || 0;
            const peinadoCinchado = ws.getCell(r, 22).text?.trim() || '0';
            const pruebasAislMotor = ws.getCell(r, 23).text?.trim() || '0';
            const pruebasAislCirc = ws.getCell(r, 24).text?.trim() || '0';
            const conexionMotor = ws.getCell(r, 25).text?.trim() || '0';
            const conexionCcm = ws.getCell(r, 26).text?.trim() || '0';
            const motorSoloRun = ws.getCell(r, 27).text?.trim() || '0';
            const notas = ws.getCell(r, 28).text?.trim() || '';

            rowsToInsert.push({
              proyectoId: projectId,
              part,
              tag,
              description,
              operatingMode,
              voltage,
              hp,
              phases,
              ubicacion,
              tamanoCable,
              cableado,
              cantidadCable,
              peinadoCinchado,
              pruebasAislMotor,
              pruebasAislCirc,
              conexionMotor,
              conexionCcm,
              motorSoloRun,
              notas,
            });
          }

          if (rowsToInsert.length > 0) {
            await this.prisma.avanceMotor.createMany({ data: rowsToInsert });
            this.logger.log(
              `Se sembraron ${rowsToInsert.length} filas en AvanceMotor para proyecto ${projectId}`,
            );
          }
        }
      }
    } catch (err) {
      this.logger.error(`Error en ensureInitialSeed para ${modulo}:`, err);
    }
  }
}
