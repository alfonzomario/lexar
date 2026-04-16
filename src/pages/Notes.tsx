import { useState } from 'react';
import { FileText, Eye, Download, Search, Upload, Lock, User, X, ExternalLink, Crown, Loader2, School, Calendar, Filter, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Extracts the Google Drive file ID from various URL formats:
 * - docs.google.com/document/d/{ID}/edit
 * - drive.google.com/file/d/{ID}/view
 * - docs.google.com/spreadsheets/d/{ID}/edit
 * - docs.google.com/presentation/d/{ID}/edit
 */
function extractDriveId(url: string): string | null {
  const match = url.match(
    /(?:docs|drive|sheets)\.google\.com\/(?:document|file|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/
  );
  return match ? match[1] : null;
}

/** Returns the embeddable preview URL for a Google Drive doc */
function toPreviewUrl(url: string): string | null {
  const id = extractDriveId(url);
  if (!id) return null;

  // Detect type
  if (url.includes('/document/')) return `https://docs.google.com/document/d/${id}/preview`;
  if (url.includes('/spreadsheets/')) return `https://docs.google.com/spreadsheets/d/${id}/preview`;
  if (url.includes('/presentation/')) return `https://docs.google.com/presentation/d/${id}/preview`;
  // Generic Drive file (PDFs, etc.)
  return `https://drive.google.com/file/d/${id}/preview`;
}

/** Returns a direct download/export URL */
function toDownloadUrl(url: string): string | null {
  const id = extractDriveId(url);
  if (!id) return null;

  if (url.includes('/document/')) return `https://docs.google.com/document/d/${id}/export?format=pdf`;
  if (url.includes('/spreadsheets/')) return `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
  if (url.includes('/presentation/')) return `https://docs.google.com/presentation/d/${id}/export/pdf`;
  return `https://drive.google.com/uc?export=download&id=${id}`;
}

function isGoogleDriveUrl(url: string): boolean {
  return /(?:docs|drive|sheets)\.google\.com/.test(url);
}

export function Notes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Filters
  const [filterUniversityId, setFilterUniversityId] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Preview modal state
  const [previewNote, setPreviewNote] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Form state
  const [newNote, setNewNote] = useState({
    title: '',
    file_url: '',
    description: '',
    subject_id: '',
    university_id: '',
    year: '',
  });

  const isPremium = user && ['pro', 'admin', 'super_admin'].includes(user.tier);

  const { data: notes = [], isLoading: isLoadingNotes } = useQuery({
    queryKey: ['notes', filterSubjectId, filterUniversityId, filterYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterSubjectId) params.append('subject_id', filterSubjectId);
      if (filterUniversityId) params.append('university_id', filterUniversityId);
      if (filterYear) params.append('year', filterYear);
      const res = await fetch(`/api/notes?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await fetch('/api/subjects');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const { data: universities = [] } = useQuery({
    queryKey: ['universities'],
    queryFn: async () => {
      const res = await fetch('/api/universities');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const uploadNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user ? { 'X-User-Id': String(user.id) } : {}),
        },
        body: JSON.stringify(noteData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fallo al subir el apunte');
      }
      return response.json();
    },
    onSuccess: () => {
      setNewNote({ title: '', file_url: '', description: '', subject_id: '', university_id: '', year: '' });
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (err: any) => {
      setSubmitError(err.message || 'Error desconocido');
    }
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    // Validate Google Drive URL
    if (!isGoogleDriveUrl(newNote.file_url)) {
      setSubmitError('Por favor, pegá un link válido de Google Drive (docs.google.com o drive.google.com)');
      return;
    }

    uploadNoteMutation.mutate({
      title: newNote.title,
      file_url: newNote.file_url,
      description: newNote.description,
      subject_id: newNote.subject_id,
      university_id: newNote.university_id || null,
      year: newNote.year ? parseInt(newNote.year, 10) : null,
    });
  };

  const openPreview = async (note: any) => {
    setPreviewNote(note);
    setPreviewLoading(true);

    // Increment view count
    try {
      await fetch(`/api/notes/${note.id}/view`, {
        method: 'POST',
        headers: user ? { 'X-User-Id': String(user.id) } : {},
      });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    } catch {}

    // Loading ends when iframe fires onLoad, or after timeout
    setTimeout(() => setPreviewLoading(false), 3000);
  };

  const handleDownload = (note: any) => {
    if (!isPremium) return; // guard

    const url = note.file_url;
    if (!url) return;

    const downloadUrl = toDownloadUrl(url);
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    } else {
      window.open(url, '_blank');
    }
  };

  const filtered = notes.filter((n: any) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.subject_name?.toLowerCase().includes(search.toLowerCase()) ||
    n.author_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-6xl mx-auto"
    >
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="flex-1 relative z-10">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <div className="bg-white/20 p-2 rounded-xl">
              <FileText className="w-8 h-8 text-white" />
            </div>
            Apuntes Colaborativos
          </h1>
          <p className="text-emerald-50 text-lg max-w-xl">
            Resúmenes y material subidos por otros estudiantes con links de Google Drive.
            <strong> ¡Subí los tuyos y conseguí Premium gratis!</strong>
          </p>
        </div>
        <div className="shrink-0 flex flex-col gap-3 w-full md:w-auto relative z-10">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-emerald-700 px-6 py-4 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" /> Subir Apunte
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por materia, título o autor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm text-lg"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              "p-4 rounded-2xl border transition-all shrink-0",
              showFilters || filterUniversityId || filterYear || filterSubjectId
                ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50"
            )}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-stone-900 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-emerald-600" />
                    Filtros Avanzados
                  </h3>
                  {(filterUniversityId || filterYear || filterSubjectId) && (
                    <button
                      onClick={() => { setFilterUniversityId(''); setFilterYear(''); setFilterSubjectId(''); }}
                      className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Limpiar filtros
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Materia */}
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Materia</label>
                    <div className="relative">
                      <select
                        value={filterSubjectId}
                        onChange={(e) => setFilterSubjectId(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none text-sm"
                      >
                        <option value="">Todas las materias</option>
                        {subjects.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Universidad */}
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <School className="w-3.5 h-3.5" /> Universidad
                    </label>
                    <div className="relative">
                      <select
                        value={filterUniversityId}
                        onChange={(e) => setFilterUniversityId(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none text-sm"
                      >
                        <option value="">Todas las universidades</option>
                        {universities.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Año */}
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Año
                    </label>
                    <div className="relative">
                      <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none text-sm"
                      >
                        <option value="">Todos los años</option>
                        {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Notes Grid */}
      {isLoadingNotes ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((note: any) => {
          const hasPreview = note.file_url && isGoogleDriveUrl(note.file_url);

          return (
            <div
              key={note.id}
              onClick={() => { if (note.file_url && isGoogleDriveUrl(note.file_url)) openPreview(note); }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 group flex flex-col h-full relative cursor-pointer"
            >
              {/* View count badge */}
              <div className="absolute top-4 right-4 bg-stone-100 text-stone-600 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-inner">
                <Eye className="w-3.5 h-3.5 text-stone-400" /> {note.views}
              </div>

              {/* Icon */}
              <div className="bg-emerald-50 w-12 h-12 rounded-xl flex items-center justify-center mb-5 border border-emerald-100 group-hover:bg-emerald-600 transition-colors duration-300">
                <FileText className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-stone-900 mb-3 line-clamp-2 pr-12 group-hover:text-emerald-800 transition-colors" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {note.title}
              </h2>

              {/* Subject */}
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                <span className="bg-emerald-100/50 px-2.5 py-1 rounded-md">{note.subject_name}</span>
              </div>

              {/* University badge */}
              {note.university_name && (
                <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-3">
                  <School className="w-3 h-3 text-stone-400" />
                  <span>{note.university_name}</span>
                  {note.year && <span className="text-stone-400">· {note.year}</span>}
                </div>
              )}

              {/* Description or content preview */}
              <p className="text-stone-500 text-sm flex-1 line-clamp-3 mb-6 leading-relaxed" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                {note.content || 'Apunte compartido vía Google Drive.'}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-5 border-t border-stone-100">
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <div className="bg-stone-100 p-1.5 rounded-full">
                    <User className="w-3.5 h-3.5 text-stone-500" />
                  </div>
                  <span className="font-medium">{note.author_name}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Preview button — always available */}
                  {hasPreview && (
                    <button
                      onClick={() => openPreview(note)}
                      className="text-emerald-600 hover:text-emerald-800 font-bold text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-all"
                    >
                      <Eye className="w-4 h-4" /> Ver
                    </button>
                  )}

                  {/* Download button — premium only */}
                  {hasPreview && (
                    isPremium ? (
                      <button
                        onClick={() => handleDownload(note)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all"
                      >
                        <Download className="w-4 h-4" /> Descargar
                      </button>
                    ) : (
                      <span className="text-stone-400 text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-50 cursor-not-allowed" title="Solo para usuarios Premium">
                        <Lock className="w-3.5 h-3.5" /> Premium
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-stone-500 bg-white rounded-3xl border border-stone-200 border-dashed shadow-sm">
            <div className="bg-stone-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 mx-auto text-stone-300" />
            </div>
            <p className="text-xl font-medium text-stone-700 mb-2">No encontramos apuntes</p>
            <p className="max-w-md mx-auto">Intentá con otros términos de búsqueda o sé el primero en subir un apunte sobre este tema.</p>
          </div>
        )}
      </div>
      )}

      {/* ===== UPLOAD MODAL ===== */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-stone-50/50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <div className="bg-emerald-100 p-1.5 rounded-lg">
                    <Upload className="w-5 h-5 text-emerald-600" />
                  </div>
                  Subir Nuevo Apunte
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="p-6 space-y-5">
                {submitError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100">
                    {submitError}
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1.5">
                  <label htmlFor="note-title" className="block text-sm font-bold text-stone-700">Título del Apunte</label>
                  <input
                    id="note-title"
                    type="text"
                    required
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    placeholder="Ej. Resumen Primer Parcial"
                  />
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label htmlFor="note-subject" className="block text-sm font-bold text-stone-700">Materia</label>
                  <select
                    id="note-subject"
                    required
                    value={newNote.subject_id}
                    onChange={(e) => setNewNote({ ...newNote, subject_id: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all appearance-none"
                  >
                    <option value="" disabled>Seleccioná una materia...</option>
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Universidad */}
                <div className="space-y-1.5">
                  <label htmlFor="note-university" className="block text-sm font-bold text-stone-700">
                    Universidad <span className="text-stone-400 font-normal">(opcional)</span>
                  </label>
                  <select
                    id="note-university"
                    value={newNote.university_id}
                    onChange={(e) => setNewNote({ ...newNote, university_id: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all appearance-none"
                  >
                    <option value="">Sin especificar</option>
                    {universities.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* Año */}
                <div className="space-y-1.5">
                  <label htmlFor="note-year" className="block text-sm font-bold text-stone-700">
                    Año <span className="text-stone-400 font-normal">(opcional)</span>
                  </label>
                  <select
                    id="note-year"
                    value={newNote.year}
                    onChange={(e) => setNewNote({ ...newNote, year: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all appearance-none"
                  >
                    <option value="">Sin especificar</option>
                    {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Google Drive Link */}
                <div className="space-y-1.5">
                  <label htmlFor="note-url" className="block text-sm font-bold text-stone-700">
                    Link de Google Drive
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      id="note-url"
                      type="url"
                      required
                      value={newNote.file_url}
                      onChange={(e) => setNewNote({ ...newNote, file_url: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                      placeholder="https://docs.google.com/document/d/..."
                    />
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    Asegurate de que el documento tenga permisos de "Cualquiera con el enlace puede ver".
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label htmlFor="note-desc" className="block text-sm font-bold text-stone-700">
                    Descripción breve <span className="text-stone-400 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    id="note-desc"
                    rows={2}
                    value={newNote.description}
                    onChange={(e) => setNewNote({ ...newNote, description: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none"
                    placeholder="Ej. Resumen de los primeros 5 temas con cuadros sinópticos..."
                  ></textarea>
                </div>

                {/* Actions */}
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 text-stone-600 font-bold hover:bg-stone-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploadNoteMutation.isPending}
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    {uploadNoteMutation.isPending ? 'Subiendo...' : (
                      <>
                        <Upload className="w-4 h-4" />
                        Publicar Apunte
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== PREVIEW MODAL (Google Drive Embed) ===== */}
      <AnimatePresence>
        {previewNote && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50"
              onClick={() => { setPreviewNote(null); setPreviewLoading(false); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-5xl h-[85vh] bg-white rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              {/* Preview Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50 shrink-0">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-stone-900 truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {previewNote.title}
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">{previewNote.subject_name} · {previewNote.author_name}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {/* Download button in preview */}
                  {isPremium ? (
                    <button
                      onClick={() => handleDownload(previewNote)}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      <Download className="w-4 h-4" /> Descargar PDF
                    </button>
                  ) : (
                    <a
                      href="/pricing"
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
                    >
                      <Crown className="w-4 h-4" /> Obtené Premium para descargar
                    </a>
                  )}

                  <button
                    onClick={() => { setPreviewNote(null); setPreviewLoading(false); }}
                    className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Iframe */}
              <div className="flex-1 relative bg-stone-100">
                {previewLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/80">
                    <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-stone-500 font-medium">Cargando documento...</p>
                  </div>
                )}
                {previewNote.file_url && toPreviewUrl(previewNote.file_url) ? (
                  <iframe
                    src={toPreviewUrl(previewNote.file_url)!}
                    className="w-full h-full border-0"
                    onLoad={() => setPreviewLoading(false)}
                    allow="autoplay"
                    title={`Preview: ${previewNote.title}`}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-stone-500">
                    <FileText className="w-16 h-16 text-stone-300 mb-4" />
                    <p className="text-lg font-medium mb-2">No se puede previsualizar</p>
                    <p className="text-sm">El link no es de Google Drive. Podés abrirlo en una pestaña nueva:</p>
                    <a href={previewNote.file_url} target="_blank" rel="noopener noreferrer" className="mt-3 text-emerald-600 underline flex items-center gap-1 font-bold">
                      <ExternalLink className="w-4 h-4" /> Abrir enlace
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
