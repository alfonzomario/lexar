import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Link } from 'react-router';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-stone-500 text-sm font-semibold">Verificando credenciales...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && user.tier !== 'super_admin') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 font-sans">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-8 text-center shadow-lg">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-100">
            <ShieldAlert className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Acceso Restringido</h2>
          <p className="text-stone-500 text-sm mb-6 leading-relaxed">
            No tenés los permisos necesarios para ver esta sección. Esta área es de uso exclusivo para administradores de LexAR.
          </p>
          <Link
            to="/"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors shadow-md cursor-pointer"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
