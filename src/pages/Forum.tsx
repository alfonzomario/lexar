import { useState } from 'react';
import { Link } from 'react-router';
import { Users, MessageSquare, Search, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export function Forum() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const isBasicOrAbove = user && (user.tier === 'basic' || user.tier === 'pro' || user.tier === 'admin' || user.tier === 'super_admin');

  if (!user) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto text-center py-16 px-6">
        <div className="bg-stone-100 rounded-2xl p-10">
          <Users className="w-14 h-14 text-stone-400 mx-auto mb-4" />
          <p className="text-stone-600 mb-4">Iniciá sesión y contratá el plan Basic o superior para acceder al Foro.</p>
          <Link to="/pricing" className="text-indigo-600 font-medium hover:underline">Ver planes</Link>
        </div>
      </motion.div>
    );
  }

  if (!isBasicOrAbove) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto text-center py-16 px-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10">
          <Users className="w-14 h-14 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 mb-2">Foro Basic</h2>
          <p className="text-stone-600 mb-6">El foro de discusión es exclusivo del plan Basic o superior. Actualizá tu plan para participar.</p>
          <Link to="/pricing" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors">Ver planes Basic</Link>
        </div>
      </motion.div>
    );
  }

  // Mock data for forum
  const topics = [
    { id: 1, title: 'Duda sobre el fallo Siri', category: 'Derecho Constitucional', replies: 12, author: 'Juan Pérez', role: 'Estudiante', date: 'Hace 2 horas' },
    { id: 2, title: '¿Alguien tiene apuntes de Obligaciones cátedra Pizarro?', category: 'Derecho Civil', replies: 5, author: 'María Gómez', role: 'Abogado', date: 'Ayer' },
    { id: 3, title: 'Debate: Reforma al Código Procesal', category: 'Actualidad', replies: 34, author: 'Dr. López', role: 'Profesor', date: 'Hace 3 días' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-indigo-600" />
            Foro de Discusión
          </h1>
          <p className="text-stone-500 mt-2">
            Conectá con otros estudiantes, profesores y profesionales del derecho.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar temas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-stone-200 rounded-xl w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button className="p-2 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors text-stone-600">
            <Filter className="w-5 h-5" />
          </button>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap">
            Nuevo Tema
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="divide-y divide-stone-200">
          {topics.map((topic) => (
            <div key={topic.id} className="p-6 hover:bg-stone-50 transition-colors flex items-start gap-4">
              <div className="bg-stone-100 w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                <MessageSquare className="w-6 h-6 text-stone-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {topic.category}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-1 truncate">
                  {topic.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <span className="font-medium text-stone-700">{topic.author}</span>
                  <span className="text-xs bg-stone-200 px-1.5 py-0.5 rounded text-stone-600">{topic.role}</span>
                  <span>•</span>
                  <span>{topic.date}</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center shrink-0 ml-4 text-stone-500">
                <span className="text-lg font-bold text-stone-900">{topic.replies}</span>
                <span className="text-xs uppercase tracking-wider">Respuestas</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
