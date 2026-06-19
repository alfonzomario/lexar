import { useEffect, useState } from 'react';
import { Briefcase, MapPin, Clock, Search, Building2, Send, X, Check, User, Mail, FileText, Upload, Plus, Download, GraduationCap, AlertCircle, Phone, Landmark, Loader2, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router';
import { clsx } from 'clsx';

export function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [applyingTo, setApplyingTo] = useState<any>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());

  // Recruiter panel states
  const [isPublishing, setIsPublishing] = useState(false);
  const [viewingApplicationsJob, setViewingApplicationsJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  // Job creation form state
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    provincia: '',
    localidad: '',
    type: 'Full-time',
    customHours: '',
    assistance: 'Presencial',
    description: '',
  });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit job states
  const [editingJob, setEditingJob] = useState<any>(null);
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [editJobForm, setEditJobForm] = useState({
    title: '',
    company: '',
    provincia: '',
    localidad: '',
    type: 'Full-time',
    customHours: '',
    assistance: 'Presencial',
    description: '',
  });

  // Apply form state
  const [coverLetter, setCoverLetter] = useState('');
  const [cvType, setCvType] = useState<'pdf' | 'drive'>('pdf');
  const [cvLink, setCvLink] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvFileBase64, setCvFileBase64] = useState<string | null>(null);
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyError, setApplyError] = useState('');

  const isPro = user?.tier === 'pro' || user?.tier === 'super_admin';

  const fetchJobs = () => {
    if (!isPro) return;
    fetch('/api/jobs', { headers: user ? { 'X-User-Id': String(user.id) } : {} })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setJobs(data))
      .catch(() => setJobs([]));
  };

  useEffect(() => {
    if (!isPro) return;
    fetchJobs();
    // Fetch user applications
    fetch('/api/me/applications')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const appliedSet = new Set<number>(data.map((app: any) => app.job_id));
        setApplied(appliedSet);
      })
      .catch(() => {});
  }, [user, isPro]);

  const fetchApplications = async (jobId: number) => {
    setLoadingApps(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/applications`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      } else {
        setApplications([]);
      }
    } catch {
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  };

  const handleOpenApplications = (job: any) => {
    setViewingApplicationsJob(job);
    fetchApplications(job.id);
  };

  const filtered = jobs.filter((j: any) =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company.toLowerCase().includes(search.toLowerCase()) ||
    j.location.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreateError('');
    setCreating(true);

    const jobType = newJob.type === 'Custom' 
      ? `${newJob.customHours} horas/semana` 
      : newJob.type;

    const locationCombined = `${newJob.localidad.trim()}, ${newJob.provincia.trim()}`;

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newJob.title,
          company: newJob.company,
          location: locationCombined,
          type: jobType,
          assistance: newJob.assistance,
          description: newJob.description,
        })
      });

      if (res.ok) {
        setIsPublishing(false);
        setNewJob({
          title: '',
          company: '',
          provincia: '',
          localidad: '',
          type: 'Full-time',
          customHours: '',
          assistance: 'Presencial',
          description: '',
        });
        fetchJobs();
      } else {
        const data = await res.json();
        setCreateError(data.error || 'Error al crear oferta');
      }
    } catch {
      setCreateError('Error de conexión');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEditJob = (job: any) => {
    const locParts = (job.location || '').split(', ');
    const loc = locParts[0] || '';
    const prov = locParts[1] || '';
    
    let jobType = job.type || 'Full-time';
    let hrs = '';
    if (jobType.endsWith(' horas/semana')) {
      hrs = jobType.replace(' horas/semana', '');
      jobType = 'Custom';
    }

    setEditingJob(job);
    setEditJobForm({
      title: job.title || '',
      company: job.company || '',
      provincia: prov,
      localidad: loc,
      type: jobType,
      customHours: hrs,
      assistance: job.assistance || 'Presencial',
      description: job.description || '',
    });
    setIsEditingJob(true);
  };

  const handleUpdateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingJob) return;
    setCreateError('');
    setCreating(true);

    const jobType = editJobForm.type === 'Custom' 
      ? `${editJobForm.customHours} horas/semana` 
      : editJobForm.type;

    const locationCombined = `${editJobForm.localidad.trim()}, ${editJobForm.provincia.trim()}`;

    try {
      const res = await fetch(`/api/jobs/${editingJob.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editJobForm.title,
          company: editJobForm.company,
          location: locationCombined,
          type: jobType,
          assistance: editJobForm.assistance,
          description: editJobForm.description,
        })
      });

      if (res.ok) {
        setIsEditingJob(false);
        setEditingJob(null);
        fetchJobs();
      } else {
        const data = await res.json();
        setCreateError(data.error || 'Error al actualizar oferta');
      }
    } catch {
      setCreateError('Error de conexión');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteJob = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que querés eliminar esta oferta de empleo? Se borrarán todas las postulaciones recibidas.')) return;
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchJobs();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar la oferta');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const handleCvFileChange = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setApplyError('El archivo debe ser estrictamente en formato PDF (.pdf)');
      setCvFile(null);
      return;
    }
    setApplyError('');
    setCvFile(file);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingTo || !user) return;
    setApplyError('');
    setSubmittingApply(true);

    if (cvType === 'pdf' && !cvFile) {
      setApplyError('Por favor, selecciona un archivo PDF de currículum.');
      setSubmittingApply(false);
      return;
    }
    if (cvType === 'drive' && !cvLink.trim()) {
      setApplyError('Por favor, pega un enlace válido de Google Drive.');
      setSubmittingApply(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('coverLetter', coverLetter);
      formData.append('cvType', cvType);
      if (cvType === 'drive') {
        formData.append('cvLink', cvLink.trim());
      } else if (cvType === 'pdf' && cvFile) {
        formData.append('cv', cvFile);
        formData.append('cvFileName', cvFile.name);
      }

      const res = await fetch(`/api/jobs/${applyingTo.id}/apply`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setApplied(prev => new Set(prev).add(applyingTo.id));
        setApplyingTo(null);
        setCoverLetter('');
        setCvLink('');
        setCvFile(null);
      } else {
        const data = await res.json();
        setApplyError(data.error || 'Error al postularse');
      }
    } catch (err) {
      setApplyError('Error de conexión');
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleDownloadPdf = async (applicationId: number, fileName: string) => {
    try {
      const res = await fetch(`/api/jobs/applications/${applicationId}/download-cv`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Error al descargar el archivo PDF.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'cv.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error de conexión al descargar el currículum.');
    }
  };

  if (user && !isPro) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto text-center py-16 px-6"
      >
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-10 shadow-sm">
          <Briefcase className="w-14 h-14 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 mb-2">Bolsa de Trabajo Pro</h2>
          <p className="text-stone-600 mb-6">
            La bolsa de empleo es exclusiva del plan Pro. Actualizá tu plan para ver ofertas de pasantías y puestos en estudios jurídicos.
          </p>
          <Link to="/pricing" className="inline-flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-stone-800 transition-colors shadow-md">
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
        <div className="bg-stone-100 rounded-3xl p-10 border border-stone-200">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-stone-400" />
          <p className="text-stone-600 mb-4 font-semibold text-lg">Iniciá sesión y contratá el plan Pro para acceder a la Bolsa de Trabajo.</p>
          <Link to="/pricing" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors inline-block shadow-md">Ver planes</Link>
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
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-stone-900 to-indigo-950 text-white p-8 md:p-10 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="flex-1 relative z-10">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <div className="bg-indigo-600/30 p-2 rounded-xl border border-indigo-500/20">
              <Briefcase className="w-8 h-8 text-indigo-400" />
            </div>
            Bolsa de Trabajo
          </h1>
          <p className="text-stone-300">Oportunidades exclusivas publicadas por estudios y compañías para nuestra comunidad.</p>
        </div>
        <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto relative z-10">
          <button
            onClick={() => setIsPublishing(true)}
            className="bg-indigo-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5" /> Publicar Empleo
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input
          type="text"
          placeholder="Buscar por puesto, estudio jurídico o ubicación..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm text-base"
        />
      </div>

      {/* Jobs Grid */}
      <div className="space-y-4">
        {filtered.map((job: any) => {
          const hasApplied = applied.has(job.id);
          const isCreator = job.author_id === user.id || user.tier === 'super_admin';

          return (
            <div
              key={job.id}
              className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col md:flex-row md:items-center gap-6"
            >
              <div className="bg-stone-50 w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border border-stone-100 group-hover:bg-indigo-50 transition-colors">
                <Building2 className="w-8 h-8 text-stone-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              
              <div className="flex-1 space-y-1.5">
                <h2 className="text-xl font-bold text-stone-900 group-hover:text-indigo-600 transition-colors leading-tight">
                  {job.title}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500">
                  <span className="font-semibold text-stone-750">{job.company}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-stone-400" /> {job.location}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-stone-400" /> {job.type} {job.assistance && `(${job.assistance})`}</span>
                </div>
                <p className="text-stone-600 text-sm leading-relaxed max-w-3xl whitespace-pre-line pt-1">{job.description}</p>
              </div>

              <div className="shrink-0 flex flex-col items-stretch md:items-end gap-3 min-w-[160px]">
                <span className="text-xs font-semibold text-stone-400 text-center md:text-right">Publicado: {job.date}</span>
                {isCreator && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleOpenApplications(job)}
                      className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-5 py-2 rounded-xl font-bold text-sm transition-colors text-center cursor-pointer flex items-center justify-center gap-2"
                    >
                      Ver postulaciones
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEditJob(job)}
                        className="flex-1 bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
                        title="Editar oferta"
                      >
                        <Pencil className="w-3 h-3" /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 p-2 rounded-xl transition-colors cursor-pointer"
                        title="Eliminar oferta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                {hasApplied ? (
                  <span className="inline-flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-5 py-2.5 rounded-xl font-bold border border-emerald-200 text-sm">
                    <Check className="w-4 h-4 font-bold" /> Postulado
                  </span>
                ) : (
                  <button
                    onClick={() => setApplyingTo(job)}
                    className="bg-stone-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-stone-850 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <Send className="w-4 h-4" /> Postularse
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-20 text-stone-500 bg-white rounded-3xl border border-stone-200 border-dashed">
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-40 text-indigo-600" />
            <p className="text-lg font-bold text-stone-700">No encontramos ofertas</p>
            <p className="text-sm text-stone-400 mt-1">Intentá con otros términos de búsqueda.</p>
          </div>
        )}
      </div>

      {/* ===== POSTULARSE MODAL ===== */}
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
                <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <div className="bg-indigo-100 p-1.5 rounded-lg">
                    <Send className="w-5 h-5 text-indigo-650" />
                  </div>
                  Postularse al Puesto
                </h2>
                <button onClick={() => setApplyingTo(null)} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleApply} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {applyError && (
                  <div className="bg-red-50 text-red-650 p-3.5 rounded-xl text-xs font-semibold border border-red-150 flex gap-2 items-start">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{applyError}</span>
                  </div>
                )}

                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-1">
                  <p className="font-bold text-indigo-950 text-base">{applyingTo.title}</p>
                  <p className="text-xs text-indigo-850 font-semibold">{applyingTo.company} — {applyingTo.location}</p>
                </div>

                {/* Cover Letter */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-stone-700 flex items-center gap-1">
                    Carta de Presentación
                  </label>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Contá brevemente por qué sos ideal para esta posición..."
                    rows={4}
                    required
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none text-sm"
                  />
                </div>

                {/* CV Picker tabs */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-stone-700">Currículum Vitae (CV)</label>
                  <div className="bg-stone-100 p-1 rounded-xl flex">
                    <button
                      type="button"
                      onClick={() => { setCvType('pdf'); setApplyError(''); }}
                      className={clsx(
                        "flex-1 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer",
                        cvType === 'pdf' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                      )}
                    >
                      Subir archivo PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCvType('drive'); setApplyError(''); }}
                      className={clsx(
                        "flex-1 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer",
                        cvType === 'drive' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                      )}
                    >
                      Google Drive Link
                    </button>
                  </div>
                </div>

                {/* CV Content input */}
                {cvType === 'pdf' ? (
                  <div className="space-y-2">
                    <div 
                      onClick={() => document.getElementById('cv-file-input')?.click()}
                      className="border-2 border-dashed border-stone-300 rounded-2xl p-6 text-center hover:border-indigo-500 transition-colors cursor-pointer bg-stone-50/50"
                    >
                      <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                      <span className="text-sm font-bold text-stone-700 block">Elegir archivo PDF</span>
                      <span className="text-xs text-stone-400 block mt-1">Límite 5MB. Formato estrictamente .pdf</span>
                      <input
                        id="cv-file-input"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCvFileChange(file);
                        }}
                        className="hidden"
                      />
                    </div>
                    {cvFile && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-emerald-800 font-semibold truncate">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">{cvFile.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCvFile(null)}
                          className="text-stone-400 hover:text-rose-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="url"
                      placeholder="https://docs.google.com/document/d/..."
                      value={cvLink}
                      onChange={(e) => setCvLink(e.target.value)}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                    />
                    <span className="text-[10px] text-stone-400 block pl-1">Asegurate de que el enlace de Drive tenga permisos de lectura abiertos.</span>
                  </div>
                )}

                <p className="text-[11px] text-stone-450 leading-relaxed italic pt-1">
                  Tu perfil profesional (Nombre, DNI, Email, Teléfono, Universidad) se adjuntará automáticamente a tu postulación.
                </p>

                {/* Action buttons */}
                <div className="flex gap-3 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setApplyingTo(null)}
                    className="flex-1 px-4 py-3 text-stone-600 font-bold hover:bg-stone-100 rounded-xl transition-colors cursor-pointer text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingApply || !coverLetter.trim() || (cvType === 'pdf' && !cvFile) || (cvType === 'drive' && !cvLink.trim())}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm shadow-md"
                  >
                    {submittingApply ? 'Enviando...' : (
                      <><Send className="w-4 h-4" /> Enviar postulación</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== PUBLICAR EMPLEO MODAL ===== */}
      <AnimatePresence>
        {isPublishing && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50"
              onClick={() => setIsPublishing(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-stone-50/50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <div className="bg-indigo-100 p-1.5 rounded-lg">
                    <Plus className="w-5 h-5 text-indigo-650" />
                  </div>
                  Publicar Oferta de Empleo
                </h2>
                <button onClick={() => setIsPublishing(false)} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateJob} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {createError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold border border-red-100">
                    {createError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Posición abierta */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Posición Abierta</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Abogado Junior Civil"
                      value={newJob.title}
                      onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                    />
                  </div>

                  {/* Nombre del estudio */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Estudio o Compañía</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Estudio Marval"
                      value={newJob.company}
                      onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Provincia */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Provincia</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. CABA o Buenos Aires"
                      value={newJob.provincia}
                      onChange={(e) => setNewJob({ ...newJob, provincia: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                    />
                  </div>

                  {/* Localidad */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Localidad</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. San Isidro o Retiro"
                      value={newJob.localidad}
                      onChange={(e) => setNewJob({ ...newJob, localidad: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Modalidad Jornada */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Modalidad de Jornada</label>
                    <select
                      value={newJob.type}
                      onChange={(e) => setNewJob({ ...newJob, type: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Custom">Carga horaria personalizada</option>
                    </select>
                  </div>

                  {/* Asistencia */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Modalidad de Asistencia</label>
                    <select
                      value={newJob.assistance}
                      onChange={(e) => setNewJob({ ...newJob, assistance: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                    >
                      <option value="Presencial">Presencial</option>
                      <option value="Híbrido">Híbrido</option>
                      <option value="Remoto">Remoto</option>
                    </select>
                  </div>
                </div>

                {/* Custom Hours (conditional) */}
                {newJob.type === 'Custom' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Horas semanales</label>
                    <input
                      type="number"
                      required
                      placeholder="Ej. 30"
                      value={newJob.customHours}
                      onChange={(e) => setNewJob({ ...newJob, customHours: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                    />
                  </div>
                )}

                {/* Description */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Descripción y Requisitos</label>
                  <textarea
                    required
                    placeholder="Detalles sobre tareas a realizar, competencias requeridas y remuneración (opcional)..."
                    rows={5}
                    value={newJob.description}
                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none text-sm"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex gap-3 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsPublishing(false)}
                    className="flex-1 px-4 py-3 text-stone-600 font-bold hover:bg-stone-100 rounded-xl transition-colors cursor-pointer text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm shadow-md"
                  >
                    {creating ? 'Publicando...' : <><Check className="w-4 h-4" /> Publicar Oferta</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== EDITAR EMPLEO MODAL ===== */}
      <AnimatePresence>
        {isEditingJob && editingJob && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50"
              onClick={() => { setIsEditingJob(false); setEditingJob(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-stone-50/50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <div className="bg-indigo-100 p-1.5 rounded-lg">
                    <Pencil className="w-5 h-5 text-indigo-650" />
                  </div>
                  Editar Oferta de Empleo
                </h2>
                <button onClick={() => { setIsEditingJob(false); setEditingJob(null); }} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateJobSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {createError && (
                  <div className="bg-red-50 text-red-650 p-3 rounded-xl text-xs font-semibold border border-red-100">
                    {createError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Posición abierta */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Posición Abierta</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Abogado Junior Civil"
                      value={editJobForm.title}
                      onChange={(e) => setEditJobForm({ ...editJobForm, title: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                    />
                  </div>

                  {/* Nombre del estudio */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Estudio o Compañía</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Estudio Marval"
                      value={editJobForm.company}
                      onChange={(e) => setEditJobForm({ ...editJobForm, company: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Provincia */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Provincia</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Buenos Aires"
                      value={editJobForm.provincia}
                      onChange={(e) => setEditJobForm({ ...editJobForm, provincia: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                    />
                  </div>

                  {/* Localidad */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Localidad</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. San Isidro"
                      value={editJobForm.localidad}
                      onChange={(e) => setEditJobForm({ ...editJobForm, localidad: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tipo de jornada */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Carga Horaria</label>
                    <select
                      value={editJobForm.type}
                      onChange={(e) => setEditJobForm({ ...editJobForm, type: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                    >
                      <option value="Full-time">Full-time (9 a 18 hs)</option>
                      <option value="Part-time">Part-time (9 a 13 hs o similar)</option>
                      <option value="Custom">Carga horaria personalizada...</option>
                    </select>
                  </div>

                  {/* Modalidad de asistencia */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Modalidad</label>
                    <select
                      value={editJobForm.assistance}
                      onChange={(e) => setEditJobForm({ ...editJobForm, assistance: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                    >
                      <option value="Presencial">Presencial</option>
                      <option value="Híbrido">Híbrido</option>
                      <option value="Remoto">Remoto</option>
                    </select>
                  </div>
                </div>

                {editJobForm.type === 'Custom' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Horas semanales</label>
                    <input
                      type="number"
                      required
                      placeholder="Ej. 20"
                      value={editJobForm.customHours}
                      onChange={(e) => setEditJobForm({ ...editJobForm, customHours: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
                    />
                  </div>
                )}

                {/* Descripción */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Requisitos y Descripción</label>
                  <textarea
                    required
                    placeholder="Detalles del puesto, requisitos, beneficios..."
                    value={editJobForm.description}
                    onChange={(e) => setEditJobForm({ ...editJobForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsEditingJob(false); setEditingJob(null); }}
                    className="flex-1 px-4 py-3 text-stone-600 font-bold hover:bg-stone-100 rounded-xl transition-colors cursor-pointer text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm shadow-md"
                  >
                    {creating ? 'Guardando...' : <><Check className="w-4 h-4" /> Guardar Cambios</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== POSTULACIONES RECIBIDAS MODAL ===== */}
      <AnimatePresence>
        {viewingApplicationsJob && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50"
              onClick={() => setViewingApplicationsJob(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-stone-50/50">
                <div>
                  <h2 className="text-xl font-bold text-stone-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Postulaciones recibidas
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">{viewingApplicationsJob.title} — {viewingApplicationsJob.company}</p>
                </div>
                <button onClick={() => setViewingApplicationsJob(null)} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto bg-stone-50">
                {loadingApps ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="w-8 h-8 text-indigo-650 animate-spin" />
                  </div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-10 text-stone-500 bg-white rounded-2xl border border-stone-200">
                    <User className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                    <p className="font-bold text-sm">No hay postulaciones recibidas todavía</p>
                    <p className="text-xs text-stone-400 mt-1">Los candidatos aplicarán subiendo su CV.</p>
                  </div>
                ) : (
                  applications.map((app: any) => (
                    <div key={app.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                      {/* Applicant Profile info */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-stone-100 pb-3">
                        <div className="space-y-1">
                          <h3 className="font-bold text-stone-900 text-base flex items-center gap-1.5">
                            {app.user_name}
                          </h3>
                          {app.user_university && (
                            <p className="text-xs text-stone-500 flex items-center gap-1">
                              <GraduationCap className="w-3.5 h-3.5 text-stone-400" /> {app.user_university}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-stone-600 space-y-1 text-left sm:text-right">
                          {app.user_phone && <p className="flex items-center gap-1 sm:justify-end"><Phone className="w-3 h-3 text-stone-400" /> {app.user_phone}</p>}
                          <p className="flex items-center gap-1 sm:justify-end"><Mail className="w-3 h-3 text-stone-400" /> {app.user_email}</p>
                          {app.dni && <p className="text-[10px] text-stone-400 font-semibold">DNI: {app.dni}</p>}
                        </div>
                      </div>

                      {/* Presentation letter */}
                      <div>
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Carta de Presentación</h4>
                        <p className="text-stone-700 text-sm whitespace-pre-line leading-relaxed font-sans">{app.cover_letter}</p>
                      </div>

                      {/* Curriculum download / link */}
                      <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-150">
                        <div className="flex items-center gap-2 text-xs font-semibold text-stone-750">
                          <FileText className="w-4 h-4 text-stone-450 shrink-0" />
                          <span>CV: {app.cv_type === 'pdf' ? app.cv_file_name : 'Google Drive'}</span>
                        </div>
                        {app.cv_type === 'pdf' ? (
                          <button
                            onClick={() => handleDownloadPdf(app.id, app.cv_file_name)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                          >
                            <Download className="w-3 h-3" /> Descargar PDF
                          </button>
                        ) : (
                          <a
                            href={app.cv_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-sm transition-colors"
                          >
                            Abrir enlace
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 border-t border-stone-100 flex justify-end">
                <button
                  onClick={() => setViewingApplicationsJob(null)}
                  className="bg-stone-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-stone-850 transition-colors cursor-pointer text-sm shadow-sm"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
