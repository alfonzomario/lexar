import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Award, Eye, Trophy, Star, ChevronRight, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BalanzaLoader } from '../components/BalanzaLoader';
import { Link } from 'react-router';

export function Profile() {
  const { user } = useAuth();

  const { data: userData, isLoading } = useQuery({
    queryKey: ['meProfile'],
    queryFn: async () => {
      const res = await fetch('/api/me');
      if (!res.ok) throw new Error('Not auth');
      const data = await res.json();
      return data.user;
    },
    enabled: !!user,
  });

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

  const views = userData.total_views || 0;
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
          <p className="text-stone-500 mt-1">{userData.email} · {userData.profile_role}</p>
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
