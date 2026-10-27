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
  Plus,
  Upload,
  FileText,
  Sparkles,
} from 'lucide-react';

export type ModuloEspecializado = 'instrumentacion' | 'valvulas' | 'motor';

export const isCheckedValue = (v: any): boolean =>
  v === '1' || v === 1 || v === 'LISTO' || v === 'CONECTADO';

interface ColumnDef {
  key: string;
  label: string;
  isOrange: boolean;
  type: 'check' | 'number' | 'text' | 'options';
  options?: string[];
  subgroup?: string;
  required?: boolean;
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
    description: 'Control de instalación, cableado, peinado y pruebas de instrumentos de planta.',
    columns: [
      { key: 'item', label: 'Item', isOrange: false, type: 'number' },
      {
        key: 'tipoVariable',
        label: 'Tipo de VARIABLE',
        isOrange: false,
        type: 'text',
        required: true,
      },
      { key: 'equipoAsoc', label: 'Equipo asociado', isOrange: false, type: 'text' },
      { key: 'tag', label: 'Tag', isOrange: false, type: 'text', required: true },
      { key: 'servicioSuple', label: 'Servicio que suple', isOrange: false, type: 'text' },
      { key: 'ubicacion', label: 'Ubicación', isOrange: false, type: 'text' },
      // Supervisor
      { key: 'instaladoPlanta', label: 'Instalado Planta', isOrange: true, type: 'check' },
      { key: 'cableado', label: 'Cableado', isOrange: true, type: 'check' },
      { key: 'cantidadCable', label: 'Cant. Cable [m]', isOrange: true, type: 'number' },
      { key: 'peinadoCinchado', label: 'Peinado y Cinchado', isOrange: true, type: 'check' },
      { key: 'conexionPlanta', label: 'Conexión Planta', isOrange: true, type: 'check' },
      { key: 'conexionTablero', label: 'Conexión Tablero', isOrange: true, type: 'check' },
      { key: 'pruebas', label: 'Pruebas', isOrange: true, type: 'check' },
      { key: 'nota', label: 'Nota', isOrange: true, type: 'text' },
    ],
  },
  valvulas: {
    title: 'Avance de Válvulas',
    description: 'Control de instalación neumática y control eléctrico de válvulas de proceso.',
    columns: [
      { key: 'item', label: 'ITEM', isOrange: false, type: 'number' },
      { key: 'tag', label: 'TAG', isOrange: false, type: 'text', required: true },
      { key: 'servicioCumple', label: 'Servicio que cumple', isOrange: false, type: 'text' },
      { key: 'funcionamiento', label: 'Funcionamiento', isOrange: false, type: 'text' },
      { key: 'tipoValvula', label: 'Tipo Válvula', isOrange: false, type: 'text' },
      { key: 'ubicacion', label: 'Ubicación', isOrange: false, type: 'text' },
      { key: 'falla', label: 'Falla', isOrange: false, type: 'text' },
      { key: 'notaAdmin', label: 'Nota Admin', isOrange: false, type: 'text' },
      // Supervisor - Neumática
      {
        key: 'cableadoNeum',
        label: 'Cableado Tubing',
        isOrange: true,
        type: 'check',
        subgroup: 'Neumática',
      },
      {
        key: 'cableNeumInstal',
        label: 'Tubing Instalado [m]',
        isOrange: true,
        type: 'number',
        subgroup: 'Neumática',
      },
      {
        key: 'peinadoNeum',
        label: 'Peinado/Cinchado',
        isOrange: true,
        type: 'check',
        subgroup: 'Neumática',
      },
      {
        key: 'conectorRapido',
        label: 'Conector Rapido',
        isOrange: true,
        type: 'options',
        options: ['Pendiente', 'Listo', 'No Aplica'],
        subgroup: 'Neumática',
      },
      {
        key: 'conexionPlantaNeum',
        label: 'Conexión Planta',
        isOrange: true,
        type: 'check',
        subgroup: 'Neumática',
      },
      {
        key: 'conexionManifold',
        label: 'Conexión Manifold',
        isOrange: true,
        type: 'check',
        subgroup: 'Neumática',
      },
      {
        key: 'pruebasNeum',
        label: 'Pruebas Neum',
        isOrange: true,
        type: 'check',
        subgroup: 'Neumática',
      },
      {
        key: 'notasNeum',
        label: 'Notas Neumática',
        isOrange: true,
        type: 'text',
        subgroup: 'Neumática',
      },
      // Supervisor - Control
      {
        key: 'cableadoCtrl',
        label: 'Cableado Eléc.',
        isOrange: true,
        type: 'check',
        subgroup: 'Control',
      },
      {
        key: 'cableCtrlInstal',
        label: 'Cable Instalado [m]',
        isOrange: true,
        type: 'text',
        subgroup: 'Control',
      },
      {
        key: 'peinadoCtrl',
        label: 'Peinado Cable',
        isOrange: true,
        type: 'check',
        subgroup: 'Control',
      },
      {
        key: 'sensorPosicion',
        label: 'Sensor de posición',
        isOrange: true,
        type: 'options',
        options: ['Pendiente', 'Listo', 'No Aplica'],
        subgroup: 'Control',
      },
      {
        key: 'conexionPlantaCtrl',
        label: 'Conexión Planta',
        isOrange: true,
        type: 'check',
        subgroup: 'Control',
      },
      {
        key: 'conexionTableroCtrl',
        label: 'Conexión Tablero',
        isOrange: true,
        type: 'check',
        subgroup: 'Control',
      },
      {
        key: 'comisionamiento',
        label: 'Comisionamiento',
        isOrange: true,
        type: 'check',
        subgroup: 'Control',
      },
      {
        key: 'notasCtrl',
        label: 'Notas Control',
        isOrange: true,
        type: 'text',
        subgroup: 'Control',
      },
    ],
  },
  motor: {
    title: 'Avance de Motores',
    description: 'Control de cableado de fuerza, pruebas de aislamiento motor/circuito y solo-run.',
    columns: [
      { key: 'part', label: 'Part', isOrange: false, type: 'text', required: true },
      { key: 'tag', label: 'TAG', isOrange: false, type: 'text', required: true },
      { key: 'description', label: 'Descripción', isOrange: false, type: 'text' },
      { key: 'operatingMode', label: 'Modo', isOrange: false, type: 'text' },
      { key: 'voltage', label: 'Voltaje', isOrange: false, type: 'text' },
      { key: 'hp', label: 'HP', isOrange: false, type: 'text' },
      { key: 'phases', label: 'Fases', isOrange: false, type: 'text' },
      { key: 'ubicacion', label: 'Ubicación', isOrange: false, type: 'text' },
      { key: 'tamanoCable', label: 'Tamaño Cable', isOrange: false, type: 'text' },
      // Supervisor
      { key: 'cableado', label: 'Cableado', isOrange: true, type: 'check' },
      { key: 'cantidadCable', label: 'Cant. Cable (m)', isOrange: true, type: 'number' },
      { key: 'peinadoCinchado', label: 'Peinado y cinchado', isOrange: true, type: 'check' },
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
  onDataChanged?: () => void;
}

export const SpecializedAvanceTab: React.FC<Props> = ({
  projectId,
  modulo,
  isAdmin,
  isSupervisor,
  isCulminated,
  apiUrl,
  token,
  onDataChanged,
}) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modo edición en celdas naranjas
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedRows, setEditedRows] = useState<Record<string, Record<string, any>>>({});
  const [saving, setSaving] = useState<boolean>(false);

  // Modo auditoría (solo Admin)
  const [showAudit, setShowAudit] = useState<boolean>(false);

  // Modales de administración
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<Record<string, any>>({});
  const [creatingRow, setCreatingRow] = useState<boolean>(false);

  const [showCsvModal, setShowCsvModal] = useState<boolean>(false);
  const [csvContent, setCsvContent] = useState<string>('');
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; rows: string[][] } | null>(
    null,
  );
  const [importingCsv, setImportingCsv] = useState<boolean>(false);
  const [loadingSample, setLoadingSample] = useState<boolean>(false);

  // Búsqueda
  const [searchTerm, setSearchTerm] = useState<string>('');

  const config = MODULO_CONFIG[modulo];
  const adminColumns = useMemo(() => config.columns.filter((c) => !c.isOrange), [config]);

  // Cargar datos
  const fetchRows = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`${apiUrl}/projects/${projectId}/avances-especializados/${modulo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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

  // Manejo de cambios en celdas durante reporte de avance
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

  const getCellValue = (row: any, colKey: string) => {
    if (editedRows[row.id] && editedRows[row.id][colKey] !== undefined) {
      return editedRows[row.id][colKey];
    }
    return row[colKey];
  };

  // Guardar cambios de avance
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
        throw new Error(errorData.message || `Error ${res.status} al guardar los avances`);
      }

      await fetchRows();
      onDataChanged?.();
    } catch (err: any) {
      alert(`No se pudieron guardar los cambios: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

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

  // Descargar plantilla CSV
  const handleDownloadCsvTemplate = async () => {
    try {
      const res = await fetch(
        `${apiUrl}/projects/${projectId}/avances-especializados/${modulo}/template-csv`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!res.ok) throw new Error('Fallo al generar plantilla CSV');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Plantilla_${modulo.toUpperCase()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      alert(`Error al descargar plantilla CSV: ${err.message}`);
    }
  };

  // Lectura de archivo CSV
  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      setCsvContent(text);

      // Parsear líneas para previsualización
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const delim = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(delim).map((h) => h.replace(/^"|"$/g, '').trim());
        const previewRows = lines
          .slice(1, 6)
          .map((l) => l.split(delim).map((c) => c.replace(/^"|"$/g, '').trim()));
        setCsvPreview({ headers, rows: previewRows });
      }
    };
    reader.readAsText(file);
  };

  // Enviar archivo CSV
  const handleSubmitCsvImport = async () => {
    if (!csvContent.trim()) {
      alert('Por favor seleccione un archivo CSV con datos');
      return;
    }

    try {
      setImportingCsv(true);
      const res = await fetch(
        `${apiUrl}/projects/${projectId}/avances-especializados/${modulo}/import-csv`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ csv: csvContent }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al importar archivo CSV');
      }

      const result = await res.json();
      alert(`¡Éxito! Se importaron ${result.count || 0} registros correctamente.`);
      setShowCsvModal(false);
      setCsvContent('');
      setCsvFileName('');
      setCsvPreview(null);
      await fetchRows();
      onDataChanged?.();
    } catch (err: any) {
      alert(`Fallo en la importación: ${err.message}`);
    } finally {
      setImportingCsv(false);
    }
  };

  // Crear registro individual manual
  const handleCreateRow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingRow(true);
      const res = await fetch(
        `${apiUrl}/projects/${projectId}/avances-especializados/${modulo}/rows`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(createForm),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al crear nuevo registro');
      }

      setShowCreateModal(false);
      setCreateForm({});
      await fetchRows();
      onDataChanged?.();
    } catch (err: any) {
      alert(`Fallo al registrar: ${err.message}`);
    } finally {
      setCreatingRow(false);
    }
  };

  // Cargar datos de ejemplo (seed)
  const handleLoadSampleData = async () => {
    if (
      !confirm(
        '¿Desea cargar los registros de especificaciones de ejemplo desde la plantilla Excel?',
      )
    ) {
      return;
    }
    try {
      setLoadingSample(true);
      const res = await fetch(
        `${apiUrl}/projects/${projectId}/avances-especializados/${modulo}/load-sample`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al cargar datos de ejemplo');
      }
      await fetchRows();
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingSample(false);
    }
  };

  // Filtrado de filas
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((r) => {
      return (
        String(r.tag || '')
          .toLowerCase()
          .includes(term) ||
        String(r.item || '')
          .toLowerCase()
          .includes(term) ||
        String(r.part || '')
          .toLowerCase()
          .includes(term) ||
        String(r.servicioCumple || r.servicioSuple || r.description || '')
          .toLowerCase()
          .includes(term) ||
        String(r.ubicacion || '')
          .toLowerCase()
          .includes(term) ||
        String(r.tipoVariable || '')
          .toLowerCase()
          .includes(term)
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
                Cableado: {stats.cableadoCount}/{stats.total} (
                {Math.round((stats.cableadoCount / stats.total) * 100)}%)
              </span>
            )}
          </div>
          <p className="text-xs text-[#5F5E5A] mt-0.5">{config.description}</p>
        </div>

        {/* Botonera de acciones */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* ACCIONES EXCLUSIVAS DEL ADMINISTRADOR: CARGA MANUAL Y CSV */}
          {isAdmin && !isCulminated && (
            <>
              <button
                onClick={() => {
                  setCreateForm({});
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-1.5 h-8 px-3 bg-[#1C1C1A] hover:bg-black text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Registrar manualmente una nueva fila técnica (columnas negras)"
              >
                <Plus className="w-3.5 h-3.5" />
                Nuevo Registro
              </button>
              <button
                onClick={() => {
                  setCsvContent('');
                  setCsvFileName('');
                  setCsvPreview(null);
                  setShowCsvModal(true);
                }}
                className="flex items-center gap-1.5 h-8 px-3 bg-white border border-[#1C1C1A] text-[#1C1C1A] hover:bg-[#F1EFE8] rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="Importar lista de registros técnicos desde un archivo CSV"
              >
                <Upload className="w-3.5 h-3.5" />
                Importar CSV
              </button>
            </>
          )}

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

      {/* Barra de Búsqueda y Leyenda */}
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

        {/* Micro Leyenda */}
        <div className="flex items-center gap-4 text-[11px] font-semibold text-[#5F5E5A]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1C1C1A]"></span>
            Columnas Negras: Especificación Técnica (Admin)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C55A11]"></span>
            Columnas Naranjas: Reporte de Avance (Supervisor)
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
      ) : rows.length === 0 ? (
        /* ESTADO VACÍO CON BOTONES DE ACCIÓN PARA EL ADMINISTRADOR */
        <div className="text-center py-12 px-6 border-2 border-dashed border-[#C9C7BD] rounded-2xl bg-white space-y-4">
          <FileSpreadsheet className="w-12 h-12 text-[#8B8A84] mx-auto opacity-50" />
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-sm font-bold text-[#1C1C1A]">
              No hay especificaciones cargadas para {config.title}
            </h4>
            <p className="text-xs text-[#5F5E5A]">
              {isAdmin
                ? 'Como Administrador, debes cargar el listado técnico de equipos para que los supervisores puedan reportar avance en planta.'
                : 'El Administrador aún no ha cargado la lista de especificaciones técnicas para esta especialidad.'}
            </p>
          </div>

          {isAdmin && !isCulminated && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setCsvContent('');
                  setCsvFileName('');
                  setCsvPreview(null);
                  setShowCsvModal(true);
                }}
                className="flex items-center gap-2 h-9 px-4 bg-[#1C1C1A] text-white hover:bg-black rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Subir Archivo CSV
              </button>
              <button
                onClick={() => {
                  setCreateForm({});
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 h-9 px-4 bg-white border border-[#C9C7BD] text-[#1C1C1A] hover:bg-[#F7F7F5] rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Agregar Registro Uno a Uno
              </button>
              <button
                onClick={handleLoadSampleData}
                disabled={loadingSample}
                className="flex items-center gap-2 h-9 px-4 bg-[#EAF3DE] border border-[#C0DD9D] text-[#27500A] hover:bg-[#D5EAC3] rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {loadingSample ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Cargar Datos de Ejemplo
              </button>
            </div>
          )}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center py-10 text-[#8B8A84] space-y-2 border border-dashed border-[#C9C7BD] rounded-xl bg-white">
          <p className="text-sm font-semibold">Sin coincidencias para la búsqueda</p>
          <p className="text-xs">No se encontraron filas con el término "{searchTerm}".</p>
        </div>
      ) : (
        <div className="overflow-auto max-h-[calc(100vh-260px)] min-h-[380px] border border-[#E3E1D9] rounded-xl shadow-xs bg-white relative">
          <table className="w-full text-left text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 shadow-xs">
              {/* Nivel 1: Banda de Grupos */}
              <tr className="text-[10px] tracking-wider uppercase font-bold text-center">
                <th
                  colSpan={adminColumns.length}
                  className="bg-[#1C1C1A] text-white py-1.5 px-3 border-b border-r border-gray-600 sticky top-0 z-20 h-[28px]"
                >
                  INFORMACIÓN QUE SUBE EL ADMINISTRADOR AL INICIO DEL PROYECTO
                </th>
                <th
                  colSpan={config.columns.filter((c) => c.isOrange).length}
                  className="bg-[#C55A11] text-white py-1.5 px-3 border-b border-[#E3E1D9] sticky top-0 z-20 h-[28px]"
                >
                  INFORMACIÓN QUE VA INTRODUCIENDO EL SUPERVISOR EN PLANTA
                </th>
              </tr>

              {/* Nivel 2: Títulos de columnas */}
              <tr className="text-[11px] font-bold">
                {config.columns.map((col) => (
                  <th
                    key={col.key}
                    className={`py-2 px-3 whitespace-nowrap border-b border-r border-[#E3E1D9] sticky top-[28px] z-20 ${
                      col.isOrange ? 'bg-[#FFF3E0] text-[#8C3B00]' : 'bg-[#F1EFE8] text-[#1C1C1A]'
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Cuerpo de Filas */}
            <tbody>
              {filteredRows.map((row, rIdx) => {
                const rowAudit = (row.celdasAudit as Record<string, any>) || {};
                const isRowDirty = !!editedRows[row.id];

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      isRowDirty ? 'bg-[#FFF8E7]' : rIdx % 2 === 0 ? 'bg-white' : 'bg-[#FBFBFA]'
                    } hover:bg-[#F2F1EC]`}
                  >
                    {config.columns.map((col) => {
                      const val = getCellValue(row, col.key);
                      const cellAudit = rowAudit[col.key];

                      return (
                        <td
                          key={col.key}
                          className={`py-2 px-3 whitespace-nowrap border-b border-r border-[#E3E1D9] text-xs ${
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
                                      isCheckedValue(val) ? '0' : '1',
                                    )
                                  }
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                    isCheckedValue(val)
                                      ? 'bg-[#EAF3DE] text-[#27500A] border border-[#C0DD9D]'
                                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'
                                  }`}
                                >
                                  {isCheckedValue(val) ? (
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
                                  value={val ?? col.options?.[0] ?? 'Pendiente'}
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
                                    isCheckedValue(val)
                                      ? 'bg-[#EAF3DE] text-[#27500A]'
                                      : 'bg-gray-100 text-gray-400'
                                  }`}
                                >
                                  {isCheckedValue(val) ? '1 (Listo)' : '0 (Pendiente)'}
                                </span>
                              ) : col.type === 'options' ? (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                    val === 'Listo' || val === 'LISTO' || val === '1'
                                      ? 'bg-[#EAF3DE] text-[#27500A]'
                                      : val === 'No Aplica' || val === 'NO APLICA'
                                      ? 'bg-[#F1EFE8] text-[#5F5E5A]'
                                      : val === 'CONECTADO'
                                      ? 'bg-[#E6F1FB] text-[#0C447C]'
                                      : 'bg-[#FCF4E6] text-[#BA7517]'
                                  }`}
                                >
                                  {val ?? col.options?.[0] ?? 'Pendiente'}
                                </span>
                              ) : (
                                <span
                                  className={`${
                                    col.isOrange ? 'font-medium text-[#1C1C1A]' : 'text-[#3B3A36]'
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

      {/* MODAL 1: REGISTRO MANUAL UNO A UNO (Exclusivo Administrador) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[#E3E1D9]">
              <div>
                <h3 className="text-sm font-bold text-[#1C1C1A]">
                  Nuevo Registro Técnico — {config.title}
                </h3>
                <p className="text-xs text-[#5F5E5A]">
                  Captura las especificaciones de ingeniería que estarán disponibles para el reporte
                  de avance.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRow} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {adminColumns.map((col) => (
                  <div
                    key={col.key}
                    className={
                      col.key === 'servicioSuple' ||
                      col.key === 'description' ||
                      col.key === 'servicioCumple'
                        ? 'sm:col-span-2'
                        : ''
                    }
                  >
                    <label className="block text-[11px] font-semibold text-[#1C1C1A] mb-1">
                      {col.label} {col.required && <span className="text-red-500">*</span>}
                    </label>
                    {col.type === 'number' ? (
                      <input
                        type="number"
                        required={col.required}
                        value={createForm[col.key] ?? ''}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, [col.key]: e.target.value })
                        }
                        className="w-full h-8 px-2.5 bg-white border border-[#C9C7BD] rounded-lg font-medium text-xs focus:outline-hidden focus:border-[#1C1C1A]"
                        placeholder="0"
                      />
                    ) : (
                      <input
                        type="text"
                        required={col.required}
                        value={createForm[col.key] ?? ''}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, [col.key]: e.target.value })
                        }
                        className="w-full h-8 px-2.5 bg-white border border-[#C9C7BD] rounded-lg font-medium text-xs focus:outline-hidden focus:border-[#1C1C1A]"
                        placeholder={`Ingresar ${col.label}...`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#E3E1D9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 border border-[#C9C7BD] text-[#5F5E5A] hover:bg-[#F7F7F5] rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingRow}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1C1C1A] hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {creatingRow ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CARGA MASIVA VÍA ARCHIVO CSV (Exclusivo Administrador) */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[#E3E1D9]">
              <div>
                <h3 className="text-sm font-bold text-[#1C1C1A]">
                  Importar Especificaciones desde CSV — {config.title}
                </h3>
                <p className="text-xs text-[#5F5E5A]">
                  Sube un archivo .csv con las columnas técnicas correspondientes para importarlas
                  masivamente.
                </p>
              </div>
              <button
                onClick={() => setShowCsvModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Descarga de plantilla oficial */}
            <div className="p-3 bg-[#F7F7F5] border border-[#E3E1D9] rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C55A11]" />
                <div>
                  <span className="font-bold text-[#1C1C1A] block">
                    ¿No tienes el formato exacto?
                  </span>
                  <span className="text-[#5F5E5A] text-[11px]">
                    Descarga la plantilla oficial con los encabezados requeridos.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="flex items-center gap-1.5 h-8 px-3 bg-white border border-[#C9C7BD] hover:bg-gray-100 text-[#1C1C1A] rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-[#0C447C]" />
                Descargar Plantilla CSV
              </button>
            </div>

            {/* Dropzone / Input de archivo */}
            <div className="border-2 border-dashed border-[#C9C7BD] rounded-xl p-6 text-center hover:border-[#1C1C1A] transition-colors bg-[#FBFBFA]">
              <Upload className="w-8 h-8 text-[#8B8A84] mx-auto mb-2 opacity-60" />
              <label className="cursor-pointer">
                <span className="text-xs font-bold text-[#0C447C] hover:underline block">
                  Haz clic para seleccionar tu archivo CSV
                </span>
                <span className="text-[11px] text-[#5F5E5A] block mt-1">
                  Formatos aceptados: .csv (separado por comas o punto y coma)
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileSelect}
                  className="hidden"
                />
              </label>
              {csvFileName && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-[#EAF3DE] text-[#27500A] rounded-full text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Archivo cargado: {csvFileName}
                </div>
              )}
            </div>

            {/* Previsualización */}
            {csvPreview && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#5F5E5A] uppercase tracking-wider block">
                  Vista Previa de Columnas Detectadas:
                </span>
                <div className="overflow-auto border border-[#E3E1D9] rounded-lg max-h-48 text-[11px] relative">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead className="bg-[#1C1C1A] text-white sticky top-0 z-10 shadow-xs">
                      <tr>
                        {csvPreview.headers.map((h, i) => (
                          <th
                            key={i}
                            className="p-2 border-b border-r border-gray-700 whitespace-nowrap sticky top-0 bg-[#1C1C1A] z-10"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.rows.map((r, ri) => (
                        <tr key={ri} className="hover:bg-gray-50">
                          {r.map((c, ci) => (
                            <td
                              key={ci}
                              className="p-2 border-b border-r border-[#E3E1D9] whitespace-nowrap"
                            >
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[#E3E1D9] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="px-3.5 py-2 border border-[#C9C7BD] text-[#5F5E5A] hover:bg-[#F7F7F5] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitCsvImport}
                disabled={importingCsv || !csvContent}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1C1C1A] hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {importingCsv ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                Confirmar e Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
