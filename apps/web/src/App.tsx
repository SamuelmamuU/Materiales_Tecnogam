import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
  MapPin
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
    evidenciaUrl: ''
  });
  const [selectedEvidenciaFile, setSelectedEvidenciaFile] = useState<File | null>(null);
  const [generalMaterials, setGeneralMaterials] = useState<{ id: string; codigo: string; descripcion: string; unidad: string }[]>([]);

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
    cantidad: ''
  });

  // Estados para gestión de BOM de materiales en admin
  const [selectedBOMMaterialId, setSelectedBOMMaterialId] = useState('');
  const [bomMaterialCantidad, setBomMaterialCantidad] = useState('');
  const [bomImportMode, setBomImportMode] = useState<'individual' | 'excel'>('individual');
  const [bomParsedPreview, setBomParsedPreview] = useState<any[]>([]);
  const [isImportingBOM, setIsImportingBOM] = useState(false);

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingIncidentId, setResolvingIncidentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'kpis' | 'materiales' | 'avances' | 'incidentes' | 'tiempos' | 'bom' | 'admin'>('kpis');

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
  const [projectForm, setProjectForm] = useState({ nombre: '', cliente: '', fechaInicio: '', fechaFinEstimada: '' });

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDetail | null>(null);
  const [userForm, setUserForm] = useState({ nombre: '', email: '', password: '', rol: 'trabajador', activo: true });

  const [hitoForm, setHitoForm] = useState({ nombre: '', fechaObjetivo: '', estatus: 'pendiente' });
  const [selectedMemberId, setSelectedMemberId] = useState('');

  // Cargar proyectos al iniciar
  useEffect(() => {
    fetchProjects();
  }, []);

  // Cargar datos de dashboard cuando cambia el proyecto seleccionado
  useEffect(() => {
    if (selectedProjectId) {
      fetchDashboardData(selectedProjectId);
      fetchTimelineData(selectedProjectId);
      fetchAvancesHistory(selectedProjectId);
    }
  }, [selectedProjectId]);

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

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(API_URL + '/projects', {
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
      const response = await fetch(`${API_URL}/projects/${projectId}/dashboard`, {
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

  const fetchTimelineData = async (projectId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/projects/${projectId}/avances/timeline`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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
          'Authorization': `Bearer ${token}`,
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
        headers: { 'Authorization': `Bearer ${token}` },
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
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedAdminProject(data);
      }
    } catch (_) {}
  };

  // --- CRUD Proyectos ---
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('accessToken');
      const isEdit = !!editingProject;
      const url = isEdit 
        ? `${API_URL}/projects/${editingProject.id}` 
        : API_URL + '/projects';
      
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: projectForm.nombre,
          cliente: projectForm.cliente,
          fechaInicio: new Date(projectForm.fechaInicio).toISOString(),
          fechaFinEstimada: new Date(projectForm.fechaFinEstimada).toISOString(),
        }),
      });

      if (!response.ok) throw new Error('No se pudo guardar el proyecto.');

      setShowProjectModal(false);
      setEditingProject(null);
      setProjectForm({ nombre: '', cliente: '', fechaInicio: '', fechaFinEstimada: '' });
      await fetchProjects();
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
        headers: { 'Authorization': `Bearer ${token}` },
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
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: hitoForm.nombre,
          fechaObjetivo: new Date(hitoForm.fechaObjetivo).toISOString(),
          estatus: hitoForm.estatus,
        }),
      });

      if (!response.ok) throw new Error('No se pudo agregar el hito.');
      setHitoForm({ nombre: '', fechaObjetivo: '', estatus: 'pendiente' });
      await fetchProjectDetailForAdmin(selectedAdminProject.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteHito = async (hitoId: string) => {
    if (!selectedAdminProject || !confirm('¿Eliminar este hito?')) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/projects/${selectedAdminProject.id}/hitos/${hitoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('No se pudo eliminar el hito.');
      await fetchProjectDetailForAdmin(selectedAdminProject.id);
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
          'Authorization': `Bearer ${token}`,
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
      const response = await fetch(`${API_URL}/projects/${selectedAdminProject.id}/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
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
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir la imagen.');
      }

      const data = await response.json();
      return data.url;
    } catch (err) {
      console.error(err);
      alert('No se pudo cargar la imagen de evidencia.');
      return null;
    }
  };

  const fetchGeneralMaterials = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/materials?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setGeneralMaterials(data.data || []);
      }
    } catch (err) {
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
    let mat = projectMaterialsOptions.find(o => o.materialId === currentPlaneadoItem.materialId);
    let matDesc = '';
    let matCodigo = '';
    
    if (mat) {
      matDesc = mat.descripcion;
      matCodigo = mat.codigo;
    } else {
      const genMat = generalMaterials.find(o => o.id === currentPlaneadoItem.materialId);
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
      cantidad: qty
    };

    setAvanceItemsList([...avanceItemsList, newItem]);
    setCurrentPlaneadoItem({ materialId: '', cantidad: '' });
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
      cantidad: qty
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
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
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
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: generateUUID(),
          proyectoId: selectedProjectId,
          fecha: new Date(avanceForm.fecha).toISOString(),
          frente: avanceForm.frente.trim(),
          latitud: avanceForm.latitud ? parseFloat(avanceForm.latitud) : null,
          longitud: avanceForm.longitud ? parseFloat(avanceForm.longitud) : null,
          evidenciaUrl: finalEvidenciaUrl || null,
          items: avanceItemsList.map(it => ({
            tipo: it.tipo,
            subtipo: it.tipo === 'no_planeado' ? it.subtipo : undefined,
            materialId: it.tipo === 'planeado' ? it.materialId : undefined,
            materialManual: it.tipo === 'no_planeado' ? it.materialManual : undefined,
            cantidad: parseFloat(it.cantidad.toString())
          }))
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Error al guardar el reporte de avance.');
      }

      setShowAvanceModal(false);
      setAvanceForm({ frente: '', fecha: new Date().toISOString().split('T')[0], latitud: '', longitud: '', evidenciaUrl: '' });
      setSelectedEvidenciaFile(null);
      setAvanceItemsList([]);
      
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

  // --- CRUD BOM / Materiales Cotizados ---
  const parseCSVFile = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) return [];
    
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const codeIdx = headers.findIndex(h => h.includes('codigo') || h.includes('modelo') || h.includes('code'));
    const descIdx = headers.findIndex(h => h.includes('descripcion') || h.includes('nombre') || h.includes('desc'));
    const textIdx = headers.findIndex(h => h.includes('unidad') || h.includes('unit'));
    const qtyIdx = headers.findIndex(h => h.includes('cantidad') || h.includes('qty') || h.includes('cant') || h.includes('cotizado'));
    const catIdx = headers.findIndex(h => h.includes('categoria') || h.includes('tipo') || h.includes('category'));

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
        cantidad
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
          'Authorization': `Bearer ${token}`,
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
      await fetchProjectDetailForAdmin(selectedAdminProject.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteBOMMaterial = async (materialId: string) => {
    if (!selectedAdminProject || !confirm('¿Eliminar este material del presupuesto del proyecto?')) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/projects/${selectedAdminProject.id}/materials/${materialId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('No se pudo desvincular el material.');
      await fetchProjectDetailForAdmin(selectedAdminProject.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileUploadBOM = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseCSVFile(text);
      setBomParsedPreview(parsed);
    };
    reader.readAsText(file);
  };

  const handleConfirmImportBOM = async () => {
    if (!selectedAdminProject || bomParsedPreview.length === 0) return;
    setIsImportingBOM(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/projects/${selectedAdminProject.id}/materials/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(bomParsedPreview),
      });

      if (!response.ok) {
        throw new Error('Error al importar la lista de materiales.');
      }

      setBomParsedPreview([]);
      const fileInput = document.getElementById('bom-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      await fetchProjectDetailForAdmin(selectedAdminProject.id);
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
      const url = isEdit 
        ? `${API_URL}/users/${editingUser.id}` 
        : API_URL + '/users';
      
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
          'Authorization': `Bearer ${token}`,
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
        headers: { 'Authorization': `Bearer ${token}` },
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
          'Authorization': `Bearer ${token}`,
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
    window.location.href = '/login';
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
    const maxVal = Math.max(
      ...timelineData.map((d) => 
        viewMode === 'acumulado' 
          ? Math.max(d.acumuladoPlaneado, d.acumuladoReal) 
          : Math.max(d.diarioPlaneado, d.diarioReal)
      )
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
      const lastReportedIndex = timelineData.map((d) => d.diarioReal).reduce((lastIdx, val, idx) => val > 0 ? idx : lastIdx, 0);
      const realTimelinePoints = timelineData.slice(0, lastReportedIndex + 1);
      
      const realPoints = realTimelinePoints
        .map((p, i) => `${getX(i).toFixed(1)},${getY(p.acumuladoReal).toFixed(1)}`)
        .join(' ');

      // Generar área sombreada real
      const realAreaPoints = realTimelinePoints.length > 0 
        ? `${getX(0).toFixed(1)},${(height - padding).toFixed(1)} ` + realPoints + ` ${getX(realTimelinePoints.length - 1).toFixed(1)},${(height - padding).toFixed(1)}`
        : '';

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Ejes y cuadrículas */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E3E1D9" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#E3E1D9" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#F1EFE8" strokeDasharray="3" />
          <line x1={padding} y1={height/2} x2={width - padding} y2={height/2} stroke="#F1EFE8" strokeDasharray="3" />

          {/* Área sombreada real */}
          {realAreaPoints && (
            <polygon points={realAreaPoints} fill="url(#realGrad)" opacity="0.15" />
          )}

          {/* Línea Planeado */}
          {plannedPoints && (
            <polyline points={plannedPoints} fill="none" stroke="#8B8A84" strokeWidth="2.5" strokeDasharray="4" />
          )}

          {/* Línea Real */}
          {realPoints && (
            <polyline points={realPoints} fill="none" stroke="#27500A" strokeWidth="3" />
          )}

          {/* Etiquetas sencillas */}
          <text x={padding} y={padding - 10} fill="#5F5E5A" fontSize="9" fontWeight="bold">
            {maxVal.toFixed(0)} u.
          </text>
          <text x={width - padding} y={height - padding + 15} fill="#5F5E5A" fontSize="9" textAnchor="end">
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
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E3E1D9" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#E3E1D9" strokeWidth="1" />

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
              onClick={() => setActiveTab('avances')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'avances' ? 'bg-[#F1EFE8] text-[#1C1C1A]' : 'text-[#5F5E5A] hover:bg-[#F7F7F5] hover:text-[#1C1C1A]'
              }`}
            >
              <Activity className="w-4 h-4" />
              Historial de Avances
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
                    activeTab === 'bom' ? 'bg-[#F1EFE8] text-[#1C1C1A]' : 'text-[#5F5E5A] hover:bg-[#F7F7F5] hover:text-[#1C1C1A]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Presupuesto BOM
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    activeTab === 'admin' ? 'bg-[#F1EFE8] text-[#1C1C1A]' : 'text-[#5F5E5A] hover:bg-[#F7F7F5] hover:text-[#1C1C1A]'
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

        {loading && activeTab !== 'admin' && activeTab !== 'avances' ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-10 h-10 text-[#0C447C] animate-spin mb-4" />
            <p className="text-sm font-medium text-[#5F5E5A]">Cargando información consolidada...</p>
          </div>
        ) : activeTab === 'admin' ? (
          // ================= PANELES DE ADMINISTRACIÓN (SOLO ADMIN) =================
          <div className="space-y-6">
            <div className="bg-white border border-[#E3E1D9] rounded-2xl p-4 shadow-sm flex gap-4">
              <button
                onClick={() => { setAdminSubTab('proyectos'); setSelectedAdminProject(null); }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  adminSubTab === 'proyectos' ? 'bg-[#1C1C1A] text-white' : 'text-[#5F5E5A] hover:bg-[#F7F7F5]'
                }`}
              >
                Proyectos e Hitos
              </button>
              <button
                onClick={() => setAdminSubTab('usuarios')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  adminSubTab === 'usuarios' ? 'bg-[#1C1C1A] text-white' : 'text-[#5F5E5A] hover:bg-[#F7F7F5]'
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
                    <p className="text-xs text-[#5F5E5A]">Administre la lista global de proyectos vigentes.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingProject(null);
                      setProjectForm({ nombre: '', cliente: '', fechaInicio: '', fechaFinEstimada: '' });
                      setShowProjectModal(true);
                    }}
                    className="flex items-center gap-1.5 h-9 px-3 bg-[#27500A] text-white hover:bg-[#3E5C1B] rounded-lg text-xs font-bold cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" /> Crear Proyecto
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E3E1D9] bg-[#F7F7F5] text-[#5F5E5A]">
                        <th className="p-3 font-semibold">Proyecto</th>
                        <th className="p-3 font-semibold">Cliente</th>
                        <th className="p-3 font-semibold">Inicio</th>
                        <th className="p-3 font-semibold">Fin Estimado</th>
                        <th className="p-3 font-semibold text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E1D9]">
                      {projects.map((proj) => (
                        <tr key={proj.id} className="hover:bg-[#F7F7F5]/50">
                          <td className="p-3 font-bold text-[#1C1C1A]">{proj.nombre}</td>
                          <td className="p-3 text-[#5F5E5A] font-semibold">{proj.cliente}</td>
                          <td className="p-3 text-[#5F5E5A]">{new Date(proj.fechaInicio).toLocaleDateString()}</td>
                          <td className="p-3 text-[#5F5E5A]">{new Date(proj.fechaFinEstimada).toLocaleDateString()}</td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => fetchProjectDetailForAdmin(proj.id)}
                                className="h-7 px-2.5 border border-[#C9C7BD] hover:bg-[#F1EFE8] rounded text-[11px] font-bold text-[#1C1C1A] cursor-pointer"
                              >
                                Gestionar Hitos/Miembros
                              </button>
                              <button
                                onClick={() => {
                                  setEditingProject(proj);
                                  setProjectForm({
                                    nombre: proj.nombre,
                                    cliente: proj.cliente,
                                    fechaInicio: proj.fechaInicio.split('T')[0],
                                    fechaFinEstimada: proj.fechaFinEstimada.split('T')[0],
                                  });
                                  setShowProjectModal(true);
                                }}
                                className="h-7 w-7 border border-[#C9C7BD] hover:bg-[#F1EFE8] flex items-center justify-center rounded text-[#5F5E5A] hover:text-[#1C1C1A] cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProject(proj.id)}
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
                      <h2 className="text-xl font-bold text-[#1C1C1A]">{selectedAdminProject.nombre}</h2>
                      <p className="text-xs text-[#5F5E5A]">Cliente: {selectedAdminProject.cliente}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-[#1C1C1A] pb-2 border-b border-[#E3E1D9]">Hitos de Cronograma</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedAdminProject.hitos.map((hito) => (
                        <div key={hito.id} className="p-3 bg-[#F7F7F5] border border-[#E3E1D9] rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-[#1C1C1A] block">{hito.nombre}</span>
                            <span className="text-[10px] text-[#5F5E5A]">
                              Plazo: {new Date(hito.fechaObjetivo).toLocaleDateString()} | Estatus: {hito.estatus.toUpperCase()}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteHito(hito.id)}
                            className="h-7 w-7 text-[#C23939] hover:bg-[#FDE8E8] rounded flex items-center justify-center transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleAddHito} className="pt-4 border-t border-[#E3E1D9] space-y-3">
                      <span className="block text-xs font-semibold text-[#1C1C1A]">Agregar Hito</span>
                      <div className="grid grid-cols-2 gap-3">
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
                          onChange={(e) => setHitoForm({ ...hitoForm, fechaObjetivo: e.target.value })}
                          className="h-9 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-lg text-xs"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full h-9 bg-[#1C1C1A] hover:bg-[#3E3D39] text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Guardar Hito
                      </button>
                    </form>
                  </div>

                  <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-[#1C1C1A] pb-2 border-b border-[#E3E1D9]">Miembros de Obra</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedAdminProject.miembros.map((memb) => (
                        <div key={memb.id} className="p-3 bg-[#F7F7F5] border border-[#E3E1D9] rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-[#1C1C1A] block">{memb.usuario.nombre}</span>
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

                    <form onSubmit={handleAddMember} className="pt-4 border-t border-[#E3E1D9] space-y-3">
                      <span className="block text-xs font-semibold text-[#1C1C1A]">Vincular Miembro</span>
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
                                !selectedAdminProject.miembros.some(
                                  (m) => m.usuarioId === u.id,
                                ),
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
                    <p className="text-xs text-[#5F5E5A]">Gestione el acceso al sistema y asigne perfiles.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setUserForm({ nombre: '', email: '', password: '', rol: 'trabajador', activo: true });
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
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              u.activo ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-gray-100 text-gray-500'
                            }`}>
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
                <p className="text-sm font-medium text-[#5F5E5A]">Cargando presupuesto de materiales (BOM)...</p>
              </div>
            ) : (
              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm space-y-6">
                <div className="border-b border-[#E3E1D9] pb-3 flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1A]">Presupuesto Original del Proyecto (BOM de Materiales)</h3>
                    <p className="text-xs text-[#5F5E5A]">
                      Defina los materiales cotizados y sus cantidades contratadas para el proyecto activo: <b>{selectedAdminProject.nombre}</b>.
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
                        bomImportMode === 'individual' ? 'bg-white text-[#1C1C1A] shadow-xs' : 'text-[#5F5E5A] hover:text-[#1C1C1A]'
                      }`}
                    >
                      Vincular Catálogo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBomImportMode('excel');
                        setBomParsedPreview([]);
                      }}
                      className={`h-7 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                        bomImportMode === 'excel' ? 'bg-white text-[#1C1C1A] shadow-xs' : 'text-[#5F5E5A] hover:text-[#1C1C1A]'
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
                        <span className="block text-xs font-bold text-[#1C1C1A]">Vincular Material desde Catálogo</span>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">Material</label>
                          <select
                            required
                            value={selectedBOMMaterialId}
                            onChange={(e) => setSelectedBOMMaterialId(e.target.value)}
                            className="w-full h-9 px-2 bg-white border border-[#C9C7BD] rounded-lg text-xs cursor-pointer"
                          >
                            <option value="">Seleccione un material...</option>
                            {generalMaterials
                              .filter(m => !(selectedAdminProject.materialesCotizados || []).some((c: any) => c.materialId === m.id))
                              .map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.codigo} - {m.descripcion} ({m.unidad})
                                </option>
                              ))
                            }
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">Cantidad Presupuestada (Cotizada)</label>
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
                        <span className="block text-xs font-bold text-[#1C1C1A]">Carga de Archivo Excel / CSV</span>
                        <p className="text-[10px] text-[#5F5E5A]">
                          Suba un archivo con columnas correspondientes a: <b>Codigo/Modelo</b>, <b>Descripcion</b>, <b>Unidad</b> y <b>Cantidad/Cotizado</b>.
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
                              {isImportingBOM ? 'Importando...' : 'Confirmar e Importar al Proyecto'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Panel Derecho: Lista de Materiales Cotizados */}
                  <div className="lg:col-span-2 space-y-3">
                    <span className="block text-xs font-bold text-[#1C1C1A]">
                      Materiales Cotizados en el Proyecto ({(selectedAdminProject.materialesCotizados || []).length})
                    </span>

                    {/* Si hay vista previa de importación */}
                    {bomImportMode === 'excel' && bomParsedPreview.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-[#BA7517] uppercase">Vista Previa de Importación</span>
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
                                  <td className="p-2 text-[#5F5E5A] truncate max-w-xs">{item.descripcion}</td>
                                  <td className="p-2 text-center text-[#8B8A84] uppercase">{item.unidad}</td>
                                  <td className="p-2 text-right font-bold text-[#1C1C1A]">{item.cantidad.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (selectedAdminProject.materialesCotizados || []).length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-[#C9C7BD] rounded-xl text-xs text-[#8B8A84] bg-[#F7F7F5]">
                        No hay materiales cargados en el presupuesto de este proyecto. Use los controles de la izquierda para vincular o importar.
                      </div>
                    ) : (
                      <div className="border border-[#E3E1D9] rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#F7F7F5] border-b border-[#E3E1D9] text-[#5F5E5A] font-semibold">
                              <th className="p-2.5">Código</th>
                              <th className="p-2.5">Descripción</th>
                              <th className="p-2.5 text-center">Unidad</th>
                              <th className="p-2.5 text-right">Cotizado</th>
                              <th className="p-2.5 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E3E1D9] bg-white">
                            {(selectedAdminProject.materialesCotizados || []).map((cot: any) => (
                              <tr key={cot.id} className="hover:bg-[#F7F7F5]/30">
                                <td className="p-2.5 font-bold text-[#1C1C1A]">{cot.material.codigo}</td>
                                <td className="p-2.5 text-[#5F5E5A] truncate max-w-xs" title={cot.material.descripcion}>
                                  {cot.material.descripcion}
                                </td>
                                <td className="p-2.5 text-center text-[#8B8A84] uppercase">{cot.material.unidad}</td>
                                <td className="p-2.5 text-right font-bold text-[#1C1C1A]">{cot.cantidad.toLocaleString()}</td>
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBOMMaterial(cot.materialId)}
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
                </div>
              </div>
            )}
          </div>
        ) : dashboardData ? (
          // ================= VISTAS ESTÁNDAR DEL DASHBOARD DE PROYECTO =================
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
                  <span className="block text-xs font-semibold text-[#5F5E5A]">Instalado / Cotizado</span>
                  <span className="block text-lg font-bold text-[#1C1C1A] mt-1">
                    {dashboardData.kpis.totalInstalado.toLocaleString()} / {dashboardData.kpis.totalCotizado.toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-[#5F5E5A]">Cantidad de materiales</span>
                </div>
              </div>

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

            {/* VISTA 1: GENERAL & HITOS */}
            {activeTab === 'kpis' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel S-Curve (Fase 7 / Tareas 7.2-7.4) */}
                <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
                    <div>
                      <h3 className="text-sm font-bold text-[#1C1C1A]">Curva S de Avance Planeado vs Real</h3>
                      <p className="text-[10px] text-[#5F5E5A]">Progreso acumulado y diario a lo largo del cronograma de obra.</p>
                    </div>
                    {/* Toggle general / diario (Tarea 7.2) */}
                    <div className="flex bg-[#F7F7F5] border border-[#E3E1D9] p-1 rounded-xl text-[10px] font-bold">
                      <button
                        onClick={() => setViewMode('acumulado')}
                        className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                          viewMode === 'acumulado' ? 'bg-[#1C1C1A] text-white shadow-sm' : 'text-[#5F5E5A]'
                        }`}
                      >
                        Acumulado
                      </button>
                      <button
                        onClick={() => setViewMode('diario')}
                        className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                          viewMode === 'diario' ? 'bg-[#1C1C1A] text-white shadow-sm' : 'text-[#5F5E5A]'
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
                      <span className="text-xs text-[#8B8A84] font-medium">Sin datos de S-Curve</span>
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

                {/* Ficha Hitos */}
                <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm lg:col-span-1 space-y-4 max-h-[352px] overflow-y-auto">
                  <div className="flex justify-between items-center pb-2 border-b border-[#E3E1D9]">
                    <h3 className="text-sm font-bold text-[#1C1C1A]">Hitos Clave</h3>
                    <span className="text-xs text-[#5F5E5A] font-semibold">{dashboardData.hitos.length}</span>
                  </div>

                  <div className="divide-y divide-[#E3E1D9]">
                    {dashboardData.hitos.map((hito) => {
                      let tagColor = 'bg-[#F7F7F5] text-[#5F5E5A]';
                      if (hito.estatus === 'completado') tagColor = 'bg-[#EAF3DE] text-[#27500A]';
                      if (hito.estatus === 'atrasado') tagColor = 'bg-[#FDE8E8] text-[#C23939]';

                      return (
                        <div key={hito.id} className="py-2.5 flex justify-between items-center gap-2 text-xs">
                          <div className="min-w-0">
                            <span className="font-bold text-[#1C1C1A] block truncate">{hito.nombre}</span>
                            <span className="text-[9px] text-[#5F5E5A]">
                              Plazo: {new Date(hito.fechaObjetivo).toLocaleDateString()}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${tagColor}`}>
                            {hito.estatus}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 2: TABLA DE CONCILIACIÓN */}
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

            {/* VISTA 3: HISTORIAL DE AVANCES (Tab Activa: avances / Fase 5) */}
            {activeTab === 'avances' && (
              <div className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="pb-2 border-b border-[#E3E1D9] flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1A]">Bitácora Histórica de Avances Diarios</h3>
                    <p className="text-xs text-[#5F5E5A]">Listado de capturas de campo y materiales instalados en obra.</p>
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
                    <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">Clasificación</label>
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
                    <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">Fecha Desde</label>
                    <input
                      type="date"
                      value={filterFechaInicio}
                      onChange={(e) => setFilterFechaInicio(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-[#C9C7BD] rounded-lg font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">Fecha Hasta</label>
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
                    <p className="text-xs">Ajuste los filtros o registre un avance en la app de campo.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {avancesHistory.map((av) => (
                      <div key={av.id} className="p-4 border border-[#E3E1D9] rounded-xl bg-white hover:shadow-xs transition-shadow">
                        <div className="flex flex-wrap justify-between items-start gap-4 pb-2 border-b border-[#E3E1D9] text-xs">
                          <div className="space-y-1">
                            <span className="font-bold text-[#1C1C1A] text-sm">{av.frente}</span>
                            <div className="flex gap-3 text-[10px] text-[#5F5E5A] font-medium">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-[#8B8A84]" /> {av.autor.nombre}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#8B8A84]" /> 
                                {new Date(av.fecha).toLocaleDateString()} {new Date(av.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                            <div key={item.id} className="py-2 flex justify-between items-center text-xs">
                              <div>
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase mr-2 ${
                                  item.tipo === 'planeado' ? 'bg-[#E6F1FB] text-[#0C447C]' : 'bg-[#FCF4E6] text-[#BA7517]'
                                }`}>
                                  {item.tipo === 'planeado' ? 'Planeado' : `No Planeado (${item.subtipo})`}
                                </span>
                                <span className="font-bold text-[#1C1C1A]">
                                  {item.tipo === 'planeado' ? item.material?.codigo : 'MANUAL'}
                                </span>
                                <span className="text-[#5F5E5A] ml-2">
                                  {item.tipo === 'planeado' ? item.material?.descripcion : item.materialManual}
                                </span>
                              </div>
                              <span className="font-bold text-[#27500A] bg-[#EAF3DE]/30 px-2 py-0.5 rounded">
                                +{item.cantidad} {item.material?.unidad || 'pza'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VISTA 4: BITÁCORA DE INCIDENTES */}
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

            {/* VISTA 5: BITÁCORA DE TIEMPOS MUERTOS */}
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

      {/* ================= MODALES DE EDICIÓN Y CREACIÓN ================= */}
      
      {/* MODAL: PROYECTO (CREAR / EDITAR) */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E3E1D9] rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E3E1D9] flex justify-between items-center bg-[#F7F7F5]">
              <h3 className="font-bold text-[#1C1C1A] text-sm">
                {editingProject ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}
              </h3>
              <button onClick={() => setShowProjectModal(false)} className="text-[#5F5E5A] hover:text-[#1C1C1A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">Nombre del Proyecto</label>
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
                <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">Cliente</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Grupo Vega"
                  value={projectForm.cliente}
                  onChange={(e) => setProjectForm({ ...projectForm, cliente: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">Fecha de Inicio</label>
                  <input
                    type="date"
                    required
                    value={projectForm.fechaInicio}
                    onChange={(e) => setProjectForm({ ...projectForm, fechaInicio: e.target.value })}
                    className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">Fin Estimado</label>
                  <input
                    type="date"
                    required
                    value={projectForm.fechaFinEstimada}
                    onChange={(e) => setProjectForm({ ...projectForm, fechaFinEstimada: e.target.value })}
                    className="w-full h-10 px-3 bg-[#F7F7F5] border border-[#C9C7BD] rounded-xl text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full h-10 bg-[#1C1C1A] hover:bg-[#3E3D39] text-white text-xs font-bold rounded-xl cursor-pointer mt-2"
              >
                Guardar Proyecto
              </button>
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
              <button onClick={() => setShowUserModal(false)} className="text-[#5F5E5A] hover:text-[#1C1C1A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">Nombre Completo</label>
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
                <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">Correo Electrónico</label>
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
                  Contraseña {editingUser && <span className="text-[9px] text-[#8B8A84] font-normal">(Dejar en blanco para no cambiar)</span>}
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
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">Perfil / Rol</label>
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
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">Estado de Acceso</label>
                  <select
                    value={userForm.activo ? 'true' : 'false'}
                    onChange={(e) => setUserForm({ ...userForm, activo: e.target.value === 'true' })}
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

      {/* MODAL: REPORTAR AVANCE DIARIO */}
      {showAvanceModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-[#E3E1D9] rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="p-6 border-b border-[#E3E1D9] flex justify-between items-center bg-[#F7F7F5]">
              <div>
                <h3 className="font-bold text-[#1C1C1A] text-sm">Registrar Reporte de Avance Diario</h3>
                <p className="text-[10px] text-[#5F5E5A]">Registrar avance planeado y no planeado simultáneamente para el proyecto.</p>
              </div>
              <button
                onClick={() => {
                  setShowAvanceModal(false);
                  setAvanceItemsList([]);
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
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">Frente de Trabajo *</label>
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
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">Fecha de Captura *</label>
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
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">Latitud (GPS opcional)</label>
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
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">Longitud (GPS opcional)</label>
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
                  <label className="block text-xs font-semibold text-[#5F5E5A] mb-1">Evidencia Fotográfica</label>
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
                  <p className="text-[10px] text-[#5F5E5A]">Seleccione un material de catálogo e indique cantidad.</p>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">Material de Catálogo</label>
                      <select
                        value={currentPlaneadoItem.materialId}
                        onChange={(e) => setCurrentPlaneadoItem({ ...currentPlaneadoItem, materialId: e.target.value })}
                        className="w-full h-9 px-2 bg-white border border-[#C9C7BD] rounded-lg text-xs"
                      >
                        <option value="">-- Seleccionar Material --</option>
                        <optgroup label="Materiales del Proyecto (BOM)">
                          {(dashboardData?.reconciliation || []).map(m => (
                            <option key={m.materialId} value={m.materialId}>
                              {m.codigo} - {m.descripcion} ({m.unidad})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Otros Materiales del Catálogo Maestro">
                          {generalMaterials
                            .filter(g => !(dashboardData?.reconciliation || []).some(p => p.materialId === g.id))
                            .map(m => (
                              <option key={m.id} value={m.id}>
                                {m.codigo} - {m.descripcion} ({m.unidad})
                              </option>
                            ))
                          }
                        </optgroup>
                      </select>
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">Cantidad</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="Ej. 10"
                          value={currentPlaneadoItem.cantidad}
                          onChange={(e) => setCurrentPlaneadoItem({ ...currentPlaneadoItem, cantidad: e.target.value })}
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
                  <p className="text-[10px] text-[#5F5E5A]">Para retrabajos, extras o modificaciones con descripción libre.</p>
                  
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">Subtipo</label>
                        <select
                          value={currentNoPlaneadoItem.subtipo}
                          onChange={(e) => setCurrentNoPlaneadoItem({ ...currentNoPlaneadoItem, subtipo: e.target.value as any })}
                          className="w-full h-9 px-2 bg-white border border-[#C9C7BD] rounded-lg text-xs"
                        >
                          <option value="retrabajo">Retrabajo</option>
                          <option value="extra">Trabajo Extra</option>
                          <option value="modificacion">Modificación</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">Cantidad</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="Ej. 5"
                          value={currentNoPlaneadoItem.cantidad}
                          onChange={(e) => setCurrentNoPlaneadoItem({ ...currentNoPlaneadoItem, cantidad: e.target.value })}
                          className="w-full h-9 px-2 bg-white border border-[#C9C7BD] rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-[#5F5E5A] mb-1">Descripción del Material (Texto Libre)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ej. Soporte metálico a medida de 4 pulgadas"
                          value={currentNoPlaneadoItem.materialManual}
                          onChange={(e) => setCurrentNoPlaneadoItem({ ...currentNoPlaneadoItem, materialManual: e.target.value })}
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
                <label className="block text-xs font-bold text-[#1C1C1A]">Detalle de Avances a Reportar ({avanceItemsList.length})</label>
                {avanceItemsList.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-[#C9C7BD] rounded-xl text-xs text-[#8B8A84] bg-[#F7F7F5]">
                    No se han agregado materiales al reporte. Use los controles de arriba para añadir items planeados o no planeados.
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
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                it.tipo === 'planeado' ? 'bg-[#E6F1FB] text-[#0C447C]' : 'bg-[#FCF4E6] text-[#BA7517]'
                              }`}>
                                {it.tipo === 'planeado' ? 'Planeado' : `No Plan. (${it.subtipo})`}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="font-bold text-[#1C1C1A] mr-2">{it.materialCodigo}</span>
                              <span className="text-[#5F5E5A]">{it.materialDescripcion}</span>
                            </td>
                            <td className="p-2.5 text-right font-bold text-[#27500A]">
                              +{it.cantidad}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => setAvanceItemsList(avanceItemsList.filter((_, i) => i !== idx))}
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
                  }}
                  className="h-10 px-4 border border-[#C9C7BD] text-[#1C1C1A] hover:bg-[#F7F7F5] text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={avanceItemsList.length === 0}
                  className={`h-10 px-6 text-white text-xs font-bold rounded-xl cursor-pointer ${
                    avanceItemsList.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1C1C1A] hover:bg-[#3E3D39]'
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
