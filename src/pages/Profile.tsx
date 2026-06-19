import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Award, Eye, Trophy, Star, ChevronRight, Lock, User, Check, Edit2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BalanzaLoader } from '../components/BalanzaLoader';
import { Link } from 'react-router';
import { clsx } from 'clsx';

export function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editRole, setEditRole] = useState('Estudiante');
  const [editUniversity, setEditUniversity] = useState('');
  const [editLawFirm, setEditLawFirm] = useState('');
  const [editCourtSpecialty, setEditCourtSpecialty] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const { data: userData, isLoading } = useQuery({
    queryKey: ['meProfile'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Not auth');
      const data = await res.json();
      return data.user;
    },
    enabled: !!user,
  });

  // Sync state when userData is loaded
  useEffect(() => {
    if (userData) {
      setEditRole(userData.profile_role || 'Estudiante');
      setEditUniversity(userData.university || '');
      setEditLawFirm(userData.law_firm || '');
      setEditCourtSpecialty(userData.court_specialty || '');
    }
  }, [userData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al actualizar perfil');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meProfile'] });
      setUpdateSuccess(true);
      setIsEditing(false);
      setTimeout(() => setUpdateSuccess(false), 3000);
    },
    onError: (err: any) => {
      setUpdateError(err.message || 'Error desconocido');
    }
  });

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError('');
    
    // Conditional validations
    if (['Estudiante', 'Profesor', 'Profesor y Abogado'].includes(editRole) && !editUniversity.trim()) {
      setUpdateError('La universidad es obligatoria.');
      return;
    }
    if (editRole === 'Juez' && !editCourtSpecialty.trim()) {
      setUpdateError('El fuero es obligatorio para jueces.');
      return;
    }

    updateProfileMutation.mutate({
      profile_role: editRole,
      university: editUniversity,
      law_firm: editLawFirm,
      court_specialty: editCourtSpecialty,
    });
  };

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center flex-col gap-4">
        <Lock className="w-16 h-16 text-stone-300" />
        <h2 className="text-2xl font-bold text-stone-900">Iniciá sesión</h2>
        <p className="text-stone-500">Debes iniciar sesión para ver tu perfil de LexARG.</p>
      </div>
    );
  }

  if (isLoading || !userData) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <BalanzaLoader size="lg" text="Cargando perfil..." />
      </div>
    );
  }

  const views = userData.totalViews || 0;
  let nextTier = 'Basic';
  let nextTierGoal = 500;
  let currentTierName = 'Free';
  let progress = 0;

  if (userData.tier === 'pro' || userData.tier === 'admin' || userData.tier === 'super_admin') {
    currentTierName = 'Pro';
    nextTier = 'Ilimitado';
    nextTierGoal = views;
    progress = 100;
  } else if (userData.tier === 'basic') {
    currentTierName = 'Basic';
    nextTier = 'Pro';
    nextTierGoal = 1000;
    progress = Math.min((views / nextTierGoal) * 100, 100);
  } else {
    currentTierName = 'Free';
    nextTier = 'Basic';
    nextTierGoal = 500;
    progress = Math.min((views / nextTierGoal) * 100, 100);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-4xl mx-auto w-full"
    >
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
        <div className="bg-indigo-100 w-24 h-24 rounded-full flex items-center justify-center shrink-0">
          <span className="text-4xl font-black text-indigo-600 tracking-tighter">
            {userData.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">{userData.name}</h1>
          <p className="text-stone-500 mt-1">{userData.email} · {userData.profile_role || 'Estudiante'}</p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wider">
              <Award className="w-4 h-4" /> Plan: {currentTierName}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-sm font-medium">
              <Eye className="w-4 h-4" /> {views} vistas generadas
            </span>
          </div>
        </div>
      </div>

      {/* Detalles Profesionales */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-stone-50">
          <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900">
            <User className="w-6 h-6 text-indigo-600" />
            Información Profesional
          </h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4" /> Editar
            </button>
          )}
        </div>

        {updateSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl mb-6 text-sm font-medium">
            ¡Perfil actualizado con éxito!
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            {updateError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm font-medium">
                {updateError}
              </div>
            )}
            <div>
              <label htmlFor="edit-role" className="block text-sm font-semibold text-stone-700 mb-1">Trabajo o Posición</label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e: any) => setEditRole(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none"
              >
                <option value="Estudiante">Estudiante</option>
                <option value="Abogado">Abogado</option>
                <option value="Profesor">Profesor</option>
                <option value="Profesor y Abogado">Profesor y Abogado</option>
                <option value="Juez">Juez</option>
              </select>
            </div>

            {(editRole === 'Estudiante' || editRole === 'Profesor' || editRole === 'Profesor y Abogado') && (
              <div>
                <label htmlFor="edit-university" className="block text-sm font-semibold text-stone-700 mb-1">Universidad</label>
                <input
                  id="edit-university"
                  type="text"
                  required
                  value={editUniversity}
                  onChange={(e) => setEditUniversity(e.target.value)}
                  placeholder="Ej. Universidad de Buenos Aires"
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none"
                />
              </div>
            )}

            {(editRole === 'Abogado' || editRole === 'Profesor y Abogado') && (
              <div>
                <label htmlFor="edit-law-firm" className="block text-sm font-semibold text-stone-700 mb-1">Estudio jurídico (opcional)</label>
                <input
                  id="edit-law-firm"
                  type="text"
                  value={editLawFirm}
                  onChange={(e) => setEditLawFirm(e.target.value)}
                  placeholder="Ej. Marval, O'Farrell & Mairal"
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none"
                />
              </div>
            )}

            {editRole === 'Juez' && (
              <div className="space-y-1">
                <label htmlFor="edit-court-specialty" className="block text-sm font-semibold text-stone-700 mb-1">Fuero</label>
                <input
                  id="edit-court-specialty"
                  type="text"
                  required
                  value={editCourtSpecialty}
                  onChange={(e) => setEditCourtSpecialty(e.target.value)}
                  placeholder="Ej. Fuero Penal"
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none"
                />
                <p className="text-stone-400 text-xs italic">Nota: La selección de este rol será posteriormente verificada por el equipo de desarrolladores</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setIsEditing(false); setUpdateError(''); }}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {updateProfileMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Rol / Posición</p>
              <p className="text-stone-800 font-semibold">{userData.profile_role || 'Estudiante'}</p>
            </div>
            {userData.university && (
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Universidad</p>
                <p className="text-stone-800 font-semibold">{userData.university}</p>
              </div>
            )}
            {userData.law_firm && (
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Estudio jurídico</p>
                <p className="text-stone-800 font-semibold">{userData.law_firm}</p>
              </div>
            )}
            {userData.court_specialty && (
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Fuero</p>
                <p className="text-stone-800 font-semibold">{userData.court_specialty}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Progreso de Gamificación
          </h2>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="font-semibold text-stone-700">Progreso a {nextTier}</span>
              <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                {views} / {nextTierGoal} vistas
              </span>
            </div>
            <div className="h-4 bg-stone-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-stone-50 border border-stone-200 p-5 rounded-2xl">
              <h3 className="font-bold text-stone-900 mb-2 flex items-center gap-2">
                <Star className="w-5 h-5 text-indigo-500" /> ¿Cómo subir de nivel?
              </h3>
              <p className="text-sm text-stone-600">
                Cada vez que publicás un Apunte o un Examen validado, suma vistas. 
                Si alcanzás <strong>500 vistas</strong> pasás al plan Basic gratis. 
                Si alcanzás <strong>1000 vistas</strong> ganás el plan Pro de por vida.
              </p>
            </div>
            <div className="bg-stone-50 border border-stone-200 p-5 rounded-2xl flex flex-col justify-center items-center text-center">
              <p className="text-sm text-stone-600 mb-4">
                ¿No podés esperar? Podés suscribirte al plan Pro al instante.
              </p>
              <Link to="/pricing" className="bg-stone-900 text-white px-6 py-2 rounded-xl font-medium hover:bg-stone-800 transition-colors w-full">
                Ver planes
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/my-notes" className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg text-stone-900 mb-1">Mis Anotaciones</h3>
            <p className="text-sm text-stone-500">Apuntes privados en fallos</p>
          </div>
          <ChevronRight className="w-6 h-6 text-stone-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </Link>
        <Link to="/saved" className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg text-stone-900 mb-1">Guardado para después</h3>
            <p className="text-sm text-stone-500">Documentos favoritos</p>
          </div>
          <ChevronRight className="w-6 h-6 text-stone-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

    </motion.div>
  );
}
