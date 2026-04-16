import { useEffect, useState } from 'react';
import { Briefcase, MapPin, Clock, Search, Building2, Send, X, Check, User, Mail, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router';
import { clsx } from 'clsx';

export function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [applyingTo, setApplyingTo] = useState<any>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());

  // Form state
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isPro = user?.tier === 'pro' || user?.tier === 'super_admin';

  useEffect(() => {
    if (!isPro) return;
    fetch('/api/jobs', { headers: user ? { 'X-User-Id': String(user.id) } : {} })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setJobs(data))
      .catch(() => setJobs([]));
  }, [isPro, user?.id]);

  const filtered = jobs.filter((j: any) =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.firm.toLowerCase().includes(search.toLowerCase())
  );

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingTo || !user) return;
    setSubmitting(true);
    // Simulate submission (in production this would POST to an API)
    setTimeout(() => {
      setApplied(prev => new Set(prev).add(applyingTo.id));
      setApplyingTo(null);
      setCoverLetter('');
      setSubmitting(false);
    }, 1000);
  };

  if (user && !isPro) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto text-center py-16 px-6"
      >
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10">
          <Briefcase className="w-14 h-14 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 mb-2">Bolsa de Trabajo Pro</h2>
          <p className="text-stone-600 mb-6">
            La bolsa de empleo es exclusiva del plan Pro. Actualizá tu plan para ver ofertas de pasantías y puestos en estudios jurídicos.
          </p>
          <Link to="/pricing" className="inline-flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors">
            Ver planes Pro
          </Link>
        </div>
      </motion.div>
    );
  }

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto text-center py-16 px-6"
      >
        <div className="bg-stone-100 rounded-2xl p-10">
          <p className="text-stone-600 mb-4">Iniciá sesión y contratá el plan Pro para acceder a la Bolsa de Trabajo.</p>
          <Link to="/pricing" className="text-indigo-600 font-medium hover:underline">Ver planes</Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-indigo-600 text-white p-8 rounded-3xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 mb-2">
            <Briefcase className="w-8 h-8 text-indigo-200" />
            Bolsa de Trabajo
          </h1>
          <p className="text-indigo-100">Oportunidades exclusivas para estudiantes y jóvenes abogados.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
          <input
            type="text"
            placeholder="Buscar puesto o estudio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-indigo-700/50 border border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all placeholder-indigo-300 text-white"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((job: any) => {
          const hasApplied = applied.has(job.id);
          return (
            <div
              key={job.id}
              className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col md:flex-row md:items-center gap-6"
            >
              <div className="bg-stone-50 w-16 h-16 rounded-xl flex items-center justify-center shrink-0 border border-stone-100">
                <Building2 className="w-8 h-8 text-stone-400" />
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl font-bold text-stone-900 mb-1 group-hover:text-indigo-600 transition-colors">
                  {job.title}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500 mb-3">
                  <span className="font-medium text-stone-700">{job.firm}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {job.type}</span>
                </div>
                <p className="text-stone-600 text-sm line-clamp-2">{job.description}</p>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-3">
                <span className="text-xs font-medium text-stone-400">Publicado: {job.date}</span>
                {hasApplied ? (
                  <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-6 py-2 rounded-lg font-semibold border border-emerald-200">
                    <Check className="w-4 h-4" /> Postulado
                  </span>
                ) : (
                  <button
                    onClick={() => setApplyingTo(job)}
                    className="bg-stone-900 text-white px-6 py-2 rounded-lg font-semibold hover:bg-stone-800 transition-colors w-full md:w-auto flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Postularse
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-200 border-dashed">
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No se encontraron ofertas para "{search}".</p>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      <AnimatePresence>
        {applyingTo && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50"
              onClick={() => setApplyingTo(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-stone-50/50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900">
                  <Send className="w-5 h-5 text-indigo-600" />
                  Postularse
                </h2>
                <button onClick={() => setApplyingTo(null)} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleApply} className="p-6 space-y-5">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <p className="font-bold text-stone-900">{applyingTo.title}</p>
                  <p className="text-sm text-stone-600">{applyingTo.firm} — {applyingTo.location}</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Nombre
                  </label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    disabled
                    className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Carta de presentación
                  </label>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Contá brevemente por qué te interesa esta posición y tu experiencia relevante..."
                    rows={5}
                    required
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
                  />
                </div>

                <p className="text-xs text-stone-400">
                  Tu perfil de LexARG (nombre, universidad, experiencia) se adjuntará automáticamente.
                </p>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setApplyingTo(null)}
                    className="flex-1 px-4 py-3 text-stone-600 font-bold hover:bg-stone-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!coverLetter.trim() || submitting}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Enviando...' : (
                      <><Send className="w-4 h-4" /> Enviar postulación</>
                    )}
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
