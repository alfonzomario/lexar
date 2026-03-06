import { useEffect, useState } from 'react';
import { FileText, Eye, Download, Search, Upload, Star, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';

export function Notes() {
  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Form state
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    subject_id: ''
  });

  const fetchNotes = () => {
    fetch('/api/notes')
      .then((res) => res.json())
      .then((data) => setNotes(data));
  };

  useEffect(() => {
    fetchNotes();
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data) => setSubjects(data));
  }, []);

  const handleViewNote = async (id: number) => {
    // Increment view count
    await fetch(`/api/notes/${id}/view`, { method: 'POST' });

    // Refresh notes to show updated view count
    fetchNotes();
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote),
      });

      if (!response.ok) {
        throw new Error('Fallo al subir el apunte');
      }

      // Reset form and close modal
      setNewNote({ title: '', content: '', subject_id: '' });
      setIsModalOpen(false);

      // Refresh list
      fetchNotes();
    } catch (err: any) {
      setSubmitError(err.message || 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = notes.filter((n: any) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.subject_name.toLowerCase().includes(search.toLowerCase()) ||
    n.author_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-6xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="flex-1 relative z-10">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2 rounded-xl">
              <FileText className="w-8 h-8 text-white" />
            </div>
            Apuntes Colaborativos
          </h1>
          <p className="text-emerald-50 text-lg max-w-xl">
            Resúmenes y cuadros sinópticos subidos por otros estudiantes.
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

      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input
          type="text"
          placeholder="Buscar por materia, título o autor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm text-lg"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((note: any) => (
          <div
            key={note.id}
            className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 group flex flex-col h-full relative"
          >
            <div className="absolute top-4 right-4 bg-stone-100 text-stone-600 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-inner">
              <Eye className="w-3.5 h-3.5 text-stone-400" /> {note.views}
            </div>

            <div className="bg-emerald-50 w-12 h-12 rounded-xl flex items-center justify-center mb-5 border border-emerald-100 group-hover:bg-emerald-600 transition-colors duration-300">
              <FileText className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
            </div>

            <h2 className="text-xl font-bold text-stone-900 mb-3 line-clamp-2 pr-12 group-hover:text-emerald-800 transition-colors">
              {note.title}
            </h2>

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 mb-4">
              <span className="bg-emerald-100/50 px-2.5 py-1 rounded-md">{note.subject_name}</span>
            </div>

            <p className="text-stone-500 text-sm flex-1 line-clamp-3 mb-6 leading-relaxed">
              {note.content}
            </p>

            <div className="flex items-center justify-between pt-5 border-t border-stone-100">
              <div className="flex items-center gap-2 text-sm text-stone-600">
                <div className="bg-stone-100 p-1.5 rounded-full">
                  <User className="w-3.5 h-3.5 text-stone-500" />
                </div>
                <span className="font-medium">{note.author_name}</span>
              </div>
              <button
                onClick={() => handleViewNote(note.id)}
                className="text-emerald-600 hover:text-emerald-800 font-bold text-sm flex items-center gap-1.5 group/btn"
              >
                <Download className="w-4 h-4 group-hover/btn:-translate-y-0.5 transition-transform" /> Ver
              </button>
            </div>
          </div>
        ))}

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

      {/* Upload Modal */}
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
                <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900">
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

                <div className="space-y-1.5">
                  <label htmlFor="title" className="block text-sm font-bold text-stone-700">Título del Apunte</label>
                  <input
                    id="title"
                    type="text"
                    required
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    placeholder="Ej. Resumen Primer Parcial"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="subject" className="block text-sm font-bold text-stone-700">Materia</label>
                  <select
                    id="subject"
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

                <div className="space-y-1.5">
                  <label htmlFor="content" className="block text-sm font-bold text-stone-700">Contenido o Enlace</label>
                  <textarea
                    id="content"
                    required
                    rows={4}
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none"
                    placeholder="Escribí un resumen corto o pega el enlace a tu Google Doc/PDF..."
                  ></textarea>
                </div>

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
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    {isSubmitting ? 'Subiendo...' : (
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
    </motion.div>
  );
}
