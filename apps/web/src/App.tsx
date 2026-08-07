import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import {
  LogOut,
  User,
  Shield,
  Layers,
  BarChart3,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Activity,
  ChevronDown,
  Calendar,
  Building,
  RefreshCw,
  Eye,
  Check,
  AlertCircle
} from 'lucide-react';

// Componente simple para proteger rutas privadas
function PrivateRoute({ children }: { children: React.ReactElement }) {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Interfaces de Datos
interface Hito {
  id: string;
  nombre: string;
  fechaObjetivo: string;
  estatus: 'pendiente' | 'completado' | 'atrasado';
}

interface ReconciliationItem {
  materialId: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cotizado: number;
  recibido: number;
  declaradoCliente: number;
  instalado: number;
  discrepancia: number;
}

interface Incidente {
  id: string;
  categoria: string;
  descripcion: string;
  fecha: string;
  latitud?: number;
  longitud?: number;
  evidenciaUrl?: string;
  estatus: 'abierto' | 'resuelto';
}

interface TiempoMuerto {
  id: string;
  frente: string;
  causa: string;
  duracion: number;
  fecha: string;
}

interface ProjectBrief {
  id: string;
  nombre: string;
  cliente: string;
  fechaInicio: string;
  fechaFinEstimada: string;
}

interface DashboardData {
  proyecto: ProjectBrief;
  kpis: {
    totalCotizado: number;
    totalInstalado: number;
    totalRecibido: number;
    avanceGeneral: number;
    totalTiemposMuertosHoras: number;
    openIncidentes: number;
    resolvedIncidentes: number;
  };
  hitos: Hito[];
  reconciliation: ReconciliationItem[];
  incidentes: Incidente[];
  tiemposMuertos: TiempoMuerto[];
}

function Dashboard() {
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : { email: 'usuario@tecnogam.com', rol: 'usuario', nombre: 'Usuario' };
  const isAdminOrSupervisor = user.rol === 'administrador' || user.rol === 'supervisor';

  const [projects, setProjects] = useState<ProjectBrief[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingIncidentId, setResolvingIncidentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'kpis' | 'materiales' | 'incidentes' | 'tiempos'>('kpis');

  // Cargar proyectos al iniciar
  useEffect(() => {
    fetchProjects();
  }, []);

  // Cargar datos de dashboard cuando cambia el proyecto seleccionado
  useEffect(() => {
    if (selectedProjectId) {
      fetchDashboardData(selectedProjectId);
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3000/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        throw new Error('No se pudieron obtener los proyectos.');
      }

      const data = await response.json();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener proyectos');
      setLoading(false);
    }
  };

  const fetchDashboardData = async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:3000/projects/${projectId}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar datos del dashboard.');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message || 'Error al obtener datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveIncidente = async (incidenteId: string) => {
    setResolvingIncidentId(incidenteId);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:3000/projects/incidentes/${incidenteId}/resolver`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('No se pudo resolver el incidente.');
      }

      // Recargar datos para refrescar la UI
      if (selectedProjectId) {
        await fetchDashboardData(selectedProjectId);
      }
    } catch (err: any) {
      alert(err.message || 'Error al resolver incidente');
    } finally {
      setResolvingIncidentId(null);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const handlePrint = () => {
    window.print();
  };

  if (error && projects.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-[#C23939] mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-[#1C1C1A] mb-2">Error de Conexión</h2>
        <p className="text-sm text-[#5F5E5A] max-w-md mb-6">{error}</p>
        <button
          onClick={fetchProjects}
          className="px-4 py-2 bg-[#1C1C1A] text-white rounded-lg text-sm hover:bg-[#3E3D39] transition-all cursor-pointer"
        >
          Reintentar Conexión
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex">
      {/* 1. SIDEBAR (Oculto en impresión) */}
      <aside className="w-64 bg-white border-r border-[#E3E1D9] flex flex-col justify-between shrink-0 print:hidden">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-[#E3E1D9] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1C1C1A] flex items-center justify-center text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-[#1C1C1A] text-sm tracking-tight">Tecnogam</span>
              <span className="block text-[10px] text-[#5F5E5A] font-medium leading-none">Gestor de Materiales</span>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('kpis')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'kpis' ? 'bg-[#F1EFE8] text-[#1C1C1A]' : 'text-[#5F5E5A] hover:bg-[#F7F7F5] hover:text-[#1C1C1A]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Vista General / Hitos
            </button>
            <button
              onClick={() => setActiveTab('materiales')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'materiales' ? 'bg-[#F1EFE8] text-[#1C1C1A]' : 'text-[#5F5E5A] hover:bg-[#F7F7F5] hover:text-[#1C1C1A]'
              }`}
            >
              <FileText className="w-4 h-4" />
              Conciliación Materiales
            </button>
            <button
              onClick={() => setActiveTab('incidentes')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'incidentes' ? 'bg-[#F1EFE8] text-[#1C1C1A]' : 'text-[#5F5E5A] hover:bg-[#F7F7F5] hover:text-[#1C1C1A]'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Incidencias en Obra
              {dashboardData && dashboardData.kpis.openIncidentes > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-[#C23939] text-white text-[10px] font-bold flex items-center justify-center">
                  {dashboardData.kpis.openIncidentes}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('tiempos')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'tiempos' ? 'bg-[#F1EFE8] text-[#1C1C1A]' : 'text-[#5F5E5A] hover:bg-[#F7F7F5] hover:text-[#1C1C1A]'
              }`}
            >
              <Clock className="w-4 h-4" />
              Tiempos Muertos
            </button>
          </nav>
        </div>

        {/* Panel de Perfil */}
        <div className="p-4 border-t border-[#E3E1D9] space-y-3">
          <div className="flex items-center gap-3 p-2 bg-[#F7F7F5] rounded-xl border border-[#E3E1D9]">
            <div className="w-9 h-9 rounded-full bg-[#EAF3DE] flex items-center justify-center text-[#27500A]">
              <User className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="block text-xs font-semibold text-[#1C1C1A] truncate">{user.nombre}</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#E6F1FB] text-[#0C447C] text-[9px] font-bold capitalize">
                <Shield className="w-2.5 h-2.5" />
                {user.rol}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 h-9 border border-[#C9C7BD] hover:bg-[#FDE8E8] hover:border-[#F8B4B4] rounded-lg text-xs text-[#5F5E5A] hover:text-[#C23939] font-medium cursor-pointer transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* 2. CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 print:p-0">
        
        {/* Cabecera superior (Oculto en Impresión) */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#E3E1D9] print:hidden">
          <div>
            <span className="text-xs text-[#5F5E5A] font-semibold tracking-wider uppercase">Panel Administrativo</span>
            <h1 className="text-2xl font-bold text-[#1C1C1A] mt-0.5">Control de Materiales y Avances</h1>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Selector de Proyecto */}
            <div className="relative flex-1 md:flex-none">
              <Building className="w-4 h-4 text-[#8B8A84] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full md:w-64 h-10 pl-9 pr-8 bg-white border border-[#C9C7BD] rounded-xl text-sm font-semibold text-[#1C1C1A] hover:border-[#1C1C1A] transition-all cursor-pointer appearance-none"
              >
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#5F5E5A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={handlePrint}
              disabled={loading || !dashboardData}
              className="flex items-center gap-2 h-10 px-4 bg-[#1C1C1A] text-white hover:bg-[#3E3D39] disabled:opacity-50 rounded-xl text-sm font-bold transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Exportar PDF
            </button>
          </div>
        </header>

        {/* Cabecera del Reporte para Impresión (Solo Visible en PDF) */}
        <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold text-black uppercase">Reporte de Conciliación e Ingeniería</h1>
              <p className="text-sm text-gray-700 mt-1">Empresa: Tecnogam S.A. de C.V.</p>
              {dashboardData && (
                <p className="text-sm text-black font-bold mt-2">
                  Proyecto: {dashboardData.proyecto.nombre} | Cliente: {dashboardData.proyecto.cliente}
                </p>
              )}
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Fecha de Emisión: {new Date().toLocaleDateString()}</p>
              <p>Generado por: {user.nombre} ({user.rol})</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-10 h-10 text-[#0C447C] animate-spin mb-4" />
            <p className="text-sm font-medium text-[#5F5E5A]">Cargando información consolidada...</p>
          </div>
        ) : dashboardData ? (
          <div className="space-y-6">
            
            {/* FICHA TÉCNICA DEL PROYECTO SELECCIONADO */}
            <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-1">
                <span className="text-[10px] bg-[#EAF3DE] text-[#27500A] font-bold px-2 py-0.5 rounded-full uppercase">
                  Proyecto Activo
                </span>
                <h2 className="text-lg font-bold text-[#1C1C1A]">{dashboardData.proyecto.nombre}</h2>
                <p className="text-sm text-[#5F5E5A] flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-[#8B8A84]" />
                  Cliente: <span className="font-semibold text-[#1C1C1A]">{dashboardData.proyecto.cliente}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="bg-[#F7F7F5] border border-[#E3E1D9] p-3 rounded-xl min-w-32">
                  <span className="block text-[#5F5E5A] mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Fecha Inicio
                  </span>
                  <span className="font-bold text-[#1C1C1A]">
                    {new Date(dashboardData.proyecto.fechaInicio).toLocaleDateString()}
                  </span>
                </div>
                <div className="bg-[#F7F7F5] border border-[#E3E1D9] p-3 rounded-xl min-w-32">
                  <span className="block text-[#5F5E5A] mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Fecha Estimada
                  </span>
                  <span className="font-bold text-[#1C1C1A]">
                    {new Date(dashboardData.proyecto.fechaFinEstimada).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* GRILLA DE KPIS DE CONTROL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* KPI 1: Avance General */}
              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#EAF3DE] flex items-center justify-center text-[#27500A] shrink-0">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-[#5F5E5A]">Avance General</span>
                  <span className="block text-2xl font-bold text-[#1C1C1A] leading-none mt-1">
                    {dashboardData.kpis.avanceGeneral.toFixed(1)}%
                  </span>
                  {/* Minibar */}
                  <div className="w-full bg-[#F7F7F5] h-1.5 rounded-full mt-2 overflow-hidden border border-[#E3E1D9]">
                    <div
                      className="bg-[#27500A] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(dashboardData.kpis.avanceGeneral, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* KPI 2: Materiales Conciliados */}
              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#E6F1FB] flex items-center justify-center text-[#0C447C] shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-[#5F5E5A]">Instalado / Cotizado</span>
                  <span className="block text-lg font-bold text-[#1C1C1A] mt-1">
                    {dashboardData.kpis.totalInstalado.toLocaleString()} / {dashboardData.kpis.totalCotizado.toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-[#5F5E5A]">Cantidad de materiales</span>
                </div>
              </div>

              {/* KPI 3: Incidentes Activos */}
              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  dashboardData.kpis.openIncidentes > 0 ? 'bg-[#FDE8E8] text-[#C23939]' : 'bg-[#EAF3DE] text-[#27500A]'
                }`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-[#5F5E5A]">Incidentes Activos</span>
                  <span className={`block text-2xl font-bold leading-none mt-1 ${
                    dashboardData.kpis.openIncidentes > 0 ? 'text-[#C23939]' : 'text-[#27500A]'
                  }`}>
                    {dashboardData.kpis.openIncidentes}
                  </span>
                  <span className="block text-[10px] text-[#5F5E5A] mt-1">
                    {dashboardData.kpis.resolvedIncidentes} incidentes resueltos
                  </span>
                </div>
              </div>

              {/* KPI 4: Horas de Paro */}
              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FCF4E6] flex items-center justify-center text-[#BA7517] shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-[#5F5E5A]">Tiempos Muertos</span>
                  <span className="block text-2xl font-bold text-[#1C1C1A] leading-none mt-1">
                    {dashboardData.kpis.totalTiemposMuertosHoras.toFixed(1)} hrs
                  </span>
                  <span className="block text-[10px] text-[#5F5E5A] mt-1">Demoras acumuladas</span>
                </div>
              </div>
            </div>

            {/* VISTA 1: GENERAL & HITOS (Tab Activa: kpis) */}
            {activeTab === 'kpis' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hitos */}
                <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
                    <h3 className="text-sm font-bold text-[#1C1C1A]">Cronograma e Hitos de Proyecto</h3>
                    <span className="text-xs text-[#5F5E5A] font-medium">{dashboardData.hitos.length} Hitos</span>
                  </div>

                  <div className="divide-y divide-[#E3E1D9]">
                    {dashboardData.hitos.map((hito) => {
                      let tagColor = 'bg-[#F7F7F5] text-[#5F5E5A]';
                      if (hito.estatus === 'completado') tagColor = 'bg-[#EAF3DE] text-[#27500A]';
                      if (hito.estatus === 'atrasado') tagColor = 'bg-[#FDE8E8] text-[#C23939]';

                      return (
                        <div key={hito.id} className="py-4 flex justify-between items-center gap-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-[#1C1C1A]">{hito.nombre}</h4>
                            <p className="text-xs text-[#5F5E5A] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#8B8A84]" />
                              Objetivo: {new Date(hito.fechaObjetivo).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${tagColor}`}>
                            {hito.estatus}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Resumen Conciliación Rápido */}
                <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm lg:col-span-1 space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1C1C1A] pb-2 border-b border-[#E3E1D9]">
                      Diferencial de Carga
                    </h3>

                    {/* Donut Chart visual con CSS Conic-Gradient */}
                    <div className="flex justify-center py-4">
                      <div
                        className="w-32 h-32 rounded-full flex items-center justify-center relative shadow-inner"
                        style={{
                          background: `conic-gradient(
                            #27500A 0% ${dashboardData.kpis.avanceGeneral}%, 
                            #0C447C ${dashboardData.kpis.avanceGeneral}% 100%
                          )`
                        }}
                      >
                        {/* Círculo interno blanco */}
                        <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow">
                          <span className="text-lg font-bold text-[#1C1C1A]">
                            {dashboardData.kpis.avanceGeneral.toFixed(0)}%
                          </span>
                          <span className="text-[9px] text-[#5F5E5A] uppercase tracking-wider">Instalado</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#27500A] rounded-full" />
                        <span className="text-[#5F5E5A] font-medium flex-1">Material Instalado:</span>
                        <span className="font-bold text-[#1C1C1A]">{dashboardData.kpis.totalInstalado.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#0C447C] rounded-full" />
                        <span className="text-[#5F5E5A] font-medium flex-1">Presupuesto Cotizado:</span>
                        <span className="font-bold text-[#1C1C1A]">{dashboardData.kpis.totalCotizado.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('materiales')}
                    className="w-full h-9 bg-transparent hover:bg-[#F7F7F5] border border-[#C9C7BD] text-xs font-bold text-[#1C1C1A] rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    Ver reporte de conciliación completo
                  </button>
                </div>
              </div>
            )}

            {/* VISTA 2: TABLA DE CONCILIACIÓN DE MATERIALES (Tab Activa: materiales) */}
            {activeTab === 'materiales' && (
              <div className="bg-white border border-[#E3E1D9] rounded-2xl shadow-sm overflow-hidden space-y-4 p-6">
                <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1A]">Reporte de Conciliación de Carga de Ingeniería</h3>
                    <p className="text-xs text-[#5F5E5A]">Comparativa entre presupuesto cotizado, recibido y avance real instalado.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E3E1D9] bg-[#F7F7F5] text-[#5F5E5A]">
                        <th className="p-3 font-semibold">Código</th>
                        <th className="p-3 font-semibold">Descripción</th>
                        <th className="p-3 font-semibold text-center">Unidad</th>
                        <th className="p-3 font-semibold text-right">Cotizado</th>
                        <th className="p-3 font-semibold text-right">Declarado Cliente</th>
                        <th className="p-3 font-semibold text-right">Real Recibido</th>
                        <th className="p-3 font-semibold text-right">Instalado Campo</th>
                        <th className="p-3 font-semibold text-right">Discrepancia +/-</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E1D9]">
                      {dashboardData.reconciliation.map((item) => {
                        const isShortage = item.discrepancia < 0;
                        const isOk = item.discrepancia === 0;

                        return (
                          <tr key={item.materialId} className="hover:bg-[#F7F7F5]/50 transition-colors">
                            <td className="p-3 font-bold text-[#1C1C1A]">{item.codigo}</td>
                            <td className="p-3 font-medium text-[#1C1C1A] max-w-xs truncate" title={item.descripcion}>
                              {item.descripcion}
                            </td>
                            <td className="p-3 text-center font-semibold text-[#5F5E5A] uppercase">{item.unidad}</td>
                            <td className="p-3 text-right font-bold text-[#1C1C1A]">{item.cotizado.toLocaleString()}</td>
                            <td className="p-3 text-right font-semibold text-[#5F5E5A]">{item.declaradoCliente.toLocaleString()}</td>
                            <td className="p-3 text-right font-bold text-[#0C447C]">{item.recibido.toLocaleString()}</td>
                            <td className="p-3 text-right font-bold text-[#27500A]">{item.instalado.toLocaleString()}</td>
                            <td className={`p-3 text-right font-bold ${
                              isOk ? 'text-gray-500' : isShortage ? 'text-[#C23939]' : 'text-blue-600'
                            }`}>
                              {item.discrepancia > 0 ? `+${item.discrepancia.toLocaleString()}` : item.discrepancia.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VISTA 3: BITÁCORA DE INCIDENTES (Tab Activa: incidentes) */}
            {activeTab === 'incidentes' && (
              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1A]">Bitácora de Incidentes de Obra</h3>
                    <p className="text-xs text-[#5F5E5A]">Reportes de anomalías, retrasos climatológicos o problemas de calidad.</p>
                  </div>
                </div>

                {dashboardData.incidentes.length === 0 ? (
                  <div className="text-center py-12 text-[#8B8A84] space-y-2">
                    <CheckCircle className="w-12 h-12 text-[#27500A] mx-auto opacity-40" />
                    <p className="text-sm font-semibold">Sin incidentes reportados</p>
                    <p className="text-xs">No hay problemas reportados para este proyecto en este momento.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.incidentes.map((inc) => {
                      const isOpen = inc.estatus === 'abierto';

                      return (
                        <div
                          key={inc.id}
                          className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                            isOpen ? 'bg-red-50/20 border-red-100' : 'bg-gray-50/30 border-[#E3E1D9]'
                          }`}
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                inc.categoria === 'Seguridad' ? 'bg-[#FDE8E8] text-[#C23939]' : 'bg-[#FCF4E6] text-[#BA7517]'
                              }`}>
                                {inc.categoria}
                              </span>
                              <span className="text-[10px] text-[#5F5E5A]">
                                {new Date(inc.fecha).toLocaleDateString()} {new Date(inc.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-[#1C1C1A]">{inc.descripcion}</p>
                            
                            {inc.latitud && inc.longitud && (
                              <p className="text-[10px] text-[#8B8A84] font-medium">
                                GPS: {inc.latitud.toFixed(4)}, {inc.longitud.toFixed(4)}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                            {inc.evidenciaUrl && (
                              <a
                                href={inc.evidenciaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 h-8 px-3 border border-[#C9C7BD] hover:bg-white rounded-lg text-xs font-bold text-[#1C1C1A]"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Ver Foto
                              </a>
                            )}

                            {isOpen ? (
                              isAdminOrSupervisor ? (
                                <button
                                  onClick={() => handleResolveIncidente(inc.id)}
                                  disabled={resolvingIncidentId === inc.id}
                                  className="flex items-center gap-1 h-8 px-3 bg-[#27500A] text-white hover:bg-[#3E5C1B] disabled:opacity-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                >
                                  {resolvingIncidentId === inc.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  Marcar Resuelto
                                </button>
                              ) : (
                                <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                                  Pendiente
                                </span>
                              )
                            ) : (
                              <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#EAF3DE] text-[#27500A] text-[10px] font-bold uppercase">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Resuelto
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* VISTA 4: BITÁCORA DE TIEMPOS MUERTOS (Tab Activa: tiempos) */}
            {activeTab === 'tiempos' && (
              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1A]">Registro de Tiempos Muertos y Paros</h3>
                    <p className="text-xs text-[#5F5E5A]">Catálogo de horas perdidas clasificadas por frente de obra y causa.</p>
                  </div>
                </div>

                {dashboardData.tiemposMuertos.length === 0 ? (
                  <div className="text-center py-12 text-[#8B8A84] space-y-2">
                    <Clock className="w-12 h-12 text-[#BA7517] mx-auto opacity-40 animate-pulse" />
                    <p className="text-sm font-semibold">Sin paros reportados</p>
                    <p className="text-xs">No se han registrado tiempos muertos en este proyecto.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E3E1D9] bg-[#F7F7F5] text-[#5F5E5A]">
                          <th className="p-3 font-semibold">Fecha</th>
                          <th className="p-3 font-semibold">Frente de Trabajo</th>
                          <th className="p-3 font-semibold">Causa del Retraso</th>
                          <th className="p-3 font-semibold text-right">Duración (Horas)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E3E1D9]">
                        {dashboardData.tiemposMuertos.map((tm) => (
                          <tr key={tm.id} className="hover:bg-[#F7F7F5]/50 transition-colors">
                            <td className="p-3 text-[#1C1C1A]">
                              {new Date(tm.fecha).toLocaleDateString()}
                            </td>
                            <td className="p-3 font-bold text-[#1C1C1A]">{tm.frente}</td>
                            <td className="p-3 font-medium text-[#5F5E5A]">{tm.causa}</td>
                            <td className="p-3 text-right font-bold text-[#BA7517]">{tm.duracion.toFixed(1)} hrs</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-[#8B8A84]">
            <Layers className="w-12 h-12 opacity-30 mb-2" />
            <p className="text-sm font-semibold">Sin proyectos asignados</p>
            <p className="text-xs">Este usuario no está vinculado a ningún proyecto activo.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
