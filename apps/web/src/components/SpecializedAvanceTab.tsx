import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Edit,
  Save,
  X,
  RefreshCw,
  Search,
  ShieldCheck,
  Clock,
  User,
  CheckCircle2,
  Circle,
  FileSpreadsheet,
} from 'lucide-react';

export type ModuloEspecializado = 'instrumentacion' | 'valvulas' | 'motor';

interface ColumnDef {
  key: string;
  label: string;
  isOrange: boolean;
  type: 'check' | 'number' | 'text' | 'options';
  options?: string[];
  subgroup?: string;
}

const MODULO_CONFIG: Record<
  ModuloEspecializado,
  {
    title: string;
    description: string;
    columns: ColumnDef[];
  }
> = {
  instrumentacion: {
    title: 'Avance de Instrumentación',
    description:
      'Control de instalación, cableado, peinado y pruebas de instrumentos de planta.',
    columns: [
      { key: 'item', label: 'Item', isOrange: false, type: 'number' },
      { key: 'tipoVariable', label: 'Tipo de VARIABLE', isOrange: false, type: 'text' },
      { key: 'equipoAsoc', label: 'Equipo asociado', isOrange: false, type: 'text' },
      { key: 'tag', label: 'Tag', isOrange: false, type: 'text' },
      { key: 'cant', label: 'Cant.', isOrange: false, type: 'number' },
      { key: 'servicioSuple', label: 'Servicio que suple', isOrange: false, type: 'text' },
      { key: 'ubicacion', label: 'Ubicación', isOrange: false, type: 'text' },
      { key: 'evk', label: 'EVK', isOrange: false, type: 'text' },
      // Supervisor
      { key: 'instaladoPlanta', label: 'Instalado Planta', isOrange: true, type: 'check' },
      { key: 'cableado', label: 'Cableado', isOrange: true, type: 'check' },
      { key: 'cantidadCable', label: 'Cant. Cable [m]', isOrange: true, type: 'number' },
      { key: 'peinadoCinchado', label: 'Peinado y Cinchado', isOrange: true, type: 'check' },
      { key: 'conexionPlanta', label: 'Conexión Planta', isOrange: true, type: 'options', options: ['0', '1', 'CONECTADO'] },
      { key: 'conexionTablero', label: 'Conexión Tablero', isOrange: true, type: 'options', options: ['0', '1', 'CONECTADO'] },
      { key: 'pruebas', label: 'Pruebas', isOrange: true, type: 'check' },
      { key: 'nota', label: 'Nota', isOrange: true, type: 'text' },
    ],
  },
  valvulas: {
    title: 'Avance de Válvulas',
    description:
      'Control de instalación neumática y control eléctrico de válvulas de proceso.',
    columns: [
      { key: 'item', label: 'ITEM', isOrange: false, type: 'number' },
      { key: 'tag', label: 'TAG', isOrange: false, type: 'text' },
      { key: 'servicioCumple', label: 'Servicio que cumple', isOrange: false, type: 'text' },
      { key: 'funcionamiento', label: 'Funcionamiento', isOrange: false, type: 'text' },
      { key: 'tipoValvula', label: 'Tipo Válvula', isOrange: false, type: 'text' },
      { key: 'ubicacion', label: 'Ubicación', isOrange: false, type: 'text' },
      { key: 'falla', label: 'Falla', isOrange: false, type: 'text' },
      { key: 'notaAdmin', label: 'Nota Admin', isOrange: false, type: 'text' },
      // Supervisor - Neumática
      { key: 'cableadoNeum', label: 'Cableado Tubing', isOrange: true, type: 'check', subgroup: 'Neumática' },
      { key: 'cableNeumInstal', label: 'Tubing Instalado [m]', isOrange: true, type: 'number', subgroup: 'Neumática' },
      { key: 'peinadoNeum', label: 'Peinado/Cinchado', isOrange: true, type: 'check', subgroup: 'Neumática' },
      { key: 'conexionPlantaNeum', label: 'Conexión Planta', isOrange: true, type: 'check', subgroup: 'Neumática' },
      { key: 'conexionManifold', label: 'Conexión Manifold', isOrange: true, type: 'check', subgroup: 'Neumática' },
      { key: 'pruebasNeum', label: 'Pruebas Neum', isOrange: true, type: 'check', subgroup: 'Neumática' },
      { key: 'notasNeum', label: 'Notas Neumática', isOrange: true, type: 'text', subgroup: 'Neumática' },
      // Supervisor - Control
      { key: 'cableadoCtrl', label: 'Cableado Eléc.', isOrange: true, type: 'check', subgroup: 'Control' },
      { key: 'cableCtrlInstal', label: 'Cable Instalado [m]', isOrange: true, type: 'text', subgroup: 'Control' },
      { key: 'peinadoCtrl', label: 'Peinado Cable', isOrange: true, type: 'check', subgroup: 'Control' },
      { key: 'conexionPlantaCtrl', label: 'Conexión Planta', isOrange: true, type: 'check', subgroup: 'Control' },
      { key: 'conexionTableroCtrl', label: 'Conexión Tablero', isOrange: true, type: 'check', subgroup: 'Control' },
      { key: 'comisioning', label: 'Comisioning', isOrange: true, type: 'options', options: ['0', 'LISTO', '----------'], subgroup: 'Control' },
      { key: 'comisionamiento', label: 'Comisionamiento', isOrange: true, type: 'check', subgroup: 'Control' },
      { key: 'notasCtrl', label: 'Notas Control', isOrange: true, type: 'text', subgroup: 'Control' },
    ],
  },
  motor: {
    title: 'Avance de Motores',
    description:
      'Control de cableado de fuerza, pruebas de aislamiento motor/circuito y solo-run.',
    columns: [
      { key: 'part', label: 'Part', isOrange: false, type: 'text' },
      { key: 'tag', label: 'TAG', isOrange: false, type: 'text' },
      { key: 'description', label: 'Descripción', isOrange: false, type: 'text' },
      { key: 'operatingMode', label: 'Modo', isOrange: false, type: 'text' },
      { key: 'voltage', label: 'Voltaje', isOrange: false, type: 'text' },
      { key: 'hp', label: 'HP', isOrange: false, type: 'text' },
      { key: 'phases', label: 'Fases', isOrange: false, type: 'text' },
      { key: 'flaCurrent', label: 'FLA (Amps)', isOrange: false, type: 'text' },
      { key: 'fla125Current', label: 'FLA * 1.25', isOrange: false, type: 'text' },
      { key: 'temperatureFactor', label: 'Factor Temp', isOrange: false, type: 'text' },
      { key: 'groupingFactor', label: 'Factor Agrup.', isOrange: false, type: 'text' },
      { key: 'wiresPerPhase', label: 'Hilos/Fase', isOrange: false, type: 'text' },
      { key: 'voltageLossFactor', label: 'Factor Caída', isOrange: false, type: 'text' },
      { key: 'cableLengthMts', label: 'Longitud (m)', isOrange: false, type: 'text' },
      { key: 'voltageLossPct', label: '% Caída Tensión', isOrange: false, type: 'text' },
      { key: 'wireGauge', label: 'Calibre Cable', isOrange: false, type: 'text' },
      { key: 'groundWireGauge', label: 'Calibre Tierra', isOrange: false, type: 'text' },
      { key: 'ubicacion', label: 'Ubicación', isOrange: false, type: 'text' },
      { key: 'tamanoCable', label: 'Tamaño Cable', isOrange: false, type: 'text' },
      // Supervisor
      { key: 'cableado', label: 'Cableado', isOrange: true, type: 'check' },
      { key: 'cantidadCable', label: 'Cant. Cable (m)', isOrange: true, type: 'number' },
      { key: 'peinadoCinchado', label: 'Peinado y Cinchado', isOrange: true, type: 'check' },
      { key: 'pruebasAislMotor', label: 'Aislam. Motor', isOrange: true, type: 'check' },
      { key: 'pruebasAislCirc', label: 'Aislam. Circuito', isOrange: true, type: 'check' },
      { key: 'conexionMotor', label: 'Conexión Motor', isOrange: true, type: 'check' },
      { key: 'conexionCcm', label: 'Conexión CCM', isOrange: true, type: 'check' },
      { key: 'motorSoloRun', label: 'Solo-Run', isOrange: true, type: 'check' },
      { key: 'notas', label: 'Notas', isOrange: true, type: 'text' },
    ],
  },
};

interface Props {
  projectId: string;
  modulo: ModuloEspecializado;
  isAdmin: boolean;
  isSupervisor: boolean;
  isCulminated: boolean;
  apiUrl: string;
  token: string;
}

export const SpecializedAvanceTab: React.FC<Props> = ({
  projectId,
  modulo,
  isAdmin,
  isSupervisor,
  isCulminated,
  apiUrl,
  token,
}) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modo edición
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedRows, setEditedRows] = useState<Record<string, Record<string, any>>>({});
  const [saving, setSaving] = useState<boolean>(false);

  // Modo auditoría (solo Admin)
  const [showAudit, setShowAudit] = useState<boolean>(false);

  // Búsqueda
  const [searchTerm, setSearchTerm] = useState<string>('');

  const config = MODULO_CONFIG[modulo];

  // Cargar datos
  const fetchRows = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(
        `${apiUrl}/projects/${projectId}/avances-especializados/${modulo}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!res.ok) {
        throw new Error(`Error ${res.status}: Fallo al cargar datos de ${modulo}`);
      }
      const data = await res.json();
      setRows(data.rows || []);
      setEditedRows({});
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error desconocido al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && modulo) {
      fetchRows();
    }
  }, [projectId, modulo]);

  // Manejo de cambios en celdas
  const handleCellChange = (rowId: string, colKey: string, value: any) => {
    setEditedRows((prev) => {
      const rowUpdates = prev[rowId] ? { ...prev[rowId] } : {};
      rowUpdates[colKey] = value;
      return {
        ...prev,
        [rowId]: rowUpdates,
      };
    });
  };

  // Obtener valor efectivo de celda (si está editado o original)
  const getCellValue = (row: any, colKey: string) => {
    if (editedRows[row.id] && editedRows[row.id][colKey] !== undefined) {
      return editedRows[row.id][colKey];
    }
    return row[colKey];
  };

  // Guardar cambios por lote
  const handleSaveChanges = async () => {
    const dirtyRowIds = Object.keys(editedRows);
    if (dirtyRowIds.length === 0) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        rows: dirtyRowIds.map((rowId) => ({
          rowId,
          updates: editedRows[rowId],
        })),
      };

      const res = await fetch(
        `${apiUrl}/projects/${projectId}/avances-especializados/${modulo}/batch`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error ${res.status} al guardar los avances`,
        );
      }

      await fetchRows();
    } catch (err: any) {
      alert(`No se pudieron guardar los cambios: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditedRows({});
    setIsEditing(false);
  };

  // Descarga de Excel
  const handleDownloadExcel = async () => {
    try {
      const res = await fetch(
        `${apiUrl}/projects/${projectId}/avances-especializados/${modulo}/export`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!res.ok) throw new Error('Fallo al exportar archivo Excel');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Avance_${modulo.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      alert(`Error al descargar Excel: ${err.message}`);
    }
  };

  // Filtrado de filas
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((r) => {
      return (
        String(r.tag || '').toLowerCase().includes(term) ||
        String(r.item || '').toLowerCase().includes(term) ||
        String(r.part || '').toLowerCase().includes(term) ||
        String(r.servicioCumple || r.servicioSuple || r.description || '').toLowerCase().includes(term) ||
        String(r.ubicacion || '').toLowerCase().includes(term) ||
        String(r.tipoVariable || '').toLowerCase().includes(term)
      );
    });
  }, [rows, searchTerm]);

  // Contadores / KPIs rápidos
  const stats = useMemo(() => {
    const total = rows.length;
    if (total === 0) return { total: 0, cableadoCount: 0, conexionCount: 0 };

    let cableadoCount = 0;
    let conexionCount = 0;

    for (const r of rows) {
      if (r.cableado === '1' || r.cableadoNeum === '1' || r.cableadoCtrl === '1') {
        cableadoCount++;
      }
      if (
        r.conexionPlanta === '1' ||
        r.conexionPlanta === 'CONECTADO' ||
        r.conexionPlantaNeum === '1' ||
        r.conexionPlantaCtrl === '1' ||
        r.conexionMotor === '1'
      ) {
        conexionCount++;
      }
    }

    return { total, cableadoCount, conexionCount };
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Cabecera y Herramientas */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-[#E3E1D9]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#1C1C1A]">{config.title}</h3>
            <span className="px-2 py-0.5 rounded-full bg-[#F1EFE8] text-[#5F5E5A] text-[11px] font-bold">
              {rows.length} registros
            </span>
            {stats.total > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#EAF3DE] text-[#27500A] text-[11px] font-bold">
                Cableado: {stats.cableadoCount}/{stats.total} ({Math.round((stats.cableadoCount / stats.total) * 100)}%)
              </span>
            )}
          </div>
          <p className="text-xs text-[#5F5E5A] mt-0.5">{config.description}</p>
        </div>

        {/* Botonera de acciones */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Toggle de Auditoría solo para Administradores */}
          {isAdmin && (
            <button
              onClick={() => setShowAudit(!showAudit)}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                showAudit
                  ? 'bg-[#1C1C1A] text-white border-[#1C1C1A]'
                  : 'bg-white text-[#5F5E5A] border-[#C9C7BD] hover:bg-[#F7F7F5]'
              }`}
              title="Mostrar u ocultar los metadatos de autor y fecha en celdas modificadas"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {showAudit ? 'Ocultar Auditoría' : 'Ver Auditoría'}
            </button>
          )}

          {/* Botón Descargar Excel */}
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-1.5 h-8 px-3 bg-white border border-[#C9C7BD] text-[#1C1C1A] hover:bg-[#F7F7F5] rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#0C447C]" />
            Descargar Excel
          </button>

          {/* Botón Reportar Avance (Supervisor y Admin) */}
          {(isSupervisor || isAdmin) && !isCulminated && (
            <>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 h-8 px-3.5 bg-[#C55A11] hover:bg-[#A04408] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Reportar Avance
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="flex items-center gap-1 h-8 px-2.5 bg-white border border-[#C9C7BD] text-[#5F5E5A] hover:bg-[#F7F7F5] rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="flex items-center gap-1.5 h-8 px-3.5 bg-[#27500A] hover:bg-[#1D3B07] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Guardar Avances
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Barra de Búsqueda y Resumen de Métricas */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-[#F7F7F5] p-2.5 rounded-xl border border-[#E3E1D9] text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#8B8A84]" />
          <input
            type="text"
            placeholder="Buscar por Tag, Item o Descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-white border border-[#C9C7BD] rounded-lg text-xs font-medium focus:outline-hidden focus:border-[#1C1C1A]"
          />
        </div>

        {/* Micro KPIs */}
        <div className="flex items-center gap-4 text-[11px] font-semibold text-[#5F5E5A]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1C1C1A]"></span>
            Columnas Negras: Especificación Admin
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#C55A11]"></span>
            Columnas Naranjas: Avance Supervisor
          </span>
        </div>
      </div>

      {/* Contenido / Tabla */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-8 h-8 text-[#C55A11] animate-spin" />
          <span className="text-xs text-[#5F5E5A] font-semibold">
            Cargando especialidad {modulo}...
          </span>
        </div>
      ) : errorMsg ? (
        <div className="p-4 bg-[#FDE8E8] border border-[#F8B4B4] rounded-xl text-xs text-[#C23939] font-medium">
          {errorMsg}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center py-12 text-[#8B8A84] space-y-2 border border-dashed border-[#C9C7BD] rounded-xl">
          <FileSpreadsheet className="w-10 h-10 text-gray-400 mx-auto opacity-40" />
          <p className="text-sm font-semibold">Sin registros que mostrar</p>
          <p className="text-xs">
            {searchTerm
              ? 'No hay resultados que coincidan con la búsqueda.'
              : 'No hay filas cargadas para esta especialidad en el proyecto.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#E3E1D9] rounded-xl shadow-xs bg-white">
          <table className="w-full text-left text-xs border-collapse">
            {/* Cabecera de 2 niveles */}
            <thead>
              {/* Nivel 1: Banda de Grupos */}
              <tr className="border-b border-[#E3E1D9] text-[10px] tracking-wider uppercase font-bold text-center">
                <th
                  colSpan={config.columns.filter((c) => !c.isOrange).length}
                  className="bg-[#1C1C1A] text-white py-1.5 px-3 border-r border-gray-600"
                >
                  INFORMACIÓN QUE SUBE EL ADMINISTRADOR AL INICIO DEL PROYECTO
                </th>
                <th
                  colSpan={config.columns.filter((c) => c.isOrange).length}
                  className="bg-[#C55A11] text-white py-1.5 px-3"
                >
                  INFORMACIÓN QUE VA INTRODUCIENDO EL SUPERVISOR EN PLANTA
                </th>
              </tr>

              {/* Nivel 2: Títulos de columnas */}
              <tr className="border-b border-[#E3E1D9] text-[11px] font-bold">
                {config.columns.map((col) => (
                  <th
                    key={col.key}
                    className={`py-2 px-3 whitespace-nowrap border-r border-[#E3E1D9] ${
                      col.isOrange
                        ? 'bg-[#FFF3E0] text-[#8C3B00]'
                        : 'bg-[#F1EFE8] text-[#1C1C1A]'
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Cuerpo de Filas */}
            <tbody className="divide-y divide-[#E3E1D9]">
              {filteredRows.map((row, rIdx) => {
                const rowAudit = (row.celdasAudit as Record<string, any>) || {};
                const isRowDirty = !!editedRows[row.id];

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      isRowDirty
                        ? 'bg-[#FFF8E7]'
                        : rIdx % 2 === 0
                          ? 'bg-white'
                          : 'bg-[#FBFBFA]'
                    } hover:bg-[#F2F1EC]`}
                  >
                    {config.columns.map((col) => {
                      const val = getCellValue(row, col.key);
                      const cellAudit = rowAudit[col.key];

                      return (
                        <td
                          key={col.key}
                          className={`py-2 px-3 whitespace-nowrap border-r border-[#E3E1D9] text-xs ${
                            col.isOrange ? 'bg-orange-50/20' : ''
                          }`}
                        >
                          {/* MODO EDICIÓN EN CELDAS NARANJAS */}
                          {isEditing && col.isOrange ? (
                            <div>
                              {col.type === 'check' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCellChange(
                                      row.id,
                                      col.key,
                                      val === '1' ? '0' : '1',
                                    )
                                  }
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                    val === '1'
                                      ? 'bg-[#EAF3DE] text-[#27500A] border border-[#C0DD9D]'
                                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'
                                  }`}
                                >
                                  {val === '1' ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Listo (1)
                                    </>
                                  ) : (
                                    <>
                                      <Circle className="w-3.5 h-3.5" />
                                      Pendiente (0)
                                    </>
                                  )}
                                </button>
                              ) : col.type === 'options' ? (
                                <select
                                  value={val ?? '0'}
                                  onChange={(e) =>
                                    handleCellChange(row.id, col.key, e.target.value)
                                  }
                                  className="h-7 px-1.5 bg-white border border-[#C9C7BD] rounded text-xs font-medium cursor-pointer"
                                >
                                  {col.options?.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : col.type === 'number' ? (
                                <input
                                  type="number"
                                  step="any"
                                  value={val ?? ''}
                                  onChange={(e) =>
                                    handleCellChange(row.id, col.key, e.target.value)
                                  }
                                  className="h-7 w-20 px-1.5 bg-white border border-[#C9C7BD] rounded text-xs font-medium"
                                  placeholder="0.0"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={val ?? ''}
                                  onChange={(e) =>
                                    handleCellChange(row.id, col.key, e.target.value)
                                  }
                                  className="h-7 min-w-36 px-2 bg-white border border-[#C9C7BD] rounded text-xs font-medium"
                                  placeholder="Escribir nota..."
                                />
                              )}
                            </div>
                          ) : (
                            /* MODO SOLO LECTURA */
                            <div className="flex items-center justify-between gap-2">
                              {col.type === 'check' ? (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    val === '1'
                                      ? 'bg-[#EAF3DE] text-[#27500A]'
                                      : 'bg-gray-100 text-gray-400'
                                  }`}
                                >
                                  {val === '1' ? '1 (Sí)' : '0'}
                                </span>
                              ) : col.type === 'options' && val === 'CONECTADO' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#E6F1FB] text-[#0C447C]">
                                  CONECTADO
                                </span>
                              ) : (
                                <span
                                  className={`${
                                    col.isOrange
                                      ? 'font-medium text-[#1C1C1A]'
                                      : 'text-[#3B3A36]'
                                  }`}
                                >
                                  {val ?? '-'}
                                </span>
                              )}

                              {/* AUDITORÍA CELDA POR CELDA (Solo visible si isAdmin y showAudit está activo) */}
                              {isAdmin && showAudit && col.isOrange && cellAudit && (
                                <div
                                  className="group relative cursor-pointer"
                                  title={`Editado por: ${cellAudit.usuarioNombre || 'Usuario'} el ${new Date(cellAudit.fechaEdicion).toLocaleDateString()} a las ${new Date(cellAudit.fechaEdicion).toLocaleTimeString()}`}
                                >
                                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#E6F1FB] text-[#0C447C] hover:bg-[#0C447C] hover:text-white transition-all text-[9px] font-bold">
                                    i
                                  </span>

                                  {/* Tooltip desplegable */}
                                  <div className="absolute right-0 bottom-full mb-1 hidden group-hover:flex flex-col gap-0.5 z-50 bg-[#1C1C1A] text-white p-2 rounded-lg shadow-lg text-[10px] w-48 pointer-events-none">
                                    <div className="flex items-center gap-1 font-bold text-amber-400">
                                      <User className="w-3 h-3" />
                                      {cellAudit.usuarioNombre || 'Usuario'}
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-300">
                                      <Clock className="w-3 h-3" />
                                      {new Date(cellAudit.fechaEdicion).toLocaleDateString()}{' '}
                                      {new Date(cellAudit.fechaEdicion).toLocaleTimeString()}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Barra flotante inferior para guardar si hay cambios pendientes */}
      {isEditing && Object.keys(editedRows).length > 0 && (
        <div className="sticky bottom-4 z-40 bg-[#1C1C1A] text-white p-3.5 rounded-xl shadow-xl flex items-center justify-between gap-4 border border-gray-700 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-xs font-semibold">
              {Object.keys(editedRows).length} fila(s) modificada(s) pendientes de guardar.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg border border-gray-600 hover:bg-gray-800 text-xs font-semibold cursor-pointer"
            >
              Descartar
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#C55A11] hover:bg-[#A04408] text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Confirmar y Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
