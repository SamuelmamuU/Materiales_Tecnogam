import React, { useState } from 'react';
import { Building2, WifiOff, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

type Role = 'administrador' | 'supervisor' | 'trabajador' | 'cliente';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('trabajador');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          rol: role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión. Inténtelo de nuevo.');
      }

      // Guardar tokens en localStorage
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      setSuccess(true);
      
      // Simular redirección
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col justify-center items-center p-4">
      {/* Container principal con estética premium minimalista */}
      <div className="w-full max-w-[380px] bg-[#F1EFE8] border border-[#E3E1D9] rounded-2xl p-8 shadow-sm transition-all duration-300 hover:shadow-md">
        
        {/* Encabezado */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-6 h-6 text-[#0C447C]" />
            <span className="text-lg font-semibold text-[#1C1C1A] tracking-tight">
              Control de materiales
            </span>
          </div>
          <p className="text-xs text-[#5F5E5A] text-center">
            Inicia sesión para continuar
          </p>
        </div>

        {/* Notificación de Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Notificación de Éxito */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>¡Inicio de sesión exitoso! Redireccionando...</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#5F5E5A] mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              placeholder="nombre@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || success}
              className="w-full h-10 px-3 rounded-lg border border-[#E3E1D9] bg-white text-[#1C1C1A] text-sm focus:outline-none focus:border-[#0C447C] focus:ring-1 focus:ring-[#0C447C] transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5F5E5A] mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || success}
                className="w-full h-10 pl-3 pr-10 rounded-lg border border-[#E3E1D9] bg-white text-[#1C1C1A] text-sm focus:outline-none focus:border-[#0C447C] focus:ring-1 focus:ring-[#0C447C] transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || success}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8A84] hover:text-[#1C1C1A] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5F5E5A] mb-1">
              Perfil
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              disabled={loading || success}
              className="w-full h-10 px-3 rounded-lg border border-[#E3E1D9] bg-white text-[#1C1C1A] text-sm focus:outline-none focus:border-[#0C447C] transition-all disabled:opacity-50"
            >
              <option value="trabajador">Trabajador</option>
              <option value="supervisor">Supervisor</option>
              <option value="administrador">Administrador</option>
              <option value="cliente">Cliente</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full h-10 mt-2 bg-[#1C1C1A] text-white hover:bg-[#2D2D29] font-medium text-sm rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ingresando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-[#8B8A84]">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Funciona también sin conexión</span>
        </div>

      </div>
    </div>
  );
}
