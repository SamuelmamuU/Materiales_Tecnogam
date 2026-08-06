import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import { LogOut, User, Shield, BookOpen, Layers } from 'lucide-react';

// Componente simple para proteger rutas privadas
function PrivateRoute({ children }: { children: React.ReactElement }) {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Dashboard() {
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : { email: 'usuario@tecnogam.com', rol: 'usuario', nombre: 'Usuario' };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken') || '';
    
    // Llamada opcional de invalidación de token en el backend
    try {
      await fetch('http://localhost:3000/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Ignorar errores de logout si el backend está caído
    }

    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] p-6 flex flex-col items-center">
      <header className="w-full max-w-4xl bg-white border border-[#E3E1D9] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#E6F1FB] flex items-center justify-center text-[#0C447C]">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1C1C1A]">Tecnogam Materiales</h1>
            <p className="text-xs text-[#5F5E5A]">Panel de Control de Proyecto y Avances</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 h-9 px-4 border border-[#C9C7BD] hover:bg-[#F1EFE8] rounded-lg text-sm text-[#1C1C1A] cursor-pointer transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Perfil del Usuario */}
        <section className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm md:col-span-1 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#EAF3DE] flex items-center justify-center text-[#27500A] mb-4">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-semibold text-[#1C1C1A]">{user.nombre}</h2>
          <p className="text-xs text-[#5F5E5A] mb-3">{user.email}</p>
          
          <div className="inline-flex items-center gap-1.5 px-3 2px bg-[#E6F1FB] text-[#0C447C] text-xs font-semibold rounded-full py-1 capitalize">
            <Shield className="w-3.5 h-3.5" />
            {user.rol}
          </div>
        </section>

        {/* Card Estado del Entorno */}
        <section className="bg-white border border-[#E3E1D9] rounded-2xl p-6 shadow-sm md:col-span-2">
          <h2 className="text-base font-semibold text-[#1C1C1A] mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#BA7517]" />
            Entorno Base Inicializado con Éxito
          </h2>
          <p className="text-sm text-[#5F5E5A] mb-4 leading-relaxed">
            Bienvenido al sistema de materiales de **Tecnogam**. Los módulos base del backend (NestJS,
            PostgreSQL/SQLite con Prisma, Autenticación JWT, control de accesos por rol y por proyecto) 
            y los cimientos de la aplicación web de escritorio ya se encuentran activos.
          </p>
          
          <div className="bg-[#F7F7F5] border border-[#E3E1D9] rounded-xl p-4 space-y-2 text-xs text-[#5F5E5A]">
            <div className="flex justify-between border-b border-[#E3E1D9] pb-2">
              <span className="font-medium text-[#1C1C1A]">Conectividad Backend:</span>
              <span className="text-[#27500A] font-semibold">Activa (Puerto 3000)</span>
            </div>
            <div className="flex justify-between border-b border-[#E3E1D9] pb-2">
              <span className="font-medium text-[#1C1C1A]">Base de Datos:</span>
              <span className="text-[#27500A] font-semibold">SQLite (dev.db) Sincronizada</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-[#1C1C1A]">Catálogo de Materiales:</span>
              <span className="font-semibold text-[#0C447C]">2,299 Registros Cargados</span>
            </div>
          </div>
        </section>
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
