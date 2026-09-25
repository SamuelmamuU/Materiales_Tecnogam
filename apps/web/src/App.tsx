import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
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
  AlertCircle,
  Settings,
  Plus,
  Trash2,
  UserPlus,
  Edit,
  X,
  Camera,
  Upload,
  MapPin,
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
  diasAlerta?: number | null;
}

interface UserDetail {
  id: string;
  email: string;
  nombre: string;
  rol: 'administrador' | 'supervisor' | 'trabajador' | 'cliente';
  activo: boolean;
}

interface MemberDetail {
  id: string;
  usuarioId: string;
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
}

interface ProjectDetail extends ProjectBrief {
  hitos: Hito[];
  miembros: MemberDetail[];
  materialesCotizados: {
    id: string;
    materialId: string;
    cantidad: number;
    material: {
      id: string;
      codigo: string;
      descripcion: string;
      unidad: string;
      categoria: string;
    };
  }[];
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
  discrepancia?: number;
  faltante?: number;
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
  logoCliente?: string | null;
  liderCliente?: string | null;
  liderTecnogam?: string | null;
  fechaInicio: string;
  fechaFinEstimada: string;
  fechaCulminacion?: string | null;
  diasAlertaHito?: number | null;
}

function matchesAllWords(text: string, query: string): boolean {
  if (!query || !query.trim()) return true;
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const target = (text || '').toLowerCase();
  return words.every((w) => target.includes(w));
}

function getHitoSemaforo(hito: Hito, defaultAlertDays: number = 7) {
  if (hito.estatus === 'completado') {
    return {
      color: 'verde',
      label: 'Completado',
      badgeClass: 'bg-[#EAF3DE] text-[#27500A] border border-[#C0DD9D]',
      dotClass: 'bg-[#27500A]',
      daysRemaining: null,
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(hito.fechaObjetivo);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const threshold =
    hito.diasAlerta !== undefined && hito.diasAlerta !== null ? hito.diasAlerta : defaultAlertDays;

  if (diffDays < 0) {
    return {
      color: 'rojo',
      label: `Vencido (${Math.abs(diffDays)}d)`,
      badgeClass: 'bg-[#FDE8E8] text-[#C23939] border border-[#F8B4B4]',
      dotClass: 'bg-[#C23939]',
      daysRemaining: diffDays,
    };
  } else if (diffDays <= threshold) {
    return {
      color: 'naranja',
      label: diffDays === 0 ? 'Vence hoy' : `Próximo (${diffDays}d)`,
      badgeClass: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
      dotClass: 'bg-[#D97706]',
      daysRemaining: diffDays,
    };
  } else {
    return {
      color: 'verde',
      label: `En tiempo (${diffDays}d)`,
      badgeClass: 'bg-[#EAF3DE] text-[#27500A] border border-[#C0DD9D]',
      dotClass: 'bg-[#27500A]',
      daysRemaining: diffDays,
    };
  }
}

interface AvanceItem {
  id: string;
  tipo: 'planeado' | 'no_planeado';
  subtipo?: 'retrabajo' | 'extra' | 'modificacion';
  materialId?: string;
  materialManual?: string;
  cantidad: number;
  material?: {
    codigo: string;
    descripcion: string;
    unidad: string;
  };
}

interface AvanceRecord {
  id: string;
  fecha: string;
  frente: string;
  autorId: string;
  latitud?: number;
  longitud?: number;
  evidenciaUrl?: string;
  autor: {
    nombre: string;
    email: string;
  };
  items: AvanceItem[];
}

interface TimelinePoint {
  fecha: string;
  acumuladoReal: number;
  acumuladoPlaneado: number;
  diarioReal: number;
  diarioPlaneado: number;
}

interface MaterialExtraRecord {
  id: string;
  proyectoId: string;
  avanceItemId?: string;
  materialManual: string;
  cantidad: number;
  createdAt: string;
  avanceItem?: {
    id: string;
    subtipo?: 'retrabajo' | 'extra' | 'modificacion';
    avance?: {
      id: string;
      frente: string;
      fecha: string;
      autor?: {
        nombre: string;
        email: string;
      };
    };
  };
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
  materialesExtras?: MaterialExtraRecord[];
}

function Dashboard() {
  const navigate = useNavigate();
  const userJson = localStorage.getItem('user');
  const user = userJson
    ? JSON.parse(userJson)
    : { email: 'usuario@tecnogam.com', rol: 'usuario', nombre: 'Usuario' };
  const isAdmin = user.rol === 'administrador';
  const isAdminOrSupervisor = user.rol === 'administrador' || user.rol === 'supervisor';

  const [projects, setProjects] = useState<ProjectBrief[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Estados para Registro de Avances en Web (Supervisor / Administrador)
  const [showAvanceModal, setShowAvanceModal] = useState(false);
  const [avanceForm, setAvanceForm] = useState({
    frente: '',
    fecha: new Date().toISOString().split('T')[0],
    latitud: '',
    longitud: '',
    evidenciaUrl: '',
  });
  const [selectedEvidenciaFile, setSelectedEvidenciaFile] = useState<File | null>(null);
  const [generalMaterials, setGeneralMaterials] = useState<
    { id: string; codigo: string; descripcion: string; unidad: string; categoria?: string }[]
  >([]);

  interface LocalAvanceItem {
    tipo: 'planeado' | 'no_planeado';
    subtipo: 'retrabajo' | 'extra' | 'modificacion';
    materialId: string;
    materialCodigo: string;
    materialDescripcion: string;
    materialManual: string;
    cantidad: number;
  }
  const [avanceItemsList, setAvanceItemsList] = useState<LocalAvanceItem[]>([]);
  const [currentPlaneadoItem, setCurrentPlaneadoItem] = useState({ materialId: '', cantidad: '' });
  const [currentNoPlaneadoItem, setCurrentNoPlaneadoItem] = useState({
    subtipo: 'retrabajo' as 'retrabajo' | 'extra' | 'modificacion',
    materialManual: '',
    cantidad: '',
  });

  // Estado para edición de material extra / avance item
  const [editingAvanceItem, setEditingAvanceItem] = useState<{
    id: string;
    materialManual: string;
    cantidad: number;
    subtipo: 'retrabajo' | 'extra' | 'modificacion';
  } | null>(null);

  // Estados para gestión de BOM de materiales en admin
  const [selectedBOMMaterialId, setSelectedBOMMaterialId] = useState('');
  const [bomMaterialCantidad, setBomMaterialCantidad] = useState('');
  const [bomImportMode, setBomImportMode] = useState<'individual' | 'excel'>('individual');
  const [bomParsedPreview, setBomParsedPreview] = useState<any[]>([]);
  const [isImportingBOM, setIsImportingBOM] = useState(false);

  // Estados para autocompletar búsquedas de materiales
  const [bomSearchQuery, setBomSearchQuery] = useState('');
  const [showBomDropdown, setShowBomDropdown] = useState(false);
  const [avanceSearchQuery, setAvanceSearchQuery] = useState('');
  const [showAvanceDropdown, setShowAvanceDropdown] = useState(false);

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingIncidentId, setResolvingIncidentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'kpis' | 'materiales' | 'avances' | 'incidentes' | 'tiempos' | 'bom' | 'admin'
  >('kpis');

  // Estados del Historial de Avances (Fase 5)
  const [avancesHistory, setAvancesHistory] = useState<AvanceRecord[]>([]);
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [filterFechaInicio, setFilterFechaInicio] = useState<string>('');
  const [filterFechaFin, setFilterFechaFin] = useState<string>('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Estados de S-Curve y Timeline (Fase 7 / Tarea 5.5)
  const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);
  const [viewMode, setViewMode] = useState<'acumulado' | 'diario'>('acumulado');

  // Estados de Administración
  const [adminSubTab, setAdminSubTab] = useState<'proyectos' | 'usuarios'>('proyectos');
  const [allUsers, setAllUsers] = useState<UserDetail[]>([]);
  const [selectedAdminProject, setSelectedAdminProject] = useState<ProjectDetail | null>(null);

  // Modales y Formularios
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectBrief | null>(null);
  const [projectForm, setProjectForm] = useState({
    nombre: '',
    cliente: '',
    logoCliente: '',
    liderCliente: '',
    liderTecnogam: '',
    fechaInicio: '',
    fechaFinEstimada: '',
    fechaCulminacion: '',
    diasAlertaHito: 7,
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDetail | null>(null);
  const [userForm, setUserForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'trabajador',
    activo: true,
  });

  const [hitoForm, setHitoForm] = useState({
    nombre: '',
    fechaObjetivo: '',
    estatus: 'pendiente' as 'pendiente' | 'completado' | 'atrasado',
    diasAlerta: 7,
  });
  const [selectedMemberId, setSelectedMemberId] = useState('');

  // Selección múltiple para eliminar materiales del BOM
  const [selectedBOMMaterialIds, setSelectedBOMMaterialIds] = useState<string[]>([]);

  // Cargar proyectos al iniciar
  useEffect(() => {
    fetchProjects();
  }, []);

  // Cargar datos de dashboard cuando cambia el proyecto seleccionado o se cambia de pestaña
  useEffect(() => {
    if (selectedProjectId) {
      fetchDashboardData(selectedProjectId);
      fetchTimelineData(selectedProjectId);
      fetchAvancesHistory(selectedProjectId);
    }
  }, [selectedProjectId, activeTab]);

  // Cargar avances si se modifican los filtros
  useEffect(() => {
    if (selectedProjectId && activeTab === 'avances') {
      fetchAvancesHistory(selectedProjectId);
    }
  }, [filterTipo, filterFechaInicio, filterFechaFin, activeTab]);

  // Cargar datos de administración cuando se activa la pestaña de admin
  useEffect(() => {
    if (activeTab === 'admin' && isAdmin) {
      fetchAdminData();
    }
  }, [activeTab]);

  // Cargar catálogo de materiales general con debounce para búsqueda en BOM
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && activeTab === 'bom') {
      const delayDebounceFn = setTimeout(() => {
        fetchGeneralMaterials(bomSearchQuery);
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [bomSearchQuery, activeTab]);

  // Cargar catálogo de materiales general con debounce para búsqueda en Avances
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && showAvanceModal) {
      const delayDebounceFn = setTimeout(() => {
        fetchGeneralMaterials(avanceSearchQuery);
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [avanceSearchQuery, showAvanceModal]);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(API_URL + '/projects', {
        headers: {
          Authorization: `Bearer ${token}`,
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
      const response = await fetch(`${API_URL}/projects/${projectId}/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
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

  const fetchTimelineData = async (projectId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/projects/${projectId}/avances/timeline`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTimelineData(data);
      }
    } catch (_) {}
  };

  const fetchAvancesHistory = async (projectId: string) => {
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('accessToken');
      let url = `${API_URL}/projects/${projectId}/avances?`;
      if (filterTipo) url += `tipo=${filterTipo}&`;
      if (filterFechaInicio) url += `fechaInicio=${filterFechaInicio}&`;
      if (filterFechaFin) url += `fechaFin=${filterFechaFin}&`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAvancesHistory(data);
      }
    } catch (_) {}
    setLoadingHistory(false);
  };

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const usersRes = await fetch(API_URL + '/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAllUsers(usersData);
      }
    } catch (_) {}
  };

  const fetchProjectDetailForAdmin = async (projectId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedAdminProject(data);
      }
    } catch (_) {}
  };

  // --- CRUD Proyectos ---
  const handleOpenProjectEdit = (proj: ProjectBrief) => {
    setEditingProject(proj);
    setProjectForm({
      nombre: proj.nombre,
      cliente: proj.cliente,
      logoCliente: proj.logoCliente || '',
      liderCliente: proj.liderCliente || '',
      liderTecnogam: proj.liderTecnogam || '',
      fechaInicio: proj.fechaInicio ? proj.fechaInicio.split('T')[0] : '',
      fechaFinEstimada: proj.fechaFinEstimada ? proj.fechaFinEstimada.split('T')[0] : '',
      fechaCulminacion: proj.fechaCulminacion ? proj.fechaCulminacion.split('T')[0] : '',
      diasAlertaHito: proj.diasAlertaHito || 7,
    });
    setShowProjectModal(true);
  };

  const handleOpenCreateProject = () => {
    setEditingProject(null);
    setProjectForm({
      nombre: '',
      cliente: '',
      logoCliente: '',
      liderCliente: '',
      liderTecnogam: '',
      fechaInicio: '',
      fechaFinEstimada: '',
      fechaCulminacion: '',
      diasAlertaHito: 7,
    });
    setShowProjectModal(true);
  };

  const handleUploadImage = async (file: File): Promise<string | null> => {
    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/media/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let msg = 'Error al subir la imagen.';
        try {
          const errData = await response.json();
          msg = errData.message || msg;
        } catch {}
        throw new Error(msg);
      }

      const data = await response.json();
      return data.url;
    } catch (err: any) {
      console.error(err);
      // Fallback a Base64 en cliente si la red o servicio falla
      try {
        const reader = new FileReader();
        return await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch {
        alert('No se pudo subir la imagen: ' + (err.message || 'Error'));
        return null;
      }
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('El logo seleccionado no debe superar los 2 MB.');
      e.target.value = '';
      return;
    }

    setUploadingLogo(true);
    try {
      // Lectura inmediata en Data URI para previsualización instantánea
      const reader = new FileReader();
      const base64Url = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setProjectForm((prev) => ({ ...prev, logoCliente: base64Url }));
    } catch (err) {
      console.error('Error al procesar logo:', err);
      const url = await handleUploadImage(file);
      if (url) {
        setProjectForm((prev) => ({ ...prev, logoCliente: url }));
      }
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('accessToken');
      const isEdit = !!editingProject;
      const url = isEdit ? `${API_URL}/projects/${editingProject.id}` : API_URL + '/projects';

      const parseDateToIso = (val?: string | null) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString();
      };

      const payload = {
        nombre: projectForm.nombre.trim(),
        cliente: projectForm.cliente.trim(),
        logoCliente: projectForm.logoCliente?.trim() || null,
        liderCliente: projectForm.liderCliente?.trim() || null,
        liderTecnogam: projectForm.liderTecnogam?.trim() || null,
        fechaInicio: parseDateToIso(projectForm.fechaInicio) || new Date().toISOString(),
        fechaFinEstimada: parseDateToIso(projectForm.fechaFinEstimada) || new Date().toISOString(),
        fechaCulminacion: parseDateToIso(projectForm.fechaCulminacion),
        diasAlertaHito: Number(projectForm.diasAlertaHito) || 7,
      };

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errMsg = 'No se pudo guardar el proyecto.';
        try {
          const errData = await response.json();
          errMsg = Array.isArray(errData.message)
            ? errData.message.join(', ')
            : errData.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const updatedOrCreated = await response.json();

      setShowProjectModal(false);
      setEditingProject(null);
      setProjectForm({
        nombre: '',
        cliente: '',
        logoCliente: '',
        liderCliente: '',
        liderTecnogam: '',
        fechaInicio: '',
        fechaFinEstimada: '',
        fechaCulminacion: '',
        diasAlertaHito: 7,
      });

      await fetchProjects();

      const targetId = isEdit ? editingProject.id : updatedOrCreated?.id;
      if (targetId && (selectedProjectId === targetId || !selectedProjectId)) {
        setSelectedProjectId(targetId);
        await fetchDashboardData(targetId);
      }
      if (selectedAdminProject && selectedAdminProject.id === targetId) {
        await fetchProjectDetailForAdmin(targetId);
      }

      alert(isEdit ? 'Proyecto actualizado con éxito.' : 'Proyecto creado con éxito.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('¿Está seguro de eliminar este proyecto y todos sus datos relacionados?')) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('No se pudo eliminar el proyecto.');
      if (selectedProjectId === projectId) {
        setSelectedProjectId('');
        setDashboardData(null);
      }
      await fetchProjects();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- CRUD Hitos ---
  const handleAddHito = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminProject) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/projects/${selectedAdminProject.id}/hitos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: hitoForm.nombre,
          fechaObjetivo: new Date(hitoForm.fechaObjetivo).toISOString(),
          estatus: hitoForm.estatus,
          diasAlerta: Number(hitoForm.diasAlerta) || 7,
        }),
      });

      if (!response.ok) throw new Error('No se pudo agregar el hito.');
      setHitoForm({ nombre: '', fechaObjetivo: '', estatus: 'pendiente', diasAlerta: 7 });
      await fetchProjectDetailForAdmin(selectedAdminProject.id);
      if (selectedProjectId) {
        await fetchDashboardData(selectedProjectId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleHitoStatus = async (hito: Hito) => {
    const currentProjId =
      selectedAdminProject?.id || selectedProjectId || dashboardData?.proyecto?.id;
    if (!currentProjId) return;
    try {
      const token = localStorage.getItem('accessToken');
      const newStatus = hito.estatus === 'completado' ? 'pendiente' : 'completado';
      const response = await fetch(`${API_URL}/projects/${currentProjId}/hitos/${hito.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estatus: newStatus }),
      });
      if (!response.ok) throw new Error('No se pudo actualizar el estatus del hito.');
      if (selectedAdminProject) {
        await fetchProjectDetailForAdmin(selectedAdminProject.id);
      }
      if (selectedProjectId) {
        await fetchDashboardData(selectedProjectId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteHito = async (hitoId: string) => {
    if (!selectedAdminProject || !confirm('¿Eliminar este hito?')) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_URL}/projects/${selectedAdminProject.id}/hitos/${hitoId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error('No se pudo eliminar el hito.');
      await fetchProjectDetailForAdmin(selectedAdminProject.id);
      if (selectedProjectId) {
        await fetchDashboardData(selectedProjectId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- Miembros ---
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminProject || !selectedMemberId) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/projects/${selectedAdminProject.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ usuarioId: selectedMemberId }),
      });

      if (!response.ok) throw new Error('No se pudo asignar el miembro.');
      setSelectedMemberId('');
      await fetchProjectDetailForAdmin(selectedAdminProject.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedAdminProject || !confirm('¿Remover este miembro del proyecto?')) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_URL}/projects/${selectedAdminProject.id}/members/${userId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error('No se pudo remover el miembro.');
      await fetchProjectDetailForAdmin(selectedAdminProject.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUploadEvidencia = async (file: File): Promise<string | null> => {
    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/media/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let msg = 'Error al subir la imagen de evidencia.';
        try {
          const errData = await response.json();
          msg = errData.message || msg;
        } catch {}
        throw new Error(msg);
      }

      const data = await response.json();
      return data.url;
    } catch (err: any) {
      console.error('Error al subir evidencia vía API:', err);
      // Fallback seguro a Base64 en cliente
      try {
        const reader = new FileReader();
        return await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch {
        alert('No se pudo cargar la imagen de evidencia: ' + (err.message || 'Error'));
        return null;
      }
    }
  };

  const fetchGeneralMaterials = async (search?: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      let url = `${API_URL}/materials?limit=100`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setGeneralMaterials(data.data || []);
      } else {
        const errText = await response.text();
        console.error('Failed to fetch materials:', response.status, errText);
      }
    } catch (err: any) {
      console.error('Error fetching materials:', err);
    }
  };

  const handleAddPlaneadoItem = () => {
    if (!currentPlaneadoItem.materialId) {
      alert('Por favor seleccione un material.');
      return;
    }
    const qty = parseFloat(currentPlaneadoItem.cantidad);
    if (isNaN(qty) || qty <= 0) {
      alert('Por favor ingrese una cantidad válida mayor que cero.');
      return;
    }

    const projectMaterialsOptions = dashboardData?.reconciliation || [];
    const mat = projectMaterialsOptions.find(
      (o) => o.materialId === currentPlaneadoItem.materialId,
    );
    let matDesc = '';
    let matCodigo = '';

    if (mat) {
      matDesc = mat.descripcion;
      matCodigo = mat.codigo;
    } else {
      const genMat = generalMaterials.find((o) => o.id === currentPlaneadoItem.materialId);
      if (genMat) {
        matDesc = genMat.descripcion;
        matCodigo = genMat.codigo;
      }
    }

    const newItem: LocalAvanceItem = {
      tipo: 'planeado',
      subtipo: 'retrabajo',
      materialId: currentPlaneadoItem.materialId,
      materialCodigo: matCodigo || 'N/A',
      materialDescripcion: matDesc || 'Material',
      materialManual: '',
      cantidad: qty,
    };

    setAvanceItemsList([...avanceItemsList, newItem]);
    setCurrentPlaneadoItem({ materialId: '', cantidad: '' });
    setAvanceSearchQuery('');
  };

  const handleAddNoPlaneadoItem = () => {
    if (!currentNoPlaneadoItem.materialManual.trim()) {
      alert('Por favor ingrese la descripción del material manual.');
      return;
    }
    const qty = parseFloat(currentNoPlaneadoItem.cantidad);
    if (isNaN(qty) || qty <= 0) {
      alert('Por favor ingrese una cantidad válida mayor que cero.');
      return;
    }

    const newItem: LocalAvanceItem = {
      tipo: 'no_planeado',
      subtipo: currentNoPlaneadoItem.subtipo,
      materialId: '',
      materialCodigo: 'MANUAL',
      materialDescripcion: currentNoPlaneadoItem.materialManual.trim(),
      materialManual: currentNoPlaneadoItem.materialManual.trim(),
      cantidad: qty,
    };

    setAvanceItemsList([...avanceItemsList, newItem]);
    setCurrentNoPlaneadoItem({ subtipo: 'retrabajo', materialManual: '', cantidad: '' });
  };

  const handleSaveAvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avanceForm.frente.trim()) {
      alert('Por favor especifique el frente de trabajo.');
      return;
    }
    if (avanceItemsList.length === 0) {
      alert('Por favor agregue al menos un item de avance.');
      return;
    }

    const generateUUID = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };

    try {
      const token = localStorage.getItem('accessToken');
      let finalEvidenciaUrl = avanceForm.evidenciaUrl;

      if (selectedEvidenciaFile) {
        const uploadedUrl = await handleUploadEvidencia(selectedEvidenciaFile);
        if (uploadedUrl) {
          finalEvidenciaUrl = uploadedUrl;
        } else {
          return;
        }
      }

      const response = await fetch(`${API_URL}/avances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: generateUUID(),
          proyectoId: selectedProjectId,
          fecha: new Date(avanceForm.fecha).toISOString(),
          frente: avanceForm.frente.trim(),
          latitud: avanceForm.latitud ? parseFloat(avanceForm.latitud) : null,
          longitud: avanceForm.longitud ? parseFloat(avanceForm.longitud) : null,
          evidenciaUrl: finalEvidenciaUrl || null,
          items: avanceItemsList.map((it) => ({
            tipo: it.tipo,
            subtipo: it.tipo === 'no_planeado' ? it.subtipo : undefined,
            materialId: it.tipo === 'planeado' ? it.materialId : undefined,
            materialManual: it.tipo === 'no_planeado' ? it.materialManual : undefined,
            cantidad: parseFloat(it.cantidad.toString()),
          })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Error al guardar el reporte de avance.');
      }

      setShowAvanceModal(false);
      setAvanceForm({
        frente: '',
        fecha: new Date().toISOString().split('T')[0],
        latitud: '',
        longitud: '',
        evidenciaUrl: '',
      });
      setSelectedEvidenciaFile(null);
      setAvanceItemsList([]);
      setAvanceSearchQuery('');

      if (selectedProjectId) {
        await fetchAvancesHistory(selectedProjectId);
        await fetchDashboardData(selectedProjectId);
        await fetchTimelineData(selectedProjectId);
      }

      alert('Reporte de avance guardado exitosamente.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const parseCSVFile = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length <= 1) return [];

    // Auto-detect separator: comma (,) or semicolon (;)
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const separator = semicolonCount > commaCount ? ';' : ',';

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
    const codeIdx = headers.findIndex(
      (h) => h.includes('codigo') || h.includes('modelo') || h.includes('code'),
    );
    const descIdx = headers.findIndex(
      (h) => h.includes('descripcion') || h.includes('nombre') || h.includes('desc'),
    );
    const textIdx = headers.findIndex((h) => h.includes('unidad') || h.includes('unit'));
    const qtyIdx = headers.findIndex(
      (h) =>
        h.includes('cantidad') || h.includes('qty') || h.includes('cant') || h.includes('cotizado'),
    );
    const catIdx = headers.findIndex(
      (h) => h.includes('categoria') || h.includes('tipo') || h.includes('category'),
    );

    const parsedItems: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (row.length < 2) continue;

      const codigo = codeIdx !== -1 ? row[codeIdx] : '';
      const descripcion = descIdx !== -1 ? row[descIdx] : '';
      const unidad = textIdx !== -1 ? row[textIdx] : 'pza';
      const cantidadStr = qtyIdx !== -1 ? row[qtyIdx] : '';
      const categoria = catIdx !== -1 ? row[catIdx] : 'General';
      const cantidad = parseFloat(cantidadStr);

      if (!codigo || isNaN(cantidad)) continue;

      parsedItems.push({
        codigo,
        descripcion: descripcion || 'Material Importado',
        unidad: unidad || 'pza',
        categoria: categoria || 'General',
        cantidad,
      });
    }

    return parsedItems;
  };

  const handleAddBOMMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminProject || !selectedBOMMaterialId) return;
    const qty = parseFloat(bomMaterialCantidad);
    if (isNaN(qty) || qty <= 0) {
      alert('Ingrese una cantidad válida mayor a cero.');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/projects/${selectedAdminProject.id}/materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          materialId: selectedBOMMaterialId,
          cantidad: qty,
        }),
      });

      if (!response.ok) {
        throw new Error('No se pudo vincular el material.');
      }

      setSelectedBOMMaterialId('');
      setBomMaterialCantidad('');
      setBomSearchQuery('');
      await fetchProjectDetailForAdmin(selectedAdminProject.id);
      if (selectedProjectId) {
        fetchDashboardData(selectedProjectId);
        fetchTimelineData(selectedProjectId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteBOMMaterial = async (materialId: string) => {
    if (!selectedAdminProject || !confirm('¿Eliminar este material del presupuesto del proyecto?'))
      return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_URL}/projects/${selectedAdminProject.id}/materials/${materialId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error('No se pudo desvincular el material.');
      setSelectedBOMMaterialIds((prev) => prev.filter((id) => id !== materialId));
      await fetchProjectDetailForAdmin(selectedAdminProject.id);
      if (selectedProjectId) {
        fetchDashboardData(selectedProjectId);
        fetchTimelineData(selectedProjectId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAvanceItem = async (itemId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este registro de material extra del avance?'))
      return;
    try {
      const token = localStorage.getItem('accessToken');
      let response = await fetch(`${API_URL}/avances/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok && selectedProjectId) {
        response = await fetch(`${API_URL}/projects/${selectedProjectId}/extras/${itemId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'No se pudo eliminar el registro de material.');
      }
      if (selectedProjectId) {
        fetchAvancesHistory(selectedProjectId);
        fetchDashboardData(selectedProjectId);
        fetchTimelineData(selectedProjectId);
      }
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el registro.');
    }
  };

  const handleUpdateAvanceItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAvanceItem) return;
    if (editingAvanceItem.cantidad <= 0) {
      alert('La cantidad debe ser mayor a cero.');
      return;
    }
    try {
      const token = localStorage.getItem('accessToken');
      let response = await fetch(`${API_URL}/avances/items/${editingAvanceItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cantidad: Number(editingAvanceItem.cantidad),
          materialManual: editingAvanceItem.materialManual,
          subtipo: editingAvanceItem.subtipo,
        }),
      });
      if (!response.ok && selectedProjectId) {
        response = await fetch(`${API_URL}/projects/${selectedProjectId}/extras/${editingAvanceItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cantidad: Number(editingAvanceItem.cantidad),
            materialManual: editingAvanceItem.materialManual,
          }),
        });
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'No se pudo modificar el registro de material.');
      }
      setEditingAvanceItem(null);
      if (selectedProjectId) {
        fetchAvancesHistory(selectedProjectId);
        fetchDashboardData(selectedProjectId);
        fetchTimelineData(selectedProjectId);
      }
    } catch (err: any) {
      alert(err.message || 'Error al modificar el registro.');
    }
  };

  const handleDeleteMultipleBOMMaterials = async () => {
    if (!selectedAdminProject || selectedBOMMaterialIds.length === 0) return;
    if (
      !confirm(
        `¿Está seguro de eliminar los ${selectedBOMMaterialIds.length} materiales seleccionados del presupuesto?`,
      )
    )
      return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_URL}/projects/${selectedAdminProject.id}/materials/bulk-delete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            materialIds: selectedBOMMaterialIds,
          }),
        },
      );
      if (!response.ok) throw new Error('No se pudieron eliminar los materiales seleccionados.');
      setSelectedBOMMaterialIds([]);
      await fetchProjectDetailForAdmin(selectedAdminProject.id);
      if (selectedProjectId) {
        await fetchDashboardData(selectedProjectId);
        await fetchTimelineData(selectedProjectId);
      }
      alert('Materiales eliminados con éxito del presupuesto.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileUploadBOM = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if the file is binary (e.g. .xlsx)
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      alert(
        "El sistema no soporta archivos de Excel binarios (.xlsx / .xls) de forma directa. Por favor, abre tu archivo en Excel y guárdalo como 'CSV (delimitado por comas) (*.csv)' para poder importarlo.",
      );
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseCSVFile(text);
      if (parsed.length === 0) {
        alert(
          'No se pudieron leer filas válidas del archivo CSV. Verifica que contenga las columnas requeridas (Código/Modelo, Descripción, Unidad, Cantidad) y no esté vacío.',
        );
      }
      setBomParsedPreview(parsed);
    };
    reader.readAsText(file);
  };

  const handleConfirmImportBOM = async () => {
    if (!selectedAdminProject || bomParsedPreview.length === 0) return;
    setIsImportingBOM(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_URL}/projects/${selectedAdminProject.id}/materials/bulk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bomParsedPreview),
        },
      );

      if (!response.ok) {
        throw new Error('Error al importar la lista de materiales.');
      }

      setBomParsedPreview([]);
      const fileInput = document.getElementById('bom-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      await fetchProjectDetailForAdmin(selectedAdminProject.id);
      if (selectedProjectId) {
        await fetchDashboardData(selectedProjectId);
        await fetchTimelineData(selectedProjectId);
      }
      alert('Materiales importados con éxito.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsImportingBOM(false);
    }
  };

  // --- CRUD Usuarios ---
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('accessToken');
      const isEdit = !!editingUser;
      const url = isEdit ? `${API_URL}/users/${editingUser.id}` : API_URL + '/users';

      const payload: any = {
        nombre: userForm.nombre,
        email: userForm.email,
        rol: userForm.rol,
        activo: userForm.activo,
      };

      if (!isEdit || userForm.password) {
        payload.password = userForm.password;
      }

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('No se pudo guardar el usuario.');

      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ nombre: '', email: '', password: '', rol: 'trabajador', activo: true });
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Está seguro de eliminar este usuario?')) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('No se pudo eliminar el usuario.');
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolveIncidente = async (incidenteId: string) => {
    setResolvingIncidentId(incidenteId);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/projects/incidentes/${incidenteId}/resolver`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('No se pudo resolver el incidente.');
      }

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
    navigate('/login');
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Renderización del Gráfico S-Curve en SVG ---
  const renderSvgChart = () => {
    if (timelineData.length === 0) return null;

    const width = 650;
    const height = 240;
    const padding = 40;

    // Obtener valores máximos
    const maxVal =
      Math.max(
        ...timelineData.map((d) =>
          viewMode === 'acumulado'
            ? Math.max(d.acumuladoPlaneado, d.acumuladoReal)
            : Math.max(d.diarioPlaneado, d.diarioReal),
        ),
      ) || 100;

    const pointsCount = timelineData.length;

    // Mapeo de coordenadas
    const getX = (index: number) => padding + (index / (pointsCount - 1)) * (width - 2 * padding);
    const getY = (value: number) => height - padding - (value / maxVal) * (height - 2 * padding);

    if (viewMode === 'acumulado') {
      // 1. Generar línea de Planeado (Gris)
      const plannedPoints = timelineData
        .map((p, i) => `${getX(i).toFixed(1)},${getY(p.acumuladoPlaneado).toFixed(1)}`)
        .join(' ');

      // 2. Generar línea de Real (Verde)
      // Solo graficar hasta donde haya avances (evitando caer a cero si es futuro)
      // Buscamos el último punto reportado que tenga avance o sea antes de hoy
      const lastReportedIndex = timelineData
        .map((d) => d.diarioReal)
        .reduce((lastIdx, val, idx) => (val > 0 ? idx : lastIdx), 0);
      const realTimelinePoints = timelineData.slice(0, lastReportedIndex + 1);

      const realPoints = realTimelinePoints
        .map((p, i) => `${getX(i).toFixed(1)},${getY(p.acumuladoReal).toFixed(1)}`)
        .join(' ');

      // Generar área sombreada real
      const realAreaPoints =
        realTimelinePoints.length > 0
          ? `${getX(0).toFixed(1)},${(height - padding).toFixed(1)} ` +
            realPoints +
            ` ${getX(realTimelinePoints.length - 1).toFixed(1)},${(height - padding).toFixed(1)}`
          : '';

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Ejes y cuadrículas */}
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#E3E1D9"
            strokeWidth="1"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="#E3E1D9"
            strokeWidth="1"
          />
          <line
            x1={padding}
            y1={padding}
            x2={width - padding}
            y2={padding}
            stroke="#F1EFE8"
            strokeDasharray="3"
          />
          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="#F1EFE8"
            strokeDasharray="3"
          />

          {/* Área sombreada real */}
          {realAreaPoints && (
            <polygon points={realAreaPoints} fill="url(#realGrad)" opacity="0.15" />
          )}

          {/* Línea Planeado */}
          {plannedPoints && (
            <polyline
              points={plannedPoints}
              fill="none"
              stroke="#8B8A84"
              strokeWidth="2.5"
              strokeDasharray="4"
            />
          )}

          {/* Línea Real */}
          {realPoints && (
            <polyline points={realPoints} fill="none" stroke="#27500A" strokeWidth="3" />
          )}

          {/* Etiquetas sencillas */}
          <text x={padding} y={padding - 10} fill="#5F5E5A" fontSize="9" fontWeight="bold">
            {maxVal.toFixed(0)} u.
          </text>
          <text
            x={width - padding}
            y={height - padding + 15}
            fill="#5F5E5A"
            fontSize="9"
            textAnchor="end"
          >
            Final de Proyecto
          </text>
          <text x={padding} y={height - padding + 15} fill="#5F5E5A" fontSize="9">
            Inicio
          </text>

          {/* Degradado para el área */}
          <defs>
            <linearGradient id="realGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#27500A" />
              <stop offset="100%" stopColor="#27500A" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      );
    } else {
      // Vista diaria (Barras agrupadas)
      const barWidth = Math.max(2, (width - 2 * padding) / (pointsCount * 2.2));

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#E3E1D9"
            strokeWidth="1"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="#E3E1D9"
            strokeWidth="1"
          />

          {timelineData.map((d, i) => {
            const xPlanned = getX(i) - barWidth;
            const xReal = getX(i);
            const hPlanned = (d.diarioPlaneado / maxVal) * (height - 2 * padding);
            const hReal = (d.diarioReal / maxVal) * (height - 2 * padding);

            return (
              <g key={i}>
                {/* Barra planeado (Gris) */}
                <rect
                  x={xPlanned}
                  y={height - padding - hPlanned}
                  width={barWidth}
                  height={hPlanned}
                  fill="#C9C7BD"
                  opacity="0.6"
                  rx="1"
                />
                {/* Barra real (Verde) */}
                <rect
                  x={xReal}
                  y={height - padding - hReal}
                  width={barWidth}
                  height={hReal}
                  fill="#27500A"
                  rx="1"
                />
              </g>
            );
          })}

          <text x={padding} y={padding - 10} fill="#5F5E5A" fontSize="9" fontWeight="bold">
            {maxVal.toFixed(0)} u.
          </text>
        </svg>
      );
    }
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
            <img
              src="/TG.png"
              alt="Tecnogam"
              className="w-9 h-9 rounded-xl object-contain border border-[#E3E1D9] bg-white p-0.5 shrink-0 shadow-xs"
            />
            <div>
              <span className="font-bold text-[#1C1C1A] text-sm tracking-tight">Tecnogam</span>
              <span className="block text-[10px] text-[#5F5E5A] font-medium leading-none">
                Gestor de Materiales
              </span>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('kpis')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'kpis'
                  ? 'bg-[#F1EFE8] text-[#1C1C1A]'
                  : 'text-[#5F5E5A] hover:bg-[#F7F7F5] hover:text-[#1C1C1A]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Vista General / Hitos
            </button>
            <button
              onClick={() => setActiveTab('materiales')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'materiales'
                  ? 'bg-[#F1EFE8] text-[#1C1C1A]'
                  : 'text-[#5F5E5A] hover:bg-[#F7F7F5] hover:text-[#1C1C1A]'
              }`}
            >
              <FileText className="w-4 h-4" />
              Conciliación Materiales
            </button>
            <button
              onClick={() => setActiveTab('avances')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'avances'
                  ? 'bg-[#F1EFE8] text-[#1C1C1A]'
                  : 'text-[#5F5E5A] hover:bg-[#F7F7F5] hover:text-[#1C1C1A]'
              }`}
            >
              <Activity className="w-4 h-4" />
              Historial de Avances
            </button>
            <button
              onClick={() => setActiveTab('incidentes')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'incidentes'
                  ? 'bg-[#F1EFE8] text-[#1C1C1A]'
                  : 'text-[#5F5E5A] hover:bg-[#F7F7F5] hover:text-[#1C1C1A]'
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
                activeTab === 'tiempos'
                  ? 'bg-[#F1EFE8] text-[#1C1C1A]'
                  : 'text-[#5F5E5A] hover:bg-[#F7F7F5] hover:text-[#1C1C1A]'
              }`}
            >
              <Clock className="w-4 h-4" />
              Tiempos Muertos
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setActiveTab('bom');
                    if (selectedProjectId) {
                      fetchProjectDetailForAdmin(selectedProjectId);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    activeTab === 'bom'
                      ? 'bg-[#F1EFE8] text-[#1C1C1A]'
                      : 'text-[#5F5E5A] hover:bg-[#F7F7F5] hover:text-[#1C1C1A]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Presupuesto BOM
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-[#F1EFE8] text-[#1C1C1A]'
                      : 'text-[#5F5E5A] hover:bg-[#F7F7F5] hover:text-[#1C1C1A]'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Panel Administración
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Panel de Perfil */}
        <div className="p-4 border-t border-[#E3E1D9] space-y-3">
          <div className="flex items-center gap-3 p-2 bg-[#F7F7F5] rounded-xl border border-[#E3E1D9]">
            <div className="w-9 h-9 rounded-full bg-[#EAF3DE] flex items-center justify-center text-[#27500A]">
              <User className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="block text-xs font-semibold text-[#1C1C1A] truncate">
                {user.nombre}
              </span>
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
            <span className="text-xs text-[#5F5E5A] font-semibold tracking-wider uppercase">
              Panel Administrativo
            </span>
            <h1 className="text-2xl font-bold text-[#1C1C1A] mt-0.5">
              Control de Materiales y Avances
            </h1>
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
            <div className="flex items-center gap-4">
              <img src="/TG.png" alt="Tecnogam" className="h-14 w-auto object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-black uppercase">
                  Reporte de Conciliación e Ingeniería
                </h1>
                <p className="text-sm text-gray-700 mt-0.5">Empresa: Tecnogam S.A. de C.V.</p>
                {dashboardData && (
                  <p className="text-sm text-black font-bold mt-1">
                    Proyecto: {dashboardData.proyecto.nombre} | Cliente:{' '}
                    {dashboardData.proyecto.cliente}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Fecha de Emisión: {new Date().toLocaleDateString()}</p>
              <p>
                Generado por: {user.nombre} ({user.rol})
              </p>
            </div>
          </div>
        </div>

        {loading && activeTab !== 'admin' && activeTab !== 'avances' ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-10 h-10 text-[#0C447C] animate-spin mb-4" />
            <p className="text-sm font-medium text-[#5F5E5A]">
              Cargando información consolidada...
            </p>
          </div>
        ) : activeTab === 'admin' ? (
          // ================= PANELES DE ADMINISTRACIÓN (SOLO ADMIN) =================
          <div className="space-y-6">
            <div className="bg-white border border-[#E3E1D9] rounded-2xl p-4 shadow-sm flex gap-4">
              <button
                onClick={() => {
                  setAdminSubTab('proyectos');
                  setSelectedAdminProject(null);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  adminSubTab === 'proyectos'
                    ? 'bg-[#1C1C1A] text-white'
                    : 'text-[#5F5E5A] hover:bg-[#F7F7F5]'
                }`}
              >
                Proyectos e Hitos
              </button>
              <button
                onClick={() => setAdminSubTab('usuarios')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  adminSubTab === 'usuarios'
                    ? 'bg-[#1C1C1A] text-white'
                    : 'text-[#5F5E5A] hover:bg-[#F7F7F5]'
                }`}
              >
                Usuarios y Roles
              </button>
            </div>

            {/* SUB-TAB: PROYECTOS */}
            {adminSubTab === 'proyectos' && !selectedAdminProject && (
              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1A]">Catálogo de Proyectos</h3>
                    <p className="text-xs text-[#5F5E5A]">
                      Administre la lista global de proyectos vigentes.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenCreateProject}
                    className="flex items-center gap-1.5 h-9 px-3 bg-[#27500A] text-white hover:bg-[#3E5C1B] rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> Crear Proyecto
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E3E1D9] bg-[#F7F7F5] text-[#5F5E5A]">
                        <th className="p-3 font-semibold">Proyecto</th>
                        <th className="p-3 font-semibold">Cliente & Líderes</th>
                        <th className="p-3 font-semibold">Plazos</th>
                        <th className="p-3 font-semibold">Culminación</th>
                        <th className="p-3 font-semibold text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E1D9]">
                      {projects.map((proj) => (
                        <tr key={proj.id} className="hover:bg-[#F7F7F5]/50">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              {proj.logoCliente ? (
                                <img
                                  src={proj.logoCliente}
                                  alt={proj.cliente}
                                  className="w-8 h-8 rounded-lg object-contain border border-[#E3E1D9] bg-white p-0.5 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-[#F1EFE8] flex items-center justify-center text-[#5F5E5A] shrink-0 font-bold text-[10px]">
                                  {proj.nombre.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-[#1C1C1A] block">
                                  {proj.nombre}
                                </span>
                                <span className="text-[10px] text-[#5F5E5A]">{proj.cliente}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-[11px] text-[#5F5E5A] space-y-0.5">
                              <div>
                                Líder Cli:{' '}
                                <b className="text-[#1C1C1A]">{proj.liderCliente || '—'}</b>
                              </div>
                              <div>
                                Líder TG:{' '}
                                <b className="text-[#0C447C]">{proj.liderTecnogam || '—'}</b>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-[11px] text-[#5F5E5A]">
                              <div>Ini: {new Date(proj.fechaInicio).toLocaleDateString()}</div>
                              <div>Est: {new Date(proj.fechaFinEstimada).toLocaleDateString()}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            {proj.fechaCulminacion ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF3DE] text-[#27500A]">
                                <CheckCircle className="w-3 h-3" />
                                {new Date(proj.fechaCulminacion).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-[#8B8A84] italic">
                                En ejecución
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => fetchProjectDetailForAdmin(proj.id)}
                                className="h-7 px-2.5 border border-[#C9C7BD] hover:bg-[#F1EFE8] rounded text-[11px] font-bold text-[#1C1C1A] cursor-pointer"
                              >
                                Gestionar Hitos/Miembros
                              </button>
                              <button
                                onClick={() => handleOpenProjectEdit(proj)}
                                className="h-7 w-7 border border-[#C9C7BD] hover:bg-[#F1EFE8] flex items-center justify-center rounded text-[#5F5E5A] hover:text-[#1C1C1A] cursor-pointer"
                                title="Editar Proyecto"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProject(proj.id)}
                                className="h-7 w-7 border border-[#F8B4B4] hover:bg-[#FDE8E8] flex items-center justify-center rounded text-[#C23939] cursor-pointer"
                                title="Eliminar Proyecto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DETALLE Y GESTIÓN DE PROYECTO (HITOS Y MIEMBROS) */}
            {adminSubTab === 'proyectos' && selectedAdminProject && (
              <div className="space-y-6">
                <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <button
                        onClick={() => setSelectedAdminProject(null)}
                        className="text-xs text-[#0C447C] font-semibold hover:underline mb-2 block cursor-pointer"
                      >
                        &larr; Volver al listado de proyectos
                      </button>
                      <h2 className="text-xl font-bold text-[#1C1C1A]">
                        {selectedAdminProject.nombre}
                      </h2>
                      <p className="text-xs text-[#5F5E5A]">
                        Cliente: {selectedAdminProject.cliente}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
                      <h3 className="text-sm font-bold text-[#1C1C1A]">Hitos de Cronograma</h3>
                      <span className="text-[10px] text-[#5F5E5A]">
                        Semáforo por fecha y alerta
                      </span>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedAdminProject.hitos.map((hito) => {
                        const sem = getHitoSemaforo(hito, selectedAdminProject.diasAlertaHito || 7);
                        return (
                          <div
                            key={hito.id}
                            className="p-3 bg-[#F7F7F5] border border-[#E3E1D9] rounded-xl flex justify-between items-center text-xs"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#1C1C1A] truncate">
                                  {hito.nombre}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 flex items-center gap-1 ${sem.badgeClass}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${sem.dotClass}`}
                                  ></span>
                                  {sem.label}
                                </span>
                              </div>
                              <span className="text-[10px] text-[#5F5E5A] block">
                                Plazo: {new Date(hito.fechaObjetivo).toLocaleDateString()} | Alerta
                                preventiva:{' '}
                                {hito.diasAlerta ?? (selectedAdminProject.diasAlertaHito || 7)} días
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={() => handleToggleHitoStatus(hito)}
                                title={
                                  hito.estatus === 'completado'
                                    ? 'Marcar como pendiente'
                                    : 'Marcar como completado'
                                }
                                className={`h-7 px-2 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                  hito.estatus === 'completado'
                                    ? 'bg-[#EAF3DE] text-[#27500A] hover:bg-[#D5EAC3]'
                                    : 'bg-white border border-[#C9C7BD] text-[#1C1C1A] hover:bg-[#F1EFE8]'
                                }`}
                              >
                                {hito.estatus === 'completado' ? '✓ Completado' : 'Completar'}
                              </button>
                              <button
                                onClick={() => handleDeleteHito(hito.id)}
                                className="h-7 w-7 text-[#C23939] hover:bg-[#FDE8E8] rounded flex items-center justify-center transition-all cursor-pointer"
                                title="Eliminar Hito"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <form
                      onSubmit={handleAddHito}
                      className="pt-4 border-t border-[#E3E1D9] space-y-3"
                    >
                      <span className="block text-xs font-semibold text-[#1C1C1A]">
                        Agregar Hito
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Nombre del Hito"
                          required
                          value={hitoForm.nombre}
                          onChange={(e) => setHitoForm({ ...hitoForm, nombre: e.target.value })}
                          className="h-9 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-lg text-xs"
                        />
                        <input
                          type="date"
                          required
                          value={hitoForm.fechaObjetivo}
                          onChange={(e) =>
                            setHitoForm({ ...hitoForm, fechaObjetivo: e.target.value })
                          }
                          className="h-9 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-lg text-xs"
                        />
                        <input
                          type="number"
                          min={1}
                          max={60}
                          placeholder="Días alerta naranja (ej. 7)"
                          title="Días previos a la fecha objetivo para cambiar el semáforo a naranja"
                          value={hitoForm.diasAlerta}
                          onChange={(e) =>
                            setHitoForm({ ...hitoForm, diasAlerta: parseInt(e.target.value) || 7 })
                          }
                          className="h-9 px-2 bg-[#F7F7F5] border border-[#C9C7BD] rounded-lg text-xs"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full h-9 bg-[#1C1C1A] hover:bg-[#3E3D39] text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
                      >
                        Guardar Hito
                      </button>
                    </form>
                  </div>

                  <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-[#1C1C1A] pb-2 border-b border-[#E3E1D9]">
                      Miembros de Obra
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedAdminProject.miembros.map((memb) => (
                        <div
                          key={memb.id}
                          className="p-3 bg-[#F7F7F5] border border-[#E3E1D9] rounded-xl flex justify-between items-center text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#1C1C1A] block">
                              {memb.usuario.nombre}
                            </span>
                            <span className="text-[10px] text-[#5F5E5A] capitalize">
                              {memb.usuario.rol} ({memb.usuario.email})
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(memb.usuarioId)}
                            className="h-7 w-7 text-[#C23939] hover:bg-[#FDE8E8] rounded flex items-center justify-center transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <form
                      onSubmit={handleAddMember}
                      className="pt-4 border-t border-[#E3E1D9] space-y-3"
                    >
                      <span className="block text-xs font-semibold text-[#1C1C1A]">
                        Vincular Miembro
                      </span>
                      <div className="flex gap-2">
                        <select
                          required
                          value={selectedMemberId}
                          onChange={(e) => setSelectedMemberId(e.target.value)}
                          className="h-9 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-lg text-xs flex-1 cursor-pointer"
                        >
                          <option value="">Seleccione un usuario...</option>
                          {allUsers
                            .filter(
                              (u) =>
                                u.activo &&
                                !selectedAdminProject.miembros.some((m) => m.usuarioId === u.id),
                            )
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.nombre} ({u.rol})
                              </option>
                            ))}
                        </select>
                        <button
                          type="submit"
                          className="h-9 px-4 bg-[#1C1C1A] hover:bg-[#3E3D39] text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Asignar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB: USUARIOS */}
            {adminSubTab === 'usuarios' && (
              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1A]">Catálogo de Usuarios</h3>
                    <p className="text-xs text-[#5F5E5A]">
                      Gestione el acceso al sistema y asigne perfiles.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setUserForm({
                        nombre: '',
                        email: '',
                        password: '',
                        rol: 'trabajador',
                        activo: true,
                      });
                      setShowUserModal(true);
                    }}
                    className="flex items-center gap-1.5 h-9 px-3 bg-[#27500A] text-white hover:bg-[#3E5C1B] rounded-lg text-xs font-bold cursor-pointer transition-all"
                  >
                    <UserPlus className="w-4 h-4" /> Crear Usuario
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E3E1D9] bg-[#F7F7F5] text-[#5F5E5A]">
                        <th className="p-3 font-semibold">Nombre</th>
                        <th className="p-3 font-semibold">Email</th>
                        <th className="p-3 font-semibold">Rol</th>
                        <th className="p-3 font-semibold text-center">Estado</th>
                        <th className="p-3 font-semibold text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E1D9]">
                      {allUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-[#F7F7F5]/50">
                          <td className="p-3 font-bold text-[#1C1C1A]">{u.nombre}</td>
                          <td className="p-3 text-[#5F5E5A] font-semibold">{u.email}</td>
                          <td className="p-3 text-[#0C447C] font-bold capitalize">{u.rol}</td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                u.activo
                                  ? 'bg-[#EAF3DE] text-[#27500A]'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {u.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setUserForm({
                                    nombre: u.nombre,
                                    email: u.email,
                                    password: '',
                                    rol: u.rol,
                                    activo: u.activo,
                                  });
                                  setShowUserModal(true);
                                }}
                                className="h-7 w-7 border border-[#C9C7BD] hover:bg-[#F1EFE8] flex items-center justify-center rounded text-[#5F5E5A] hover:text-[#1C1C1A] cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="h-7 w-7 border border-[#F8B4B4] hover:bg-[#FDE8E8] flex items-center justify-center rounded text-[#C23939] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'bom' && isAdmin ? (
          <div className="space-y-6">
            {!selectedAdminProject ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm">
                <RefreshCw className="w-10 h-10 text-[#0C447C] animate-spin mb-4" />
                <p className="text-sm font-medium text-[#5F5E5A]">
                  Cargando presupuesto de materiales (BOM)...
                </p>
              </div>
            ) : (
              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm space-y-6">
                <div className="border-b border-[#E3E1D9] pb-3 flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1A]">
                      BOM de Materiales del Proyecto
                    </h3>
                    <p className="text-xs text-[#5F5E5A]">
                      Defina los materiales cotizados y sus cantidades contratadas para el proyecto
                      activo: <b>{selectedAdminProject.nombre}</b>.
                    </p>
                  </div>

                  <div className="flex gap-2 bg-[#F1EFE8] p-1 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setBomImportMode('individual');
                        setBomParsedPreview([]);
                      }}
                      className={`h-7 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                        bomImportMode === 'individual'
                          ? 'bg-white text-[#1C1C1A] shadow-xs'
                          : 'text-[#5F5E5A] hover:text-[#1C1C1A]'
                      }`}
                    >
                      Vincular BD Mat TG
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBomImportMode('excel');
                        setBomParsedPreview([]);
                      }}
                      className={`h-7 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                        bomImportMode === 'excel'
                          ? 'bg-white text-[#1C1C1A] shadow-xs'
                          : 'text-[#5F5E5A] hover:text-[#1C1C1A]'
                      }`}
                    >
                      Importar Excel / CSV
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Panel Izquierdo: Carga de Datos */}
                  <div className="lg:col-span-1 p-4 bg-[#F7F7F5] border border-[#E3E1D9] rounded-xl space-y-4">
                    {bomImportMode === 'individual' ? (
                      <form onSubmit={handleAddBOMMaterial} className="space-y-3">
                        <span className="block text-xs font-bold text-[#1C1C1A]">
                          Vincular Material desde BD Mat Tecnogam
                        </span>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">
                            Material
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Escribe para buscar y filtrar catálogo..."
                              value={bomSearchQuery}
                              onChange={(e) => {
                                setBomSearchQuery(e.target.value);
                                setSelectedBOMMaterialId('');
                                setShowBomDropdown(true);
                              }}
                              onFocus={() => setShowBomDropdown(true)}
                              onBlur={() => setTimeout(() => setShowBomDropdown(false), 200)}
                              className="w-full h-9 px-3 bg-white border border-[#C9C7BD] rounded-lg text-xs animate-in fade-in duration-200"
                            />
                            {showBomDropdown && (
                              <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-[#E3E1D9] rounded-xl shadow-lg z-50 divide-y divide-[#E3E1D9]">
                                {generalMaterials
                                  .filter(
                                    (m) =>
                                      !(selectedAdminProject.materialesCotizados || []).some(
                                        (c: any) => c.materialId === m.id,
                                      ),
                                  )
                                  .filter((m) =>
                                    matchesAllWords(
                                      `${m.codigo} ${m.descripcion} ${m.categoria || ''}`,
                                      bomSearchQuery,
                                    ),
                                  ).length === 0 ? (
                                  <div className="p-3 text-xs text-[#8B8A84] text-center bg-[#F7F7F5]">
                                    No se encontraron materiales. Escribe palabras clave para
                                    buscar.
                                  </div>
                                ) : (
                                  generalMaterials
                                    .filter(
                                      (m) =>
                                        !(selectedAdminProject.materialesCotizados || []).some(
                                          (c: any) => c.materialId === m.id,
                                        ),
                                    )
                                    .filter((m) =>
                                      matchesAllWords(
                                        `${m.codigo} ${m.descripcion} ${m.categoria || ''}`,
                                        bomSearchQuery,
                                      ),
                                    )
                                    .map((m) => (
                                      <button
                                        key={m.id}
                                        type="button"
                                        onMouseDown={() => {
                                          setSelectedBOMMaterialId(m.id);
                                          setBomSearchQuery(`${m.codigo} - ${m.descripcion}`);
                                          setShowBomDropdown(false);
                                        }}
                                        className="w-full text-left p-2.5 hover:bg-[#F7F7F5] transition-colors text-xs flex flex-col cursor-pointer"
                                      >
                                        <span className="font-bold text-[#1C1C1A]">{m.codigo}</span>
                                        <span className="text-[#5F5E5A] truncate">
                                          {m.descripcion} ({m.unidad})
                                        </span>
                                      </button>
                                    ))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">
                            Cantidad Presupuestada (Cotizada)
                          </label>
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="Ej. 100"
                            value={bomMaterialCantidad}
                            onChange={(e) => setBomMaterialCantidad(e.target.value)}
                            className="w-full h-9 px-2 bg-white border border-[#C9C7BD] rounded-lg text-xs"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full h-9 bg-[#1C1C1A] hover:bg-[#3E3D39] text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Agregar Material
                        </button>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <span className="block text-xs font-bold text-[#1C1C1A]">
                          Carga de Archivo Excel / CSV
                        </span>
                        <p className="text-[10px] text-[#5F5E5A]">
                          Suba un archivo con columnas correspondientes a: <b>Codigo/Modelo</b>,{' '}
                          <b>Descripcion</b>, <b>Unidad</b> y <b>Cantidad/Cotizado</b>.
                        </p>

                        <div className="space-y-2">
                          <input
                            type="file"
                            id="bom-file-input"
                            accept=".csv,.txt"
                            onChange={handleFileUploadBOM}
                            className="w-full text-xs text-[#5F5E5A]
                              file:mr-2 file:py-1 file:px-3
                              file:rounded-lg file:border-0
                              file:text-xs file:font-semibold
                              file:bg-[#F1EFE8] file:text-[#1C1C1A]
                              hover:file:bg-[#E3E1D9]
                              cursor-pointer"
                          />
                        </div>

                        {bomParsedPreview.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-[#E3E1D9]">
                            <span className="text-[10px] font-bold text-[#27500A] block">
                              Se leyeron {bomParsedPreview.length} materiales.
                            </span>
                            <button
                              type="button"
                              onClick={handleConfirmImportBOM}
                              disabled={isImportingBOM}
                              className="w-full h-9 bg-[#27500A] hover:bg-[#1E3F07] text-white text-xs font-bold rounded-lg cursor-pointer disabled:bg-gray-400"
                            >
                              {isImportingBOM
                                ? 'Importando...'
                                : 'Confirmar e Importar al Proyecto'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Panel Derecho: Lista de Materiales Cotizados */}
                  <div className="lg:col-span-2 space-y-3">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <span className="block text-xs font-bold text-[#1C1C1A]">
                        Materiales Cotizados en el Proyecto (
                        {(selectedAdminProject.materialesCotizados || []).length})
                      </span>
                      {selectedBOMMaterialIds.length > 0 && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1 rounded-xl text-xs animate-in fade-in">
                          <span className="font-bold text-red-700">
                            {selectedBOMMaterialIds.length} seleccionados
                          </span>
                          <button
                            type="button"
                            onClick={handleDeleteMultipleBOMMaterials}
                            className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Eliminar Seleccionados
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBOMMaterialIds([])}
                            className="text-gray-500 hover:text-black underline text-[11px] cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Si hay vista previa de importación */}
                    {bomImportMode === 'excel' && bomParsedPreview.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-[#BA7517] uppercase">
                            Vista Previa de Importación
                          </span>
                          <button
                            type="button"
                            onClick={() => setBomParsedPreview([])}
                            className="text-[10px] text-red-600 hover:underline font-semibold"
                          >
                            Limpiar vista previa
                          </button>
                        </div>
                        <div className="border border-[#E3E1D9] rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="bg-[#FCF4E6] border-b border-[#E3E1D9] text-[#BA7517] font-semibold">
                                <th className="p-2">Código</th>
                                <th className="p-2">Descripción</th>
                                <th className="p-2 text-center">Unidad</th>
                                <th className="p-2 text-right">Cantidad</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E3E1D9] bg-white">
                              {bomParsedPreview.map((item, idx) => (
                                <tr key={idx} className="hover:bg-[#F7F7F5]/30">
                                  <td className="p-2 font-bold text-[#1C1C1A]">{item.codigo}</td>
                                  <td className="p-2 text-[#5F5E5A] truncate max-w-xs">
                                    {item.descripcion}
                                  </td>
                                  <td className="p-2 text-center text-[#8B8A84] uppercase">
                                    {item.unidad}
                                  </td>
                                  <td className="p-2 text-right font-bold text-[#1C1C1A]">
                                    {item.cantidad.toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (selectedAdminProject.materialesCotizados || []).length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-[#C9C7BD] rounded-xl text-xs text-[#8B8A84] bg-[#F7F7F5]">
                        No hay materiales cargados en el presupuesto de este proyecto. Use los
                        controles de la izquierda para vincular o importar.
                      </div>
                    ) : (
                      <div className="border border-[#E3E1D9] rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#F7F7F5] border-b border-[#E3E1D9] text-[#5F5E5A] font-semibold">
                              <th className="p-2.5 w-10 text-center">
                                <input
                                  type="checkbox"
                                  className="cursor-pointer rounded border-[#C9C7BD]"
                                  title="Seleccionar todos los materiales"
                                  checked={
                                    (selectedAdminProject.materialesCotizados || []).length > 0 &&
                                    selectedBOMMaterialIds.length ===
                                      (selectedAdminProject.materialesCotizados || []).length
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedBOMMaterialIds(
                                        (selectedAdminProject.materialesCotizados || []).map(
                                          (c: any) => c.materialId,
                                        ),
                                      );
                                    } else {
                                      setSelectedBOMMaterialIds([]);
                                    }
                                  }}
                                />
                              </th>
                              <th className="p-2.5">Código</th>
                              <th className="p-2.5">Descripción</th>
                              <th className="p-2.5 text-center">Unidad</th>
                              <th className="p-2.5 text-right">Cotizado</th>
                              <th className="p-2.5 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E3E1D9] bg-white">
                            {(selectedAdminProject.materialesCotizados || []).map((cot: any) => (
                              <tr
                                key={cot.id}
                                className={`hover:bg-[#F7F7F5]/30 ${selectedBOMMaterialIds.includes(cot.materialId) ? 'bg-red-50/40' : ''}`}
                              >
                                <td className="p-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    className="cursor-pointer rounded border-[#C9C7BD]"
                                    checked={selectedBOMMaterialIds.includes(cot.materialId)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedBOMMaterialIds([
                                          ...selectedBOMMaterialIds,
                                          cot.materialId,
                                        ]);
                                      } else {
                                        setSelectedBOMMaterialIds(
                                          selectedBOMMaterialIds.filter(
                                            (id) => id !== cot.materialId,
                                          ),
                                        );
                                      }
                                    }}
                                  />
                                </td>
                                <td className="p-2.5 font-bold text-[#1C1C1A]">
                                  {cot.material.codigo}
                                </td>
                                <td
                                  className="p-2.5 text-[#5F5E5A] truncate max-w-xs"
                                  title={cot.material.descripcion}
                                >
                                  {cot.material.descripcion}
                                </td>
                                <td className="p-2.5 text-center text-[#8B8A84] uppercase">
                                  {cot.material.unidad}
                                </td>
                                <td className="p-2.5 text-right font-bold text-[#1C1C1A]">
                                  {cot.cantidad.toLocaleString()}
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBOMMaterial(cot.materialId)}
                                    className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
                                    title="Eliminar material"
                                  >
                                    <Trash2 className="w-4 h-4 mx-auto" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : dashboardData ? (
          // ================= VISTAS ESTÁNDAR DEL DASHBOARD DE PROYECTO =================
          <div className="space-y-6">
            {/* FICHA TÉCNICA DEL PROYECTO SELECCIONADO */}
            <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-start sm:items-center gap-4 min-w-0">
                {/* Logo Cliente o Sin Logo */}
                {dashboardData.proyecto.logoCliente ? (
                  <div className="h-16 w-24 sm:w-28 shrink-0 bg-white border border-[#E3E1D9] rounded-xl p-1.5 flex items-center justify-center overflow-hidden shadow-2xs">
                    <img
                      src={dashboardData.proyecto.logoCliente}
                      alt={dashboardData.proyecto.cliente}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-16 w-24 sm:w-28 shrink-0 bg-[#F7F7F5] border border-dashed border-[#C9C7BD] rounded-xl flex flex-col items-center justify-center text-[#8B8A84] p-1 shadow-2xs">
                    <Building className="w-5 h-5 mb-0.5 opacity-40" />
                    <span className="text-[10px] font-medium">Sin Logo</span>
                  </div>
                )}

                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {dashboardData.proyecto.fechaCulminacion ? (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Proyecto Culminado
                      </span>
                    ) : (
                      <span className="text-[10px] bg-[#EAF3DE] text-[#27500A] font-bold px-2.5 py-0.5 rounded-full uppercase">
                        Proyecto En Ejecución
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-[#1C1C1A] tracking-tight truncate">
                    {dashboardData.proyecto.nombre}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5F5E5A]">
                    <span className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-[#8B8A84]" />
                      Cliente:{' '}
                      <b className="text-[#1C1C1A] font-semibold">
                        {dashboardData.proyecto.cliente}
                      </b>
                    </span>
                    <span className="text-[#C9C7BD] hidden sm:inline">•</span>
                    <span>
                      Líder Cliente:{' '}
                      <b className="text-[#1C1C1A] font-semibold">
                        {dashboardData.proyecto.liderCliente || 'No asignado'}
                      </b>
                    </span>
                    <span className="text-[#C9C7BD] hidden sm:inline">•</span>
                    <span>
                      Líder Tecnogam:{' '}
                      <b className="text-[#1C1C1A] font-semibold">
                        {dashboardData.proyecto.liderTecnogam || 'No asignado'}
                      </b>
                    </span>
                  </div>
                </div>
              </div>

              {/* Fechas y Botón Editar */}
              <div className="flex flex-wrap items-center gap-3 text-xs w-full lg:w-auto justify-start sm:justify-end">
                <div className="bg-[#F7F7F5] border border-[#E3E1D9] px-3.5 py-2 rounded-xl min-w-28">
                  <span className="block text-[10px] text-[#5F5E5A] mb-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#8B8A84]" /> Fecha Inicio
                  </span>
                  <span className="font-bold text-[#1C1C1A]">
                    {new Date(dashboardData.proyecto.fechaInicio).toLocaleDateString()}
                  </span>
                </div>

                <div className="bg-[#F7F7F5] border border-[#E3E1D9] px-3.5 py-2 rounded-xl min-w-28">
                  <span className="block text-[10px] text-[#5F5E5A] mb-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#8B8A84]" /> Fin Estimado
                  </span>
                  <span className="font-bold text-[#1C1C1A]">
                    {new Date(dashboardData.proyecto.fechaFinEstimada).toLocaleDateString()}
                  </span>
                </div>

                <div
                  className={`border px-3.5 py-2 rounded-xl min-w-28 ${
                    dashboardData.proyecto.fechaCulminacion
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-[#F7F7F5] border-[#E3E1D9]'
                  }`}
                >
                  <span className="block text-[10px] text-[#5F5E5A] mb-0.5 flex items-center gap-1">
                    <CheckCircle
                      className={`w-3 h-3 ${dashboardData.proyecto.fechaCulminacion ? 'text-emerald-600' : 'text-[#8B8A84]'}`}
                    />{' '}
                    Culminación
                  </span>
                  <span
                    className={`font-bold ${
                      dashboardData.proyecto.fechaCulminacion
                        ? 'text-emerald-700'
                        : 'text-[#8B8A84]'
                    }`}
                  >
                    {dashboardData.proyecto.fechaCulminacion
                      ? new Date(dashboardData.proyecto.fechaCulminacion).toLocaleDateString()
                      : 'En proceso'}
                  </span>
                </div>

                {isAdminOrSupervisor && (
                  <button
                    type="button"
                    onClick={() => handleOpenProjectEdit(dashboardData.proyecto)}
                    className="flex items-center gap-1.5 h-10 px-3.5 bg-white hover:bg-[#F7F7F5] text-[#1C1C1A] border border-[#C9C7BD] hover:border-[#1C1C1A] rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs"
                    title="Editar datos de la ficha técnica, logos, líderes y fecha de culminación"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#0C447C]" />
                    <span>Editar Ficha</span>
                  </button>
                )}
              </div>
            </div>

            {/* GRILLA DE KPIS DE CONTROL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#EAF3DE] flex items-center justify-center text-[#27500A] shrink-0">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-[#5F5E5A]">Avance General</span>
                  <span className="block text-2xl font-bold text-[#1C1C1A] leading-none mt-1">
                    {dashboardData.kpis.avanceGeneral.toFixed(1)}%
                  </span>
                  <div className="w-full bg-[#F7F7F5] h-1.5 rounded-full mt-2 overflow-hidden border border-[#E3E1D9]">
                    <div
                      className="bg-[#27500A] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(dashboardData.kpis.avanceGeneral, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#E6F1FB] flex items-center justify-center text-[#0C447C] shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-[#5F5E5A]">
                    Instalado / Cotizado
                  </span>
                  <span className="block text-lg font-bold text-[#1C1C1A] mt-1">
                    {dashboardData.kpis.totalInstalado.toLocaleString()} /{' '}
                    {dashboardData.kpis.totalCotizado.toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-[#5F5E5A]">Cantidad de materiales</span>
                </div>
              </div>

              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    dashboardData.kpis.openIncidentes > 0
                      ? 'bg-[#FDE8E8] text-[#C23939]'
                      : 'bg-[#EAF3DE] text-[#27500A]'
                  }`}
                >
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-[#5F5E5A]">
                    Incidentes Activos
                  </span>
                  <span
                    className={`block text-2xl font-bold leading-none mt-1 ${
                      dashboardData.kpis.openIncidentes > 0 ? 'text-[#C23939]' : 'text-[#27500A]'
                    }`}
                  >
                    {dashboardData.kpis.openIncidentes}
                  </span>
                  <span className="block text-[10px] text-[#5F5E5A] mt-1">
                    {dashboardData.kpis.resolvedIncidentes} incidentes resueltos
                  </span>
                </div>
              </div>

              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FCF4E6] flex items-center justify-center text-[#BA7517] shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-[#5F5E5A]">
                    Tiempos Muertos
                  </span>
                  <span className="block text-2xl font-bold text-[#1C1C1A] leading-none mt-1">
                    {dashboardData.kpis.totalTiemposMuertosHoras.toFixed(1)} hrs
                  </span>
                  <span className="block text-[10px] text-[#5F5E5A] mt-1">Demoras acumuladas</span>
                </div>
              </div>
            </div>

            {/* VISTA 1: GENERAL & HITOS */}
            {activeTab === 'kpis' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel S-Curve (Fase 7 / Tareas 7.2-7.4) */}
                <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
                    <div>
                      <h3 className="text-sm font-bold text-[#1C1C1A]">
                        Curva S de Avance Planeado vs Real
                      </h3>
                      <p className="text-[10px] text-[#5F5E5A]">
                        Progreso acumulado y diario a lo largo del cronograma de obra.
                      </p>
                    </div>
                    {/* Toggle general / diario (Tarea 7.2) */}
                    <div className="flex bg-[#F7F7F5] border border-[#E3E1D9] p-1 rounded-xl text-[10px] font-bold">
                      <button
                        onClick={() => setViewMode('acumulado')}
                        className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                          viewMode === 'acumulado'
                            ? 'bg-[#1C1C1A] text-white shadow-sm'
                            : 'text-[#5F5E5A]'
                        }`}
                      >
                        Acumulado
                      </button>
                      <button
                        onClick={() => setViewMode('diario')}
                        className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                          viewMode === 'diario'
                            ? 'bg-[#1C1C1A] text-white shadow-sm'
                            : 'text-[#5F5E5A]'
                        }`}
                      >
                        Diario
                      </button>
                    </div>
                  </div>

                  {/* Canvas del Gráfico SVG */}
                  <div className="h-60 flex items-center justify-center bg-[#F7F7F5]/50 border border-[#E3E1D9]/40 rounded-xl p-2">
                    {timelineData.length > 0 ? (
                      renderSvgChart()
                    ) : (
                      <span className="text-xs text-[#8B8A84] font-medium">
                        Sin datos de S-Curve
                      </span>
                    )}
                  </div>

                  {/* Leyenda del gráfico */}
                  <div className="flex gap-4 justify-center text-[10px] font-semibold text-[#5F5E5A]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 bg-[#27500A] border-t border-[#27500A]" />
                      <span>Avance Físico Real</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 bg-[#8B8A84] border-t border-dashed border-[#8B8A84]" />
                      <span>Línea Base Planeada (S-Curve)</span>
                    </div>
                  </div>
                </div>

                {/* Ficha Hitos con Semáforo */}
                <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm lg:col-span-1 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#1C1C1A]">Hitos Clave</h3>
                        <span className="text-[10px] bg-[#F7F7F5] border border-[#E3E1D9] text-[#5F5E5A] px-2 py-0.5 rounded-full font-bold">
                          {dashboardData.hitos.length}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#5F5E5A]">
                        Alerta: {dashboardData.proyecto.diasAlertaHito || 7}d
                      </span>
                    </div>

                    {dashboardData.hitos.length === 0 ? (
                      <div className="py-8 text-center text-xs text-[#8B8A84]">
                        Sin hitos registrados en este proyecto.
                      </div>
                    ) : (
                      <div className="divide-y divide-[#E3E1D9] max-h-60 overflow-y-auto pr-1 space-y-1">
                        {dashboardData.hitos.map((hito) => {
                          const sem = getHitoSemaforo(
                            hito,
                            dashboardData.proyecto.diasAlertaHito || 7,
                          );
                          return (
                            <div
                              key={hito.id}
                              className="py-2.5 flex justify-between items-center gap-2 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <span
                                  className={`font-bold block truncate ${hito.estatus === 'completado' ? 'line-through text-[#8B8A84]' : 'text-[#1C1C1A]'}`}
                                >
                                  {hito.nombre}
                                </span>
                                <span className="text-[10px] text-[#5F5E5A]">
                                  Plazo: {new Date(hito.fechaObjetivo).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 flex items-center gap-1 ${sem.badgeClass}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${sem.dotClass}`}
                                  ></span>
                                  {sem.label}
                                </span>
                                {isAdminOrSupervisor && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleHitoStatus(hito)}
                                    title={
                                      hito.estatus === 'completado'
                                        ? 'Marcar como pendiente'
                                        : 'Marcar como completado'
                                    }
                                    className={`h-6 w-6 rounded flex items-center justify-center transition-all cursor-pointer ${
                                      hito.estatus === 'completado'
                                        ? 'bg-[#EAF3DE] text-[#27500A] hover:bg-[#D5EAC3]'
                                        : 'bg-[#F7F7F5] border border-[#C9C7BD] text-[#5F5E5A] hover:text-[#1C1C1A]'
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Leyenda del Semáforo */}
                  <div className="pt-3 border-t border-[#E3E1D9] flex flex-wrap justify-between items-center gap-1 text-[9px] text-[#5F5E5A] font-semibold bg-[#F7F7F5] -mx-6 -mb-6 p-3 rounded-b-2xl">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#27500A]"></span>
                      En tiempo
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
                      Próximo (≤{dashboardData.proyecto.diasAlertaHito || 7}d)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#C23939]"></span>
                      Vencido
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 2: TABLA DE CONCILIACIÓN */}
            {activeTab === 'materiales' && (
              <div className="bg-white border border-[#E3E1D9] rounded-2xl shadow-sm overflow-hidden space-y-4 p-6">
                <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1A]">
                      Reporte de Conciliación de Carga de Ingeniería
                    </h3>
                    <p className="text-xs text-[#5F5E5A]">
                      Comparativa entre presupuesto cotizado, recibido y avance real instalado.
                    </p>
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
                        <th className="p-3 font-semibold text-right">Por Instalar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E1D9]">
                      {dashboardData.reconciliation.map((item) => {
                        const faltante =
                          typeof item.faltante === 'number'
                            ? Math.abs(item.faltante)
                            : Math.max(0, item.cotizado - item.instalado);
                        const hasFaltante = faltante > 0;

                        return (
                          <tr
                            key={item.materialId}
                            className="hover:bg-[#F7F7F5]/50 transition-colors"
                          >
                            <td className="p-3 font-bold text-[#1C1C1A]">{item.codigo}</td>
                            <td
                              className="p-3 font-medium text-[#1C1C1A] max-w-xs truncate"
                              title={item.descripcion}
                            >
                              {item.descripcion}
                            </td>
                            <td className="p-3 text-center font-semibold text-[#5F5E5A] uppercase">
                              {item.unidad}
                            </td>
                            <td className="p-3 text-right font-bold text-[#1C1C1A]">
                              {item.cotizado.toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-semibold text-[#5F5E5A]">
                              {item.declaradoCliente.toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-bold text-[#0C447C]">
                              {item.recibido.toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-bold text-[#27500A]">
                              {item.instalado.toLocaleString()}
                            </td>
                            <td
                              className={`p-3 text-right font-bold ${
                                hasFaltante ? 'text-[#C23939]' : 'text-[#27500A]'
                              }`}
                            >
                              {faltante.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VISTA 3: HISTORIAL DE AVANCES (Tab Activa: avances / Fase 5) */}
            {activeTab === 'avances' && (
              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="pb-2 border-b border-[#E3E1D9] flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1A]">
                      Bitácora Histórica de Avances Diarios
                    </h3>
                    <p className="text-xs text-[#5F5E5A]">
                      Listado de capturas de campo y materiales instalados en obra.
                    </p>
                  </div>
                  {isAdminOrSupervisor && (
                    <button
                      onClick={() => {
                        setShowAvanceModal(true);
                        fetchGeneralMaterials();
                      }}
                      className="flex items-center gap-2 h-9 px-4 bg-[#1C1C1A] text-white hover:bg-black rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Registrar Avance
                    </button>
                  )}
                </div>

                {/* Filtros de Historial (Tarea 5.4) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#F7F7F5] border border-[#E3E1D9] rounded-xl text-xs print:hidden">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">
                      Clasificación
                    </label>
                    <select
                      value={filterTipo}
                      onChange={(e) => setFilterTipo(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-[#C9C7BD] rounded-lg font-medium cursor-pointer"
                    >
                      <option value="">Todos los avances</option>
                      <option value="planeado">Planeado (Catálogo)</option>
                      <option value="no_planeado">No Planeado (Manual/Extras)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">
                      Fecha Desde
                    </label>
                    <input
                      type="date"
                      value={filterFechaInicio}
                      onChange={(e) => setFilterFechaInicio(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-[#C9C7BD] rounded-lg font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">
                      Fecha Hasta
                    </label>
                    <input
                      type="date"
                      value={filterFechaFin}
                      onChange={(e) => setFilterFechaFin(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-[#C9C7BD] rounded-lg font-medium"
                    />
                  </div>
                </div>

                {loadingHistory ? (
                  <div className="py-12 flex justify-center">
                    <RefreshCw className="w-8 h-8 text-[#0C447C] animate-spin" />
                  </div>
                ) : avancesHistory.length === 0 ? (
                  <div className="text-center py-12 text-[#8B8A84] space-y-2">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto opacity-45" />
                    <p className="text-sm font-semibold">Sin registros de avance encontrados</p>
                    <p className="text-xs">
                      Ajuste los filtros o registre un avance en la app de campo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {avancesHistory.map((av) => (
                      <div
                        key={av.id}
                        className="p-4 border border-[#E3E1D9] rounded-xl bg-white hover:shadow-xs transition-shadow"
                      >
                        <div className="flex flex-wrap justify-between items-start gap-4 pb-2 border-b border-[#E3E1D9] text-xs">
                          <div className="space-y-1">
                            <span className="font-bold text-[#1C1C1A] text-sm">{av.frente}</span>
                            <div className="flex gap-3 text-[10px] text-[#5F5E5A] font-medium">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-[#8B8A84]" /> {av.autor.nombre}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#8B8A84]" />
                                {new Date(av.fecha).toLocaleDateString()}{' '}
                                {new Date(av.fecha).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {av.latitud && av.longitud && (
                              <span className="inline-flex items-center gap-1 h-6 px-2 bg-[#F1EFE8] rounded text-[9px] font-bold text-[#5F5E5A]">
                                <MapPin className="w-2.5 h-2.5" /> GPS OK
                              </span>
                            )}
                            {av.evidenciaUrl && (
                              <a
                                href={av.evidenciaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 h-6 px-2.5 bg-[#EAF3DE] text-[#27500A] rounded text-[9px] font-bold hover:bg-[#D5EAC3] transition-colors"
                              >
                                <Camera className="w-2.5 h-2.5" /> Ver Evidencia
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Listado de items de avance */}
                        <div className="pt-2 divide-y divide-[#E3E1D9]/40 text-xs">
                          {av.items.map((item) => (
                            <div
                              key={item.id}
                              className="py-2 flex justify-between items-center text-xs"
                            >
                              <div>
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase mr-2 ${
                                    item.tipo === 'planeado'
                                      ? 'bg-[#E6F1FB] text-[#0C447C]'
                                      : 'bg-[#FCF4E6] text-[#BA7517]'
                                  }`}
                                >
                                  {item.tipo === 'planeado'
                                    ? 'Planeado'
                                    : `No Planeado (${item.subtipo})`}
                                </span>
                                <span className="font-bold text-[#1C1C1A]">
                                  {item.tipo === 'planeado' ? item.material?.codigo : 'MANUAL'}
                                </span>
                                <span className="text-[#5F5E5A] ml-2">
                                  {item.tipo === 'planeado'
                                    ? item.material?.descripcion
                                    : item.materialManual}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#27500A] bg-[#EAF3DE]/30 px-2 py-0.5 rounded">
                                  +{item.cantidad} {item.material?.unidad || 'pza'}
                                </span>
                                {isAdminOrSupervisor && (
                                  <div className="flex items-center gap-1 ml-2 border-l border-[#E3E1D9] pl-2">
                                    <button
                                      type="button"
                                      title="Modificar registro de material extra"
                                      onClick={() =>
                                        setEditingAvanceItem({
                                          id: item.id,
                                          materialManual:
                                            item.materialManual ||
                                            item.material?.descripcion ||
                                            '',
                                          cantidad: item.cantidad,
                                          subtipo: item.subtipo || 'extra',
                                        })
                                      }
                                      className="p-1 text-[#0C447C] hover:bg-[#E6F1FB] rounded cursor-pointer transition-colors"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      title="Eliminar registro de material extra"
                                      onClick={() => handleDeleteAvanceItem(item.id)}
                                      className="p-1 text-[#C23939] hover:bg-[#FDE8E8] rounded cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tabla/Tarjeta de Control de Materiales Extras */}
                {dashboardData?.materialesExtras && dashboardData.materialesExtras.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-[#E3E1D9] space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-[#BA7517] uppercase tracking-wider flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" />
                          Consolidado de Materiales Extras Registrados ({dashboardData.materialesExtras.length})
                        </h4>
                        <p className="text-[11px] text-[#5F5E5A]">
                          Listado de materiales no planeados capturados en reportes de avance.
                        </p>
                      </div>
                    </div>

                    <div className="border border-[#E3E1D9] rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#FCF4E6]/60 border-b border-[#E3E1D9] text-[#BA7517] font-bold">
                            <th className="p-2.5">Descripción del Material</th>
                            <th className="p-2.5">Subtipo</th>
                            <th className="p-2.5">Frente / Capturado Por</th>
                            <th className="p-2.5 text-right">Cantidad</th>
                            <th className="p-2.5 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E3E1D9] bg-white">
                          {dashboardData.materialesExtras.map((ext) => (
                            <tr key={ext.id} className="hover:bg-[#FCF4E6]/20 transition-colors">
                              <td className="p-2.5 font-bold text-[#1C1C1A]">
                                {ext.materialManual}
                              </td>
                              <td className="p-2.5">
                                <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#FCF4E6] text-[#BA7517]">
                                  {ext.avanceItem?.subtipo || 'Extra'}
                                </span>
                              </td>
                              <td className="p-2.5 text-[#5F5E5A]">
                                {ext.avanceItem?.avance?.frente || 'En Obra'}
                                {ext.avanceItem?.avance?.autor?.nombre && (
                                  <span className="block text-[10px] text-[#8B8A84]">
                                    por {ext.avanceItem.avance.autor.nombre}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-bold text-[#27500A]">
                                +{ext.cantidad} pza
                              </td>
                              <td className="p-2.5 text-center">
                                {isAdminOrSupervisor && (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      title="Modificar material extra"
                                      onClick={() =>
                                        setEditingAvanceItem({
                                          id: ext.avanceItemId || ext.id,
                                          materialManual: ext.materialManual,
                                          cantidad: ext.cantidad,
                                          subtipo: ext.avanceItem?.subtipo || 'extra',
                                        })
                                      }
                                      className="p-1 text-[#0C447C] hover:bg-[#E6F1FB] rounded cursor-pointer transition-colors"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      title="Eliminar material extra"
                                      onClick={() =>
                                        handleDeleteAvanceItem(ext.avanceItemId || ext.id)
                                      }
                                      className="p-1 text-[#C23939] hover:bg-[#FDE8E8] rounded cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VISTA 4: BITÁCORA DE INCIDENTES */}
            {activeTab === 'incidentes' && (
              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1A]">
                      Bitácora de Incidentes de Obra
                    </h3>
                    <p className="text-xs text-[#5F5E5A]">
                      Reportes de anomalías, retrasos climatológicos o problemas de calidad.
                    </p>
                  </div>
                </div>

                {dashboardData.incidentes.length === 0 ? (
                  <div className="text-center py-12 text-[#8B8A84] space-y-2">
                    <CheckCircle className="w-12 h-12 text-[#27500A] mx-auto opacity-40" />
                    <p className="text-sm font-semibold">Sin incidentes reportados</p>
                    <p className="text-xs">
                      No hay problemas reportados para este proyecto en este momento.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.incidentes.map((inc) => {
                      const isOpen = inc.estatus === 'abierto';

                      return (
                        <div
                          key={inc.id}
                          className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                            isOpen
                              ? 'bg-red-50/20 border-red-100'
                              : 'bg-gray-50/30 border-[#E3E1D9]'
                          }`}
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  inc.categoria === 'Seguridad'
                                    ? 'bg-[#FDE8E8] text-[#C23939]'
                                    : 'bg-[#FCF4E6] text-[#BA7517]'
                                }`}
                              >
                                {inc.categoria}
                              </span>
                              <span className="text-[10px] text-[#5F5E5A]">
                                {new Date(inc.fecha).toLocaleDateString()}{' '}
                                {new Date(inc.fecha).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-[#1C1C1A]">
                              {inc.descripcion}
                            </p>
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

            {/* VISTA 5: BITÁCORA DE TIEMPOS MUERTOS */}
            {activeTab === 'tiempos' && (
              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1A]">
                      Registro de Tiempos Muertos y Paros
                    </h3>
                    <p className="text-xs text-[#5F5E5A]">
                      Catálogo de horas perdidas clasificadas por frente de obra y causa.
                    </p>
                  </div>
                </div>

                {dashboardData.tiemposMuertos.length === 0 ? (
                  <div className="text-center py-12 text-[#8B8A84] space-y-2">
                    <Clock className="w-12 h-12 text-[#BA7517] mx-auto opacity-40 animate-pulse" />
                    <p className="text-sm font-semibold">Sin paros reportados</p>
                    <p className="text-xs">
                      No se han registrado tiempos muertos en este proyecto.
                    </p>
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
                            <td className="p-3 text-right font-bold text-[#BA7517]">
                              {tm.duracion.toFixed(1)} hrs
                            </td>
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

      {/* ================= MODALES DE EDICIÓN Y CREACIÓN ================= */}

      {/* MODAL: PROYECTO (CREAR / EDITAR) */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E3E1D9] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E3E1D9] flex justify-between items-center bg-[#F7F7F5] shrink-0">
              <div>
                <h3 className="font-bold text-[#1C1C1A] text-sm">
                  {editingProject ? 'Editar Ficha de Proyecto' : 'Crear Nuevo Proyecto'}
                </h3>
                <p className="text-[11px] text-[#5F5E5A]">
                  {editingProject
                    ? 'Actualice los datos generales, líderes, logos y estado de culminación.'
                    : 'Registre un nuevo proyecto en el sistema.'}
                </p>
              </div>
              <button
                onClick={() => setShowProjectModal(false)}
                className="text-[#5F5E5A] hover:text-[#1C1C1A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                    Nombre del Proyecto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Torre Sur - Nivel 1"
                    value={projectForm.nombre}
                    onChange={(e) => setProjectForm({ ...projectForm, nombre: e.target.value })}
                    className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                    Empresa Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Grupo Vega"
                    value={projectForm.cliente}
                    onChange={(e) => setProjectForm({ ...projectForm, cliente: e.target.value })}
                    className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Logo del Cliente */}
              <div className="p-3 bg-[#F7F7F5] border border-[#E3E1D9] rounded-xl space-y-2">
                <label className="block text-xs font-semibold text-[#1C1C1A]">
                  Logo de la Empresa Cliente
                </label>
                <div className="flex items-center gap-3">
                  {projectForm.logoCliente ? (
                    <div className="relative h-14 w-20 bg-white border border-[#E3E1D9] rounded-lg p-1 flex items-center justify-center shrink-0 shadow-2xs">
                      <img
                        src={projectForm.logoCliente}
                        alt="Logo Cliente Previo"
                        className="max-h-full max-w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setProjectForm({ ...projectForm, logoCliente: '' })}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-700 cursor-pointer shadow-xs"
                        title="Quitar logo"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="h-14 w-20 bg-white border border-dashed border-[#C9C7BD] rounded-lg flex flex-col items-center justify-center text-[#8B8A84] text-[9px] shrink-0">
                      <Building className="w-4 h-4 opacity-40 mb-0.5" />
                      <span>Sin Logo</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      placeholder="URL de imagen del logo o sube un archivo abajo..."
                      value={projectForm.logoCliente}
                      onChange={(e) =>
                        setProjectForm({ ...projectForm, logoCliente: e.target.value })
                      }
                      className="w-full h-8 px-2.5 bg-white border border-[#C9C7BD] rounded-lg text-xs"
                    />
                    <div>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-[#E3E1D9] border border-[#C9C7BD] rounded-lg text-xs font-semibold text-[#1C1C1A] cursor-pointer transition-colors shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-[#0C447C]" />
                        <span>
                          {uploadingLogo ? 'Subiendo logo...' : 'Subir imagen desde equipo'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          disabled={uploadingLogo}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Líderes de Proyecto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                    Líder de Proyecto (Cliente)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Ing. Carlos Mendoza"
                    value={projectForm.liderCliente}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, liderCliente: e.target.value })
                    }
                    className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                    Líder de Proyecto (Tecnogam)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Ing. Samuel Hernández"
                    value={projectForm.liderTecnogam}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, liderTecnogam: e.target.value })
                    }
                    className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={projectForm.fechaInicio}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, fechaInicio: e.target.value })
                    }
                    className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                    Fin Estimado *
                  </label>
                  <input
                    type="date"
                    required
                    value={projectForm.fechaFinEstimada}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, fechaFinEstimada: e.target.value })
                    }
                    className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Culminación y Alerta */}
              <div className="p-3 bg-[#F7F7F5] border border-[#E3E1D9] rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">
                      Fecha de Culminación (Real)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={projectForm.fechaCulminacion}
                        onChange={(e) =>
                          setProjectForm({ ...projectForm, fechaCulminacion: e.target.value })
                        }
                        className="w-full h-9 px-3 bg-white border border-[#C9C7BD] rounded-lg text-xs"
                      />
                      {projectForm.fechaCulminacion && (
                        <button
                          type="button"
                          onClick={() => setProjectForm({ ...projectForm, fechaCulminacion: '' })}
                          className="text-[10px] text-red-600 hover:underline shrink-0"
                          title="Borrar fecha de culminación"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-[#5F5E5A] block mt-1">
                      {projectForm.fechaCulminacion
                        ? '✅ Marcado como Culminado'
                        : 'Dejar vacío si el proyecto está en ejecución.'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">
                      Alerta preventiva de Hitos (Días)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      required
                      value={projectForm.diasAlertaHito}
                      onChange={(e) =>
                        setProjectForm({
                          ...projectForm,
                          diasAlertaHito: parseInt(e.target.value) || 7,
                        })
                      }
                      className="w-full h-9 px-3 bg-white border border-[#C9C7BD] rounded-lg text-xs"
                    />
                    <span className="text-[10px] text-[#5F5E5A] block mt-1">
                      Días antes del vencimiento para encender semáforo naranja.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-[#E3E1D9]">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="h-10 px-4 bg-[#F7F7F5] hover:bg-[#E3E1D9] text-[#5F5E5A] hover:text-[#1C1C1A] text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadingLogo}
                  className="h-10 px-6 bg-[#1C1C1A] hover:bg-[#3E3D39] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {editingProject ? 'Actualizar Proyecto' : 'Guardar Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: USUARIO (CREAR / EDITAR) */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E3E1D9] rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E3E1D9] flex justify-between items-center bg-[#F7F7F5]">
              <h3 className="font-bold text-[#1C1C1A] text-sm">
                {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-[#5F5E5A] hover:text-[#1C1C1A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ana Torres"
                  value={userForm.nombre}
                  onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  placeholder="Ej. supervisor@tecnogam.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                  Contraseña{' '}
                  {editingUser && (
                    <span className="text-[9px] text-[#8B8A84] font-normal">
                      (Dejar en blanco para no cambiar)
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder={editingUser ? '••••••••' : 'Ingrese contraseña'}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                    Perfil / Rol
                  </label>
                  <select
                    value={userForm.rol}
                    onChange={(e) => setUserForm({ ...userForm, rol: e.target.value })}
                    className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs cursor-pointer"
                  >
                    <option value="administrador">Administrador</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="trabajador">Trabajador</option>
                    <option value="cliente">Cliente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                    Estado de Acceso
                  </label>
                  <select
                    value={userForm.activo ? 'true' : 'false'}
                    onChange={(e) =>
                      setUserForm({ ...userForm, activo: e.target.value === 'true' })
                    }
                    className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs cursor-pointer"
                  >
                    <option value="true">Activo / Permitido</option>
                    <option value="false">Inactivo / Bloqueado</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full h-10 bg-[#1C1C1A] hover:bg-[#3E3D39] text-white text-xs font-bold rounded-xl cursor-pointer mt-2"
              >
                Guardar Usuario
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MODIFICAR MATERIAL EXTRA / AVANCE */}
      {editingAvanceItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E3E1D9] rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E3E1D9] flex justify-between items-center bg-[#F7F7F5]">
              <div>
                <h3 className="font-bold text-[#1C1C1A] text-sm flex items-center gap-2">
                  <Edit className="w-4 h-4 text-[#0C447C]" />
                  Modificar Registro de Material Extra
                </h3>
                <p className="text-[10px] text-[#5F5E5A]">
                  Edite la descripción, subtipo o cantidad del material extra.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAvanceItem(null)}
                className="text-[#8B8A84] hover:text-[#1C1C1A] p-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAvanceItem} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">
                  Clasificación / Subtipo
                </label>
                <select
                  value={editingAvanceItem.subtipo}
                  onChange={(e) =>
                    setEditingAvanceItem({
                      ...editingAvanceItem,
                      subtipo: e.target.value as any,
                    })
                  }
                  className="w-full h-9 px-3 bg-white border border-[#C9C7BD] rounded-lg text-xs font-medium cursor-pointer"
                >
                  <option value="extra">Trabajo Extra</option>
                  <option value="retrabajo">Retrabajo</option>
                  <option value="modificacion">Modificación</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">
                  Descripción del Material (Texto Libre)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Soporte metálico a medida de 4 pulgadas"
                  value={editingAvanceItem.materialManual}
                  onChange={(e) =>
                    setEditingAvanceItem({
                      ...editingAvanceItem,
                      materialManual: e.target.value,
                    })
                  }
                  className="w-full h-9 px-3 bg-white border border-[#C9C7BD] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">
                  Cantidad Reportada
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Ej. 10"
                  value={editingAvanceItem.cantidad}
                  onChange={(e) =>
                    setEditingAvanceItem({
                      ...editingAvanceItem,
                      cantidad: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full h-9 px-3 bg-white border border-[#C9C7BD] rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3E1D9]">
                <button
                  type="button"
                  onClick={() => setEditingAvanceItem(null)}
                  className="h-9 px-4 border border-[#C9C7BD] text-[#1C1C1A] hover:bg-[#F7F7F5] text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 bg-[#0C447C] hover:bg-[#093561] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REPORTAR AVANCE DIARIO */}
      {showAvanceModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-[#E3E1D9] rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="p-6 border-b border-[#E3E1D9] flex justify-between items-center bg-[#F7F7F5]">
              <div>
                <h3 className="font-bold text-[#1C1C1A] text-sm">
                  Registrar Reporte de Avance Diario
                </h3>
                <p className="text-[10px] text-[#5F5E5A]">
                  Registrar avance planeado y no planeado simultáneamente para el proyecto.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAvanceModal(false);
                  setAvanceItemsList([]);
                  setAvanceSearchQuery('');
                }}
                className="text-[#5F5E5A] hover:text-[#1C1C1A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAvance} className="p-6 space-y-5">
              {/* Encabezado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                    Frente de Trabajo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Frente Norte - Nivel 4"
                    value={avanceForm.frente}
                    onChange={(e) => setAvanceForm({ ...avanceForm, frente: e.target.value })}
                    className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                    Fecha de Captura *
                  </label>
                  <input
                    type="date"
                    required
                    value={avanceForm.fecha}
                    onChange={(e) => setAvanceForm({ ...avanceForm, fecha: e.target.value })}
                    className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* GPS y Foto */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                    Latitud (GPS opcional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Ej. 19.4326"
                    value={avanceForm.latitud}
                    onChange={(e) => setAvanceForm({ ...avanceForm, latitud: e.target.value })}
                    className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                    Longitud (GPS opcional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Ej. -99.1332"
                    value={avanceForm.longitud}
                    onChange={(e) => setAvanceForm({ ...avanceForm, longitud: e.target.value })}
                    className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">
                    Evidencia Fotográfica
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setSelectedEvidenciaFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs text-[#5F5E5A]
                      file:mr-2 file:py-1 file:px-3
                      file:rounded-full file:border-0
                      file:text-xs file:font-semibold
                      file:bg-[#F1EFE8] file:text-[#1C1C1A]
                      hover:file:bg-[#E3E1D9]
                      cursor-pointer mt-1.5"
                  />
                </div>
              </div>

              {/* Secciones de Carga */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-[#E3E1D9]">
                {/* Apartado A: Avance Planeado */}
                <div className="space-y-3 p-4 bg-[#F7F7F5] rounded-xl border border-[#E3E1D9]/60">
                  <h4 className="text-xs font-bold text-[#0C447C] flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Apartado A: Avance Planeado
                  </h4>
                  <p className="text-[10px] text-[#5F5E5A]">
                    Seleccione un material de catálogo e indique cantidad.
                  </p>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">
                        Material de Catálogo
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Escribe para buscar y filtrar catálogo..."
                          value={avanceSearchQuery}
                          onChange={(e) => {
                            setAvanceSearchQuery(e.target.value);
                            setCurrentPlaneadoItem({ ...currentPlaneadoItem, materialId: '' });
                            setShowAvanceDropdown(true);
                          }}
                          onFocus={() => setShowAvanceDropdown(true)}
                          onBlur={() => setTimeout(() => setShowAvanceDropdown(false), 200)}
                          className="w-full h-9 px-3 bg-white border border-[#C9C7BD] rounded-lg text-xs"
                        />
                        {showAvanceDropdown && (
                          <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-[#E3E1D9] rounded-xl shadow-lg z-50 divide-y divide-[#E3E1D9]">
                            {/* 1. Materiales de Proyecto (BOM) */}
                            {(dashboardData?.reconciliation || []).filter((m) =>
                              matchesAllWords(
                                `${m.codigo} ${m.descripcion} ${m.unidad || ''}`,
                                avanceSearchQuery,
                              ),
                            ).length > 0 && (
                              <div>
                                <div className="bg-[#F7F7F5] px-3 py-1.5 text-[9px] font-bold text-[#0C447C] uppercase tracking-wider">
                                  Materiales del Proyecto (BOM)
                                </div>
                                {(dashboardData?.reconciliation || [])
                                  .filter((m) =>
                                    matchesAllWords(
                                      `${m.codigo} ${m.descripcion} ${m.unidad || ''}`,
                                      avanceSearchQuery,
                                    ),
                                  )
                                  .map((m) => (
                                    <button
                                      key={m.materialId}
                                      type="button"
                                      onMouseDown={() => {
                                        setCurrentPlaneadoItem({
                                          ...currentPlaneadoItem,
                                          materialId: m.materialId,
                                        });
                                        setAvanceSearchQuery(`${m.codigo} - ${m.descripcion}`);
                                        setShowAvanceDropdown(false);
                                      }}
                                      className="w-full text-left p-2.5 hover:bg-[#F7F7F5] transition-colors text-xs flex flex-col cursor-pointer"
                                    >
                                      <span className="font-bold text-[#1C1C1A]">{m.codigo}</span>
                                      <span className="text-[#5F5E5A] truncate">
                                        {m.descripcion} ({m.unidad})
                                      </span>
                                    </button>
                                  ))}
                              </div>
                            )}

                            {/* 2. Otros Materiales del Catálogo Maestro */}
                            {generalMaterials.filter(
                              (g) =>
                                !(dashboardData?.reconciliation || []).some(
                                  (p) => p.materialId === g.id,
                                ) &&
                                matchesAllWords(
                                  `${g.codigo} ${g.descripcion} ${g.categoria || ''} ${g.unidad || ''}`,
                                  avanceSearchQuery,
                                ),
                            ).length > 0 && (
                              <div>
                                <div className="bg-[#F7F7F5] px-3 py-1.5 text-[9px] font-bold text-[#BA7517] uppercase tracking-wider">
                                  Otros Materiales del Catálogo Maestro
                                </div>
                                {generalMaterials
                                  .filter(
                                    (g) =>
                                      !(dashboardData?.reconciliation || []).some(
                                        (p) => p.materialId === g.id,
                                      ) &&
                                      matchesAllWords(
                                        `${g.codigo} ${g.descripcion} ${g.categoria || ''} ${g.unidad || ''}`,
                                        avanceSearchQuery,
                                      ),
                                  )
                                  .map((m) => (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onMouseDown={() => {
                                        setCurrentPlaneadoItem({
                                          ...currentPlaneadoItem,
                                          materialId: m.id,
                                        });
                                        setAvanceSearchQuery(`${m.codigo} - ${m.descripcion}`);
                                        setShowAvanceDropdown(false);
                                      }}
                                      className="w-full text-left p-2.5 hover:bg-[#F7F7F5] transition-colors text-xs flex flex-col cursor-pointer"
                                    >
                                      <span className="font-bold text-[#1C1C1A]">{m.codigo}</span>
                                      <span className="text-[#5F5E5A] truncate">
                                        {m.descripcion} ({m.unidad})
                                      </span>
                                    </button>
                                  ))}
                              </div>
                            )}

                            {/* Si está vacío */}
                            {generalMaterials.filter((g) =>
                              matchesAllWords(
                                `${g.codigo} ${g.descripcion} ${g.categoria || ''}`,
                                avanceSearchQuery,
                              ),
                            ).length === 0 &&
                              (dashboardData?.reconciliation || []).filter((m) =>
                                matchesAllWords(`${m.codigo} ${m.descripcion}`, avanceSearchQuery),
                              ).length === 0 && (
                                <div className="p-3 text-xs text-[#8B8A84] text-center bg-[#F7F7F5]">
                                  No se encontraron materiales que coincidan con la búsqueda.
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="Ej. 10"
                          value={currentPlaneadoItem.cantidad}
                          onChange={(e) =>
                            setCurrentPlaneadoItem({
                              ...currentPlaneadoItem,
                              cantidad: e.target.value,
                            })
                          }
                          className="w-full h-9 px-2 bg-white border border-[#C9C7BD] rounded-lg text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPlaneadoItem}
                        className="self-end h-9 px-3 bg-[#0C447C] text-white rounded-lg text-xs font-bold hover:bg-[#093561] cursor-pointer"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Apartado B: Avance No Planeado */}
                <div className="space-y-3 p-4 bg-[#FCF4E6]/50 rounded-xl border border-[#BA7517]/30">
                  <h4 className="text-xs font-bold text-[#BA7517] flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Apartado B: Avance No Planeado
                  </h4>
                  <p className="text-[10px] text-[#5F5E5A]">
                    Para retrabajos, extras o modificaciones con descripción libre.
                  </p>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">
                          Subtipo
                        </label>
                        <select
                          value={currentNoPlaneadoItem.subtipo}
                          onChange={(e) =>
                            setCurrentNoPlaneadoItem({
                              ...currentNoPlaneadoItem,
                              subtipo: e.target.value as any,
                            })
                          }
                          className="w-full h-9 px-2 bg-white border border-[#C9C7BD] rounded-lg text-xs"
                        >
                          <option value="retrabajo">Retrabajo</option>
                          <option value="extra">Trabajo Extra</option>
                          <option value="modificacion">Modificación</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="Ej. 5"
                          value={currentNoPlaneadoItem.cantidad}
                          onChange={(e) =>
                            setCurrentNoPlaneadoItem({
                              ...currentNoPlaneadoItem,
                              cantidad: e.target.value,
                            })
                          }
                          className="w-full h-9 px-2 bg-white border border-[#C9C7BD] rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">
                        Descripción del Material (Texto Libre)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ej. Soporte metálico a medida de 4 pulgadas"
                          value={currentNoPlaneadoItem.materialManual}
                          onChange={(e) =>
                            setCurrentNoPlaneadoItem({
                              ...currentNoPlaneadoItem,
                              materialManual: e.target.value,
                            })
                          }
                          className="w-full h-9 px-2 bg-white border border-[#C9C7BD] rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddNoPlaneadoItem}
                          className="h-9 px-3 bg-[#BA7517] text-white rounded-lg text-xs font-bold hover:bg-[#965E12] cursor-pointer"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Listado de Items Agregados */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#1C1C1A]">
                  Detalle de Avances a Reportar ({avanceItemsList.length})
                </label>
                {avanceItemsList.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-[#C9C7BD] rounded-xl text-xs text-[#8B8A84] bg-[#F7F7F5]">
                    No se han agregado materiales al reporte. Use los controles de arriba para
                    añadir items planeados o no planeados.
                  </div>
                ) : (
                  <div className="border border-[#E3E1D9] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F7F7F5] border-b border-[#E3E1D9] text-[#5F5E5A] font-semibold">
                          <th className="p-2.5">Tipo</th>
                          <th className="p-2.5">Código / Material</th>
                          <th className="p-2.5 text-right">Cantidad</th>
                          <th className="p-2.5 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E3E1D9]">
                        {avanceItemsList.map((it, idx) => (
                          <tr key={idx} className="hover:bg-[#F7F7F5]/40 transition-colors">
                            <td className="p-2.5">
                              <span
                                className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                  it.tipo === 'planeado'
                                    ? 'bg-[#E6F1FB] text-[#0C447C]'
                                    : 'bg-[#FCF4E6] text-[#BA7517]'
                                }`}
                              >
                                {it.tipo === 'planeado' ? 'Planeado' : `No Plan. (${it.subtipo})`}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="font-bold text-[#1C1C1A] mr-2">
                                {it.materialCodigo}
                              </span>
                              <span className="text-[#5F5E5A]">{it.materialDescripcion}</span>
                            </td>
                            <td className="p-2.5 text-right font-bold text-[#27500A]">
                              +{it.cantidad}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setAvanceItemsList(avanceItemsList.filter((_, i) => i !== idx))
                                }
                                className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Botón de Envío */}
              <div className="flex gap-3 justify-end pt-3 border-t border-[#E3E1D9]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAvanceModal(false);
                    setAvanceItemsList([]);
                    setAvanceSearchQuery('');
                  }}
                  className="h-10 px-4 border border-[#C9C7BD] text-[#1C1C1A] hover:bg-[#F7F7F5] text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={avanceItemsList.length === 0}
                  className={`h-10 px-6 text-white text-xs font-bold rounded-xl cursor-pointer ${
                    avanceItemsList.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#1C1C1A] hover:bg-[#3E3D39]'
                  }`}
                >
                  Guardar Reporte de Avance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
