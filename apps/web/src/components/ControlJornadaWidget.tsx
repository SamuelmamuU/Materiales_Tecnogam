import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Utensils,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronUp,
  User,
  Coffee,
  X,
} from 'lucide-react';

interface JornadaLaboralData {
  id: string;
  proyectoId: string;
  supervisorId: string;
  fecha: string;
  estado: 'TRABAJANDO' | 'TIEMPO_MUERTO' | 'COMIDA' | 'FINALIZADA';
  horaInicio: string;
  horaFin?: string | null;
  horasTrabajadas: number;
  horasTiempoMuerto: number;
  horasComida: number;
  horasTrabajadasLive?: number;
  horasTiempoMuertoLive?: number;
  horasComidaLive?: number;
  ultimoCambioEstado: string;
  notas?: string | null;
  supervisor?: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
  eventos?: Array<{
    id: string;
    tipoEstado: string;
    inicio: string;
    fin?: string | null;
    duracion?: number | null;
    motivo?: string | null;
  }>;
}

interface Props {
  projectId: string;
  apiUrl: string;
  token: string | null;
  isCulminated: boolean;
  onJornadaChanged?: () => void;
}

const formatSecondsToHMS = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const ControlJornadaWidget: React.FC<Props> = ({
  projectId,
  apiUrl,
  token,
  isCulminated,
  onJornadaChanged,
}) => {
  const [jornada, setJornada] = useState<JornadaLaboralData | null>(null);
  const [historial, setHistorial] = useState<JornadaLaboralData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [showHistorial, setShowHistorial] = useState<boolean>(false);

  // Modales
  const [showPauseModal, setShowPauseModal] = useState<boolean>(false);
  const [motivoPausa, setMotivoPausa] = useState<string>('');
  const [showFinishModal, setShowFinishModal] = useState<boolean>(false);
  const [notasCierre, setNotasCierre] = useState<string>('');

  // Cronómetros en segundos en vivo (solo tiempo trabajado y tiempo muerto)
  const [workedSec, setWorkedSec] = useState<number>(0);
  const [deadSec, setDeadSec] = useState<number>(0);

  // Cargar jornada de hoy
  const fetchJornadaHoy = useCallback(async () => {
    if (!token || !projectId) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/projects/${projectId}/jornadas/hoy`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJornada(data);
      } else {
        setJornada(null);
      }
    } catch {
      setJornada(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, projectId, token]);

  // Cargar historial de jornadas
  const fetchHistorial = useCallback(async () => {
    if (!token || !projectId) return;
    try {
      const res = await fetch(`${apiUrl}/projects/${projectId}/jornadas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistorial(data);
      }
    } catch {
      // Ignorar errores menores de consulta
    }
  }, [apiUrl, projectId, token]);

  useEffect(() => {
    void fetchJornadaHoy();
    void fetchHistorial();
  }, [fetchJornadaHoy, fetchHistorial]);

  // Cronómetro local reactivo cada 1s (tiempo trabajado y tiempo muerto)
  useEffect(() => {
    if (!jornada) {
      setWorkedSec(0);
      setDeadSec(0);
      return;
    }

    const updateTimers = () => {
      const now = Date.now();
      const lastChange = new Date(jornada.ultimoCambioEstado).getTime();
      const deltaSec = Math.max(0, Math.floor((now - lastChange) / 1000));

      const baseWorked = Math.floor(jornada.horasTrabajadas * 3600);
      const baseDead = Math.floor(jornada.horasTiempoMuerto * 3600);

      if (jornada.estado === 'TRABAJANDO') {
        setWorkedSec(baseWorked + deltaSec);
        setDeadSec(baseDead);
      } else if (jornada.estado === 'TIEMPO_MUERTO') {
        setWorkedSec(baseWorked);
        setDeadSec(baseDead + deltaSec);
      } else {
        // En COMIDA, FINALIZADA o INACTIVA, ambos relojes se mantienen detenidos
        setWorkedSec(baseWorked);
        setDeadSec(baseDead);
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [jornada]);

  // Acciones operativas
  const handleIniciarJornada = async () => {
    if (isCulminated) return;
    try {
      setActionLoading(true);
      const res = await fetch(`${apiUrl}/projects/${projectId}/jornadas/iniciar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'No se pudo iniciar la jornada');
      }
      const data = await res.json();
      setJornada(data);
      void fetchHistorial();
      onJornadaChanged?.();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCambiarEstado = async (
    nuevoEstado: 'TRABAJANDO' | 'TIEMPO_MUERTO' | 'COMIDA',
    motivo?: string,
  ) => {
    if (isCulminated) return;
    try {
      setActionLoading(true);
      const res = await fetch(`${apiUrl}/projects/${projectId}/jornadas/cambiar-estado`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nuevoEstado, motivo }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'No se pudo cambiar el estado de la jornada');
      }
      const data = await res.json();
      setJornada(data);
      setShowPauseModal(false);
      setMotivoPausa('');
      void fetchHistorial();
      onJornadaChanged?.();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizarJornada = async () => {
    if (isCulminated) return;
    try {
      setActionLoading(true);
      const res = await fetch(`${apiUrl}/projects/${projectId}/jornadas/finalizar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notas: notasCierre }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'No se pudo finalizar la jornada');
      }
      const data = await res.json();
      setJornada(data);
      setShowFinishModal(false);
      setNotasCierre('');
      void fetchHistorial();
      onJornadaChanged?.();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-xs animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-100 rounded w-full"></div>
      </div>
    );
  }

  const estado = jornada?.estado || 'INACTIVA';

  return (
    <div className="bg-white border border-[#E3E1D9] rounded-2xl shadow-sm overflow-hidden mb-6">
      {/* Cabecera del Control de Jornada */}
      <div className="p-5 border-b border-[#E3E1D9] bg-[#FDFDFC] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#1C1C1A] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#C55A11]" />
              Reporte de Jornada Laboral
            </h3>
            {/* Badge de Estado Dinámico */}
            {estado === 'TRABAJANDO' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EAF3DE] text-[#27500A] border border-[#C0DD9D] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#27500A] animate-ping" />
                TRABAJANDO
              </span>
            )}
            {estado === 'TIEMPO_MUERTO' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFF3E0] text-[#8C3B00] border border-[#FFCC80] animate-pulse shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#C55A11]" />
                TIEMPO MUERTO (PARO)
              </span>
            )}
            {estado === 'COMIDA' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E6F1FB] text-[#0C447C] border border-[#B5D8F6] shadow-xs">
                <Coffee className="w-3.5 h-3.5" />
                HORA DE COMIDA
              </span>
            )}
            {estado === 'FINALIZADA' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-gray-600" />
                JORNADA CONCLUIDA
              </span>
            )}
            {estado === 'INACTIVA' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                SIN INICIAR HOY
              </span>
            )}
          </div>
          <p className="text-xs text-[#5F5E5A] mt-1">
            Cronometraje en vivo de jornada de obra, pausas operativas por demoras y recesos.
          </p>
        </div>

        {/* Botón de Historial */}
        <button
          onClick={() => setShowHistorial(!showHistorial)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#5F5E5A] hover:text-[#1C1C1A] px-3 py-1.5 rounded-lg border border-[#E3E1D9] bg-white hover:bg-gray-50 transition-all cursor-pointer"
        >
          <History className="w-3.5 h-3.5" />
          {showHistorial ? 'Ocultar Historial' : 'Ver Historial'}
          {showHistorial ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Relojes y Métricas del Día (Tiempo Trabajado y Tiempo Muerto) */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white">
        {/* Reloj Tiempo Trabajado */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            estado === 'TRABAJANDO'
              ? 'bg-[#F2F8ED] border-[#C0DD9D] shadow-xs'
              : 'bg-[#FBFBFA] border-[#E3E1D9]'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#5F5E5A] mb-1">
            <span className="flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-[#27500A]" />
              Tiempo Trabajado
            </span>
            {estado === 'TRABAJANDO' && (
              <span className="text-[10px] font-bold text-[#27500A] uppercase tracking-wide">
                Activo
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-[#1C1C1A] font-mono tracking-tight">
            {formatSecondsToHMS(workedSec)}
          </div>
          <div className="text-[11px] text-[#5F5E5A] mt-1 font-medium">
            {(workedSec / 3600).toFixed(2)} horas efectivas
          </div>
        </div>

        {/* Reloj Tiempo Muerto */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            estado === 'TIEMPO_MUERTO'
              ? 'bg-[#FFF8E7] border-[#FFCC80] shadow-xs'
              : 'bg-[#FBFBFA] border-[#E3E1D9]'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#5F5E5A] mb-1">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#C55A11]" />
              Tiempo Muerto (Paros)
            </span>
            {estado === 'TIEMPO_MUERTO' && (
              <span className="text-[10px] font-bold text-[#C55A11] uppercase tracking-wide animate-pulse">
                Contando
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-[#8C3B00] font-mono tracking-tight">
            {formatSecondsToHMS(deadSec)}
          </div>
          <div className="text-[11px] text-[#5F5E5A] mt-1 font-medium">
            {(deadSec / 3600).toFixed(2)} horas perdidas
          </div>
        </div>
      </div>

      {/* Botonera de Acción de Estados Operativos */}
      {!isCulminated && estado !== 'FINALIZADA' && (
        <div className="p-4 bg-[#F7F7F5] border-t border-[#E3E1D9] flex flex-wrap items-center gap-3">
          {/* Si NO ha iniciado hoy */}
          {estado === 'INACTIVA' && (
            <button
              onClick={handleIniciarJornada}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#27500A] hover:bg-[#1E3F07] transition-all shadow-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              Iniciar Jornada de Hoy
            </button>
          )}

          {/* Si está TRABAJANDO */}
          {estado === 'TRABAJANDO' && (
            <>
              <button
                onClick={() => setShowPauseModal(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#8C3B00] bg-[#FFF3E0] hover:bg-[#FFE0B2] border border-[#FFCC80] transition-all shadow-2xs cursor-pointer"
                title="Pausar trabajo y empezar a contabilizar tiempo muerto por retraso de obra"
              >
                <Pause className="w-4 h-4" />
                Pausar Trabajo (Reportar Tiempo Muerto)
              </button>

              <button
                onClick={() => handleCambiarEstado('COMIDA')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#0C447C] bg-[#E6F1FB] hover:bg-[#D0E7F9] border border-[#B5D8F6] transition-all shadow-2xs cursor-pointer"
                title="Pausa de comida (no contabiliza como trabajo ni como tiempo muerto)"
              >
                <Utensils className="w-4 h-4" />
                Hora de Comida
              </button>

              <button
                onClick={() => setShowFinishModal(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 transition-all shadow-2xs ml-auto cursor-pointer"
                title="Concluir definitivamente la jornada laboral de hoy"
              >
                <CheckCircle2 className="w-4 h-4 text-gray-600" />
                Finalizar Jornada
              </button>
            </>
          )}

          {/* Si está en TIEMPO MUERTO */}
          {estado === 'TIEMPO_MUERTO' && (
            <>
              <button
                onClick={() => handleCambiarEstado('TRABAJANDO')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#27500A] hover:bg-[#1E3F07] transition-all shadow-sm cursor-pointer animate-pulse"
                title="Detener el conteo de tiempo muerto y continuar con las labores de obra"
              >
                <Play className="w-4 h-4 fill-white" />
                Reanudar Trabajo
              </button>

              <button
                onClick={() => handleCambiarEstado('COMIDA')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#0C447C] bg-[#E6F1FB] hover:bg-[#D0E7F9] border border-[#B5D8F6] transition-all shadow-2xs cursor-pointer"
                title="Pasar a pausa de comida"
              >
                <Utensils className="w-4 h-4" />
                Hora de Comida
              </button>

              <button
                onClick={() => setShowFinishModal(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 transition-all shadow-2xs ml-auto cursor-pointer"
                title="Finalizar la jornada del día"
              >
                <CheckCircle2 className="w-4 h-4 text-gray-600" />
                Finalizar Jornada
              </button>
            </>
          )}

          {/* Si está en HORA DE COMIDA */}
          {estado === 'COMIDA' && (
            <>
              <button
                onClick={() => handleCambiarEstado('TRABAJANDO')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#27500A] hover:bg-[#1E3F07] transition-all shadow-sm cursor-pointer"
                title="Regresar del receso de comida y reanudar jornada de trabajo"
              >
                <Play className="w-4 h-4 fill-white" />
                Regresar de Comida (Reanudar Trabajo)
              </button>

              <button
                onClick={() => setShowFinishModal(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 transition-all shadow-2xs ml-auto cursor-pointer"
                title="Finalizar la jornada del día"
              >
                <CheckCircle2 className="w-4 h-4 text-gray-600" />
                Finalizar Jornada
              </button>
            </>
          )}
        </div>
      )}

      {/* Historial Desplegable */}
      {showHistorial && (
        <div className="border-t border-[#E3E1D9] p-5 bg-[#FAF9F5] space-y-3">
          <h4 className="text-xs font-bold text-[#1C1C1A] uppercase tracking-wider">
            Historial de Jornadas Registradas en el Proyecto
          </h4>
          {historial.length === 0 ? (
            <p className="text-xs text-[#8B8A84] italic">
              No hay jornadas previas registradas en este proyecto.
            </p>
          ) : (
            <div className="overflow-x-auto border border-[#E3E1D9] rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F1EFE8] text-[#1C1C1A] font-bold border-b border-[#E3E1D9]">
                  <tr>
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5">Supervisor</th>
                    <th className="p-2.5">Estado</th>
                    <th className="p-2.5 text-right">Trabajado</th>
                    <th className="p-2.5 text-right">Tiempo Muerto</th>
                    <th className="p-2.5">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E1D9]">
                  {historial.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-2.5 font-medium text-[#1C1C1A]">
                        {new Date(h.fecha).toLocaleDateString()}
                      </td>
                      <td className="p-2.5 flex items-center gap-1.5 text-[#5F5E5A]">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        {h.supervisor?.nombre || 'Supervisor'}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            h.estado === 'FINALIZADA'
                              ? 'bg-gray-100 text-gray-700'
                              : h.estado === 'TRABAJANDO'
                                ? 'bg-[#EAF3DE] text-[#27500A]'
                                : h.estado === 'TIEMPO_MUERTO'
                                  ? 'bg-[#FFF3E0] text-[#8C3B00]'
                                  : 'bg-[#E6F1FB] text-[#0C447C]'
                          }`}
                        >
                          {h.estado}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-[#27500A]">
                        {h.horasTrabajadas.toFixed(2)} hrs
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-[#C55A11]">
                        {h.horasTiempoMuerto.toFixed(2)} hrs
                      </td>
                      <td className="p-2.5 text-[#5F5E5A] max-w-xs truncate" title={h.notas || ''}>
                        {h.notas || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Pausa / Tiempo Muerto */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E3E1D9] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
              <h4 className="text-sm font-bold text-[#1C1C1A] flex items-center gap-2">
                <Pause className="w-4 h-4 text-[#C55A11]" />
                Pausar Trabajo y Contabilizar Tiempo Muerto
              </h4>
              <button
                onClick={() => setShowPauseModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#5F5E5A]">
              Se detendrá el reloj de trabajo y comenzará a sumarse tiempo muerto hasta que reanudes
              labores.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">
                Motivo del paro o retraso (opcional):
              </label>
              <textarea
                value={motivoPausa}
                onChange={(e) => setMotivoPausa(e.target.value)}
                rows={3}
                placeholder="Ej. Lluvia intensa, falta de permiso de trabajo, material faltante..."
                className="w-full text-xs p-2.5 border border-[#C9C7BD] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C55A11]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPauseModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#5F5E5A] hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleCambiarEstado('TIEMPO_MUERTO', motivoPausa)}
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#C55A11] hover:bg-[#A04509] rounded-lg transition-all shadow-xs cursor-pointer"
              >
                Confirmar Pausa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Finalizar Jornada */}
      {showFinishModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E3E1D9] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
              <h4 className="text-sm font-bold text-[#1C1C1A] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-700" />
                Finalizar Jornada Laboral de Hoy
              </h4>
              <button
                onClick={() => setShowFinishModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#5F5E5A]">
              ¿Confirmas el cierre del día? Se detendrán todos los contadores de horas trabajadas y
              paros.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">
                Observaciones o notas de cierre (opcional):
              </label>
              <textarea
                value={notasCierre}
                onChange={(e) => setNotasCierre(e.target.value)}
                rows={3}
                placeholder="Ej. Jornada terminada conforme al plan diario..."
                className="w-full text-xs p-2.5 border border-[#C9C7BD] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-700"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFinishModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#5F5E5A] hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleFinalizarJornada}
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#1C1C1A] hover:bg-black rounded-lg transition-all shadow-xs cursor-pointer"
              >
                Finalizar Jornada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
