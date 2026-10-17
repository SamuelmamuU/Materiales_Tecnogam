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
    'conexionPlantaNeum',
    'conexionManifold',
    'pruebasNeum',
    'notasNeum',
    'cableadoCtrl',
    'cableCtrlInstal',
    'peinadoCtrl',
    'conexionPlantaCtrl',
    'conexionTableroCtrl',
    'comisioning',
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

    // Auto-seed si el proyecto no tiene registros todavía
    await this.ensureInitialSeed(projectId, validModulo);

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
      throw new NotFoundException('Fila de avance no encontrada en este proyecto');
    }

    // Actualizar celdasAudit y generar registros inmutables de auditoría
    const currentAudit: Record<string, any> = (existingRow.celdasAudit as Record<string, any>) || {};
    const nowIso = new Date().toISOString();
    const auditLogsToCreate: any[] = [];

    const sanitizedData: Record<string, any> = {};

    for (const [colKey, rawVal] of Object.entries(updates)) {
      if (colKey === 'id' || colKey === 'proyectoId' || colKey === 'celdasAudit') continue;

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
    const adminColCount = 8;
    const supervisorColCount = 8;

    // Fila 1: Super Headers
    ws.mergeCells(1, 1, 1, adminColCount);
    const superAdmin = ws.getCell(1, 1);
    superAdmin.value = 'INFORMACIÓN QUE SUBE EL ADMINISTRADOR AL INICIO DEL PROYECTO';
    this.applyHeaderStyle(superAdmin, '1C1C1A', 'FFFFFF');

    const supColStart = adminColCount + 1;
    const totalCols = isAdmin ? adminColCount + supervisorColCount * 2 : adminColCount + supervisorColCount;
    ws.mergeCells(1, supColStart, 1, totalCols);
    const superSup = ws.getCell(1, supColStart);
    superSup.value = 'INFORMACIÓN QUE VA INTRODUCIENDO EL SUPERVISOR EN PLANTA';
    this.applyHeaderStyle(superSup, 'C55A11', 'FFFFFF');

    // Fila 2: Columnas
    const headers = [
      { key: 'item', label: 'Item', isOrange: false },
      { key: 'tipoVariable', label: 'Tipo de VARIABLE', isOrange: false },
      { key: 'equipoAsoc', label: 'Equipo asociado al Instrumento', isOrange: false },
      { key: 'tag', label: 'Tag', isOrange: false },
      { key: 'cant', label: 'Cant.', isOrange: false },
      { key: 'servicioSuple', label: 'Servicio que suple', isOrange: false },
      { key: 'ubicacion', label: 'Ubicación', isOrange: false },
      { key: 'evk', label: 'EVK', isOrange: false },
      { key: 'instaladoPlanta', label: 'instalado en Planta', isOrange: true },
      { key: 'cableado', label: 'CABLEADO', isOrange: true },
      { key: 'cantidadCable', label: 'Cantidad de Cable [m]', isOrange: true },
      { key: 'peinadoCinchado', label: 'Peinado y Cinchado', isOrange: true },
      { key: 'conexionPlanta', label: 'CONEXIÓN y etiquetado en planta', isOrange: true },
      { key: 'conexionTablero', label: 'CONEXIÓN y etiquetado en tablero', isOrange: true },
      { key: 'pruebas', label: 'PRUEBAs', isOrange: true },
      { key: 'nota', label: 'Nota', isOrange: true },
    ];

    let cIdx = 1;
    for (const h of headers) {
      const cell = ws.getCell(2, cIdx);
      cell.value = h.label;
      this.applyHeaderStyle(
        cell,
        h.isOrange ? 'E97132' : '2E2E2C',
        'FFFFFF',
      );
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

  private buildValvulasExcel(ws: ExcelJS.Worksheet, rows: any[], isAdmin: boolean) {
    // Fila 1: Super Headers
    ws.mergeCells(1, 1, 1, 8);
    const superAdmin = ws.getCell(1, 1);
    superAdmin.value = 'DATOS QUE DEBE CONTENER LA TABLA QUE VA A SUBIR EL ADMINISTRADOR';
    this.applyHeaderStyle(superAdmin, '1C1C1A', 'FFFFFF');

    const totalSupCols = isAdmin ? 15 * 2 : 15;
    ws.mergeCells(1, 9, 1, 8 + totalSupCols);
    const superSup = ws.getCell(1, 9);
    superSup.value = 'INFORMACIÓN QUE VA A LLENAR EL SUPERVISOR EN PLANTA';
    this.applyHeaderStyle(superSup, 'C55A11', 'FFFFFF');

    const headers = [
      { key: 'item', label: 'ITEM', isOrange: false },
      { key: 'tag', label: 'TAG', isOrange: false },
      { key: 'servicioCumple', label: 'Servicio que cumple', isOrange: false },
      { key: 'funcionamiento', label: 'FUNCIONAMIENTO DE VALVULA', isOrange: false },
      { key: 'tipoValvula', label: 'Tipo DE VALVULA', isOrange: false },
      { key: 'ubicacion', label: 'UBICACIÓN', isOrange: false },
      { key: 'falla', label: 'FALLA', isOrange: false },
      { key: 'notaAdmin', label: 'Nota', isOrange: false },
      // Neumática
      { key: 'cableadoNeum', label: 'CABLEADO NEUMATICO (tubing/manguera)', isOrange: true },
      { key: 'cableNeumInstal', label: 'Cable NEUMATICO (tubing) Instalado [m]', isOrange: true },
      { key: 'peinadoNeum', label: 'pinado y cinchado', isOrange: true },
      { key: 'conexionPlantaNeum', label: 'CONEXIÓN y etiquetado EN PLANTA', isOrange: true },
      { key: 'conexionManifold', label: 'CONEXIÓN y etiquetado MANINFOLD', isOrange: true },
      { key: 'pruebasNeum', label: 'PRUEBAS', isOrange: true },
      { key: 'notasNeum', label: 'NOTAS (Neum)', isOrange: true },
      // Control
      { key: 'cableadoCtrl', label: 'CABLEADO (Ctrl)', isOrange: true },
      { key: 'cableCtrlInstal', label: 'Cable instalado [m]', isOrange: true },
      { key: 'peinadoCtrl', label: 'Peinado y Cinchado de cable', isOrange: true },
      { key: 'conexionPlantaCtrl', label: 'CONEXIÓN Y ETIQUETADO EN PLANTA (Ctrl)', isOrange: true },
      { key: 'conexionTableroCtrl', label: 'CONEXIÓN Y ETIQUETADO EN TABLERO', isOrange: true },
      { key: 'comisioning', label: 'COMISIONING', isOrange: true },
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

  private buildMotorExcel(ws: ExcelJS.Worksheet, rows: any[], isAdmin: boolean) {
    ws.mergeCells(1, 1, 1, 19);
    const superAdmin = ws.getCell(1, 1);
    superAdmin.value = 'DATOS QUE DEBE CONTENER LA TABLA QUE VA A SUBIR EL ADMINISTRADOR';
    this.applyHeaderStyle(superAdmin, '1C1C1A', 'FFFFFF');

    const totalSupCols = isAdmin ? 9 * 2 : 9;
    ws.mergeCells(1, 20, 1, 19 + totalSupCols);
    const superSup = ws.getCell(1, 20);
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
      { key: 'flaCurrent', label: 'FULL LOAD CURRENT (FLA)', isOrange: false },
      { key: 'fla125Current', label: 'FULL LOAD CURRENT (FLA) *1.25', isOrange: false },
      { key: 'temperatureFactor', label: 'TEMPERATURE FACTOR', isOrange: false },
      { key: 'groupingFactor', label: 'GROUPING FACTOR', isOrange: false },
      { key: 'wiresPerPhase', label: 'WIRES PER PHASE', isOrange: false },
      { key: 'voltageLossFactor', label: 'VOLTAGE LOSS FACTOR', isOrange: false },
      { key: 'cableLengthMts', label: 'CABLE LENGTH (MTS)', isOrange: false },
      { key: 'voltageLossPct', label: 'VOLTAGE LOSS PERCENTAGE', isOrange: false },
      { key: 'wireGauge', label: 'WIRE GAUGE', isOrange: false },
      { key: 'groundWireGauge', label: 'GROUND WIRE GAUGE', isOrange: false },
      { key: 'ubicacion', label: 'Ubicación', isOrange: false },
      { key: 'tamanoCable', label: 'TAMAÑ. CABLE', isOrange: false },
      { key: 'cableado', label: 'CABLEADO', isOrange: true },
      { key: 'cantidadCable', label: 'Cantidad de cable (m)', isOrange: true },
      { key: 'peinadoCinchado', label: 'Peinado y cinchado', isOrange: true },
      { key: 'pruebasAislMotor', label: 'PRUEBAS AISLAMIENTO MOTOR', isOrange: true },
      { key: 'pruebasAislCirc', label: 'PRUEBAS AISLAMIENTO CIRCUITO', isOrange: true },
      { key: 'conexionMotor', label: 'CONEXIÓN y etiquetado motor', isOrange: true },
      { key: 'conexionCcm', label: 'CONEXIÓN Y ETIQUETADO CCM', isOrange: true },
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

  private applyHeaderStyle(cell: ExcelJS.Cell, bgColor: string, fgColor: string) {
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
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
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

  private async ensureInitialSeed(projectId: string, modulo: 'instrumentacion' | 'valvulas' | 'motor') {
    try {
      if (modulo === 'instrumentacion') {
        const count = await this.prisma.avanceInstrumentacion.count({ where: { proyectoId: projectId } });
        if (count > 0) return;
      } else if (modulo === 'valvulas') {
        const count = await this.prisma.avanceValvula.count({ where: { proyectoId: projectId } });
        if (count > 0) return;
      } else if (modulo === 'motor') {
        const count = await this.prisma.avanceMotor.count({ where: { proyectoId: projectId } });
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
        this.logger.warn(`No se encontró docs/Tabla de Avances.xlsx para auto-seed en ${projectId}`);
        return;
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);

      if (modulo === 'instrumentacion') {
        const ws = workbook.getWorksheet('INSTRUMENTACIÓN') || workbook.getWorksheet('INSTRUMENTACION');
        if (ws) {
          const rowsToInsert: any[] = [];
          for (let r = 5; r <= ws.rowCount; r++) {
            const itemVal = ws.getCell(r, 2).text?.trim(); // Col B
            const tagVal = ws.getCell(r, 5).text?.trim();  // Col E
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
            const cantidadCable = parseFloat(ws.getCell(r, 12).text?.trim()) || 0;
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
              cant,
              servicioSuple,
              ubicacion,
              evk,
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
            await this.prisma.avanceInstrumentacion.createMany({ data: rowsToInsert });
            this.logger.log(`Se sembraron ${rowsToInsert.length} filas en AvanceInstrumentacion para proyecto ${projectId}`);
          }
        }
      } else if (modulo === 'valvulas') {
        const ws = workbook.getWorksheet('VALVULAS');
        if (ws) {
          const rowsToInsert: any[] = [];
          for (let r = 5; r <= ws.rowCount; r++) {
            const itemVal = ws.getCell(r, 2).text?.trim(); // Col B
            const tagVal = ws.getCell(r, 3).text?.trim();  // Col C
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
            const cableNeumInstal = parseFloat(ws.getCell(r, 11).text?.trim()) || 0;
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
            const comisioning = ws.getCell(r, 23).text?.trim() || '0';
            const comisionamiento = ws.getCell(r, 24).text?.trim() || '0';
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
              conexionPlantaNeum,
              conexionManifold,
              pruebasNeum,
              notasNeum,
              cableadoCtrl,
              cableCtrlInstal,
              peinadoCtrl,
              conexionPlantaCtrl,
              conexionTableroCtrl,
              comisioning,
              comisionamiento,
              notasCtrl,
            });
          }

          if (rowsToInsert.length > 0) {
            await this.prisma.avanceValvula.createMany({ data: rowsToInsert });
            this.logger.log(`Se sembraron ${rowsToInsert.length} filas en AvanceValvula para proyecto ${projectId}`);
          }
        }
      } else if (modulo === 'motor') {
        const ws = workbook.getWorksheet('MOTOR');
        if (ws) {
          const rowsToInsert: any[] = [];
          for (let r = 10; r <= ws.rowCount; r++) {
            const partVal = ws.getCell(r, 1).text?.trim(); // Col A
            const tagVal = ws.getCell(r, 2).text?.trim();  // Col B
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
            const cantidadCable = parseFloat(ws.getCell(r, 21).text?.trim()) || 0;
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
              flaCurrent,
              fla125Current,
              temperatureFactor,
              groupingFactor,
              wiresPerPhase,
              voltageLossFactor,
              cableLengthMts,
              voltageLossPct,
              wireGauge,
              groundWireGauge,
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
            this.logger.log(`Se sembraron ${rowsToInsert.length} filas en AvanceMotor para proyecto ${projectId}`);
          }
        }
      }
    } catch (err) {
      this.logger.error(`Error en ensureInitialSeed para ${modulo}:`, err);
    }
  }
}
