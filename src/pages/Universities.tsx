import { useState, useEffect } from 'react';
import { GraduationCap, BookOpen, MessageSquare, Upload, Search, MapPin, ExternalLink, Edit2, X, School } from 'lucide-react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';

export function Universities() {
  const { user } = useAuth();
  const [universities, setUniversities] = useState<any[]>([]);
  const [selectedUni, setSelectedUni] = useState<any>(null);
  const [studyPlan, setStudyPlan] = useState<any[]>([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingUni, setEditingUni] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/universities')
      .then((res) => res.json())
      .then((data) => setUniversities(data));
  }, []);

  const handleEditClick = (e: React.MouseEvent, uni: any) => {
    e.stopPropagation();
    setEditingUni({ ...uni });
    setIsEditModalOpen(true);
  };

  const handleUpdateUni = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUni) return;
    setIsSubmitting(true);

    try {
      const resp = await fetch(`/api/universities/${editingUni.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user?.id)
        },
        body: JSON.stringify(editingUni)
      });
      if (resp.ok) {
        const updated = await resp.json();
        setUniversities(prev => prev.map(u => u.id === updated.id ? updated : u));
        setIsEditModalOpen(false);
      }
    } catch (err) {
      console.error('Error updating university:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUnis = universities.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.province?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-6xl mx-auto"
    >
      <div className="text-center space-y-4">
        <div className="bg-sky-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <GraduationCap className="w-8 h-8 text-sky-600" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Universidades Argentinas con Derecho
        </h1>
        <p className="text-lg text-stone-500 max-w-2xl mx-auto" style={{ fontFamily: "'Lora', serif" }}>
          Explorá los planes de estudio oficiales y accedé a apuntes específicos de cada facultad.
        </p>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar universidad, ciudad o provincia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-sm text-lg"
          />
        </div>
        <div className="flex items-center gap-4 bg-stone-100 px-6 py-4 rounded-2xl shrink-0">
          <div className="text-center px-4 border-r border-stone-200">
            <div className="text-2xl font-bold text-stone-800">{universities.filter(u => u.type === 'Pública').length}</div>
            <div className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Públicas</div>
          </div>
          <div className="text-center px-4">
            <div className="text-2xl font-bold text-stone-800">{universities.filter(u => u.type === 'Privada').length}</div>
            <div className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Privadas</div>
          </div>
        </div>
      </div>

      {/* Universities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUnis.map((uni) => (
          <Link
            key={uni.id}
            to={`/universities/${uni.id}`}
            className="p-6 bg-white border border-stone-200 rounded-2xl shadow-sm hover:border-sky-300 hover:shadow-lg transition-all flex flex-col h-full relative group cursor-pointer"
          >
            {/* Admin Edit Button */}
            {user?.tier === 'super_admin' && (
              <button 
                onClick={(e) => handleEditClick(e, uni)}
                className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm border border-stone-100 text-stone-400 hover:text-sky-600 hover:border-sky-200 transition-all opacity-0 group-hover:opacity-100 z-10"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-500 group-hover:bg-sky-100 group-hover:text-sky-600 flex items-center justify-center shrink-0 transition-colors">
                <School className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className={clsx(
                  "inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2",
                  uni.type === 'Pública' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                )}>
                  {uni.type}
                </span>
                <h3 className="text-lg font-bold text-stone-900 leading-tight mb-1 line-clamp-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {uni.name}
                </h3>
                <div className="flex items-center gap-1.5 text-stone-500 text-xs font-medium">
                  <MapPin className="w-3 h-3" />
                  <span>{uni.city}, {uni.province}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-stone-500 line-clamp-3 mb-6" style={{ fontFamily: "'Lora', serif" }}>
              {uni.description}
            </p>

            <div className="mt-auto flex items-center justify-between pt-4 border-t border-stone-50">
               <div className="text-xs font-bold text-sky-600 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Ver Plan Interactivo
                </div>
              <div className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">
                ID: {uni.id}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingUni && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50"
              onClick={() => setIsEditModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <h3 className="text-xl font-bold text-stone-900">Editar Universidad</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdateUni} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-stone-500 uppercase">Nombre</label>
                    <input 
                      type="text" 
                      value={editingUni.name} 
                      onChange={e => setEditingUni({...editingUni, name: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-500 uppercase">Ciudad</label>
                    <input 
                      type="text" 
                      value={editingUni.city} 
                      onChange={e => setEditingUni({...editingUni, city: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-500 uppercase">Provincia</label>
                    <input 
                      type="text" 
                      value={editingUni.province} 
                      onChange={e => setEditingUni({...editingUni, province: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-500 uppercase">Tipo</label>
                    <select 
                      value={editingUni.type} 
                      onChange={e => setEditingUni({...editingUni, type: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="Pública">Pública</option>
                      <option value="Privada">Privada</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-500 uppercase">Link Plan Estudios</label>
                    <input 
                      type="text" 
                      value={editingUni.program_url || ''} 
                      onChange={e => setEditingUni({...editingUni, program_url: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-stone-500 uppercase">Descripción</label>
                    <textarea 
                      value={editingUni.description} 
                      onChange={e => setEditingUni({...editingUni, description: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 font-bold text-stone-500 hover:bg-stone-50 rounded-2xl">
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-sky-600 text-white font-bold rounded-2xl hover:bg-sky-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


