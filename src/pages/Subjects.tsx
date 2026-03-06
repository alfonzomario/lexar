import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, Scale, ArrowRight, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export function Subjects() {
  const { user, isSuperAdmin } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIcon, setNewIcon] = useState('BookOpen');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchSubjects = () => {
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data) => setSubjects(data));
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': String(user.id) },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null, icon: newIcon || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear');
      setShowNewModal(false);
      setNewName('');
      setNewDesc('');
      setNewIcon('BookOpen');
      fetchSubjects();
    } catch (err: any) {
      setError(err.message || 'Error al crear la materia');
    } finally {
      setSaving(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 mb-2">Materias</h1>
          <p className="text-stone-500 text-lg">Seleccioná una materia para ver su contenido, fallos y apuntes.</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" />
            Cargar materia
          </button>
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !saving && setShowNewModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-stone-900">Nueva materia</h2>
              <button type="button" onClick={() => !saving && setShowNewModal(false)} className="p-2 text-stone-400 hover:text-stone-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ej. Derecho Constitucional"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Descripción</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Breve descripción de la materia"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !newName.trim()} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Crear materia'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {subjects.map((subject: any, index: number) => (
          <motion.div
            key={subject.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="h-full"
          >
            <Link
              to={`/subjects/${subject.id}`}
              className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 hover:border-indigo-200 hover:shadow-xl transition-all duration-300 group flex flex-col h-full relative overflow-hidden"
            >
              {/* Subtle hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="relative z-10 flex flex-col h-full">
                <div className="bg-indigo-50 w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-indigo-600 transition-all duration-300 shadow-sm">
                  {subject.icon === 'BookOpen' ? (
                    <BookOpen className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
                  ) : (
                    <Scale className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
                  )}
                </div>
                <h2 className="text-xl font-bold mb-3 text-stone-900 group-hover:text-indigo-900 transition-colors line-clamp-2">{subject.name}</h2>
                <p className="text-stone-500 text-sm flex-1 leading-relaxed line-clamp-3">{subject.description}</p>

                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-sm font-bold text-indigo-600 group-hover:text-indigo-700">
                  <span>Ver material completo</span>
                  <div className="bg-indigo-50 p-2 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
