import { useState, useRef, useCallback } from 'react';
import { UserRoleBadge } from '../components/UserRoleBadge';
import { FileText, Eye, Download, Search, Upload, Lock, User, X, ExternalLink, Crown, Loader2, School, Calendar, Filter, ChevronDown, GraduationCap, ThumbsUp, ThumbsDown, Bookmark, Send, PencilLine, Trash2, FileUp } from 'lucide-react';
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

/** Returns the embeddable preview URL for a Google Drive doc or local files */
function toPreviewUrl(url: string): string | null {
  if (!url) return null;
  if (!isGoogleDriveUrl(url)) {
    // If it's a PDF or image, it is previewable directly
    const ext = url.split('.').pop()?.toLowerCase();
    if (ext === 'pdf' || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) {
      return url;
    }
    return null; // Not directly previewable in iframe (like Word doc)
  }
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
  if (!url) return null;
  if (!isGoogleDriveUrl(url)) {
    return url; // Local path itself
  }
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
  const [uploadMethod, setUploadMethod] = useState<'drive' | 'file'>('drive');
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    chair_name: '',
    profesor: '',
  });

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [voteState, setVoteState] = useState<{ vote: number; likes: number; dislikes: number }>({ vote: 0, likes: 0, dislikes: 0 });
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);

  // Edit / Delete states & handlers
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [editNoteForm, setEditNoteForm] = useState({
    title: '',
    file_url: '',
    description: '',
    subject_id: '',
    university_id: '',
    year: '',
    chair_name: '',
    profesor: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleEditNote = (note: any) => {
    setEditingNote(note);
    setEditNoteForm({
      title: note.title || '',
      file_url: note.file_url || '',
      description: note.content || '',
      subject_id: String(note.subject_id || ''),
      university_id: String(note.university_id || ''),
      year: String(note.year || ''),
      chair_name: note.chair_name || '',
      profesor: note.professor || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editNoteForm.title,
          content: editNoteForm.description,
          file_url: editNoteForm.file_url,
          year: editNoteForm.year,
          chair_name: editNoteForm.chair_name,
          professor: editNoteForm.profesor,
          subject_id: editNoteForm.subject_id,
          university_id: editNoteForm.university_id,
        })
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingNote(null);
        queryClient.invalidateQueries({ queryKey: ['notes'] });
      } else {
        const data = await res.json();
        alert(data.error || 'Error al actualizar el apunte');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que querés eliminar este apunte?')) return;
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['notes'] });
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const fetchNoteDetails = async (noteId: number) => {
    try {
      const cRes = await fetch(`/api/comments/note/${noteId}`);
      if (cRes.ok) {
        const cData = await cRes.json();
        setComments(cData);
      }
      if (user) {
        const sRes = await fetch(`/api/saved-for-later/check?resource_type=note&resource_id=${noteId}`);
        if (sRes.ok) {
          const sData = await sRes.json();
          setIsSaved(sData.saved);
        }
      }
    } catch (err) {
      console.error('Error fetching note details:', err);
    }
  };

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

  const { data: chairs = [] } = useQuery({
    queryKey: ['chairs'],
    queryFn: async () => {
      const res = await fetch('/api/chairs');
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
      setNewNote({ title: '', file_url: '', description: '', subject_id: '', university_id: '', year: '', chair_name: '', profesor: '' });
      setLocalFile(null);
      setUploadMethod('drive');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (err: any) => {
      setSubmitError(err.message || 'Error desconocido');
    }
  });

  // Drag & Drop Handlers for local notes files
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setLocalFile(file);
      setSubmitError('');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocalFile(file);
      setSubmitError('');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    let finalFileUrl = newNote.file_url;

    if (uploadMethod === 'file') {
      if (!localFile) {
        setSubmitError('Por favor, seleccioná un archivo para subir.');
        return;
      }
      setIsUploadingFile(true);
      try {
        const formData = new FormData();
        formData.append('file', localFile);
        const uploadRes = await fetch('/api/notes/upload-file', {
          method: 'POST',
          headers: {
            ...(user ? { 'X-User-Id': String(user.id) } : {}),
          },
          body: formData,
        });
        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json();
          throw new Error(uploadData.error || 'Error al subir el archivo');
        }
        const { fileUrl } = await uploadRes.json();
        finalFileUrl = fileUrl;
      } catch (err: any) {
        setIsUploadingFile(false);
        setSubmitError(err.message || 'Error de red al subir el archivo.');
        return;
      }
      setIsUploadingFile(false);
    } else {
      // Validate Google Drive URL
      if (!isGoogleDriveUrl(finalFileUrl)) {
        setSubmitError('Por favor, pegá un link válido de Google Drive (docs.google.com o drive.google.com)');
        return;
      }
    }

    uploadNoteMutation.mutate({
      title: newNote.title,
      file_url: finalFileUrl,
      description: newNote.description,
      subject_id: newNote.subject_id,
      university_id: newNote.university_id || null,
      year: newNote.year || null,
      chair_name: newNote.chair_name || null,
      profesor: newNote.profesor || null,
    });
  };

  const openPreview = async (note: any) => {
    setPreviewNote(note);
    setVoteState({
      vote: note.user_vote || 0,
      likes: note.likes_count || 0,
      dislikes: note.dislikes_count || 0
    });
    setComments([]);
    setIsSaved(false);
    setPreviewLoading(true);

    fetchNoteDetails(note.id);

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

  const handleVote = async (voteVal: number) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notes/${previewNote.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id)
        },
        body: JSON.stringify({ vote: voteVal }),
      });
      if (res.ok) {
        const data = await res.json();
        setVoteState({
          vote: data.user_vote,
          likes: data.likes_count,
          dislikes: data.dislikes_count
        });
        queryClient.invalidateQueries({ queryKey: ['notes'] });
      }
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const handleToggleSave = async () => {
    if (!user) return;
    try {
      if (isSaved) {
        const res = await fetch(`/api/saved-for-later?resource_type=note&resource_id=${previewNote.id}`, {
          method: 'DELETE',
          headers: { 'X-User-Id': String(user.id) }
        });
        if (res.ok) {
          setIsSaved(false);
          queryClient.invalidateQueries({ queryKey: ['notes'] });
        }
      } else {
        const res = await fetch('/api/saved-for-later', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': String(user.id)
          },
          body: JSON.stringify({ resource_type: 'note', resource_id: previewNote.id }),
        });
        if (res.ok) {
          setIsSaved(true);
          queryClient.invalidateQueries({ queryKey: ['notes'] });
        }
      }
    } catch (err) {
      console.error('Error saving:', err);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/comments/note/${previewNote.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id)
        },
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        setNewComment('');
        fetchNoteDetails(previewNote.id);
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateComment = async (commentId: number) => {
    if (!editCommentContent.trim()) return;
    setIsSavingComment(true);
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user?.id)
        },
        body: JSON.stringify({ content: editCommentContent.trim() }),
      });
      if (res.ok) {
        setEditingCommentId(null);
        setEditCommentContent('');
        if (previewNote) fetchNoteDetails(previewNote.id);
      }
    } catch (err) {
      console.error('Error updating comment:', err);
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('¿Estás seguro de que querés eliminar este comentario?')) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': String(user?.id)
        }
      });
      if (res.ok) {
        if (previewNote) fetchNoteDetails(previewNote.id);
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
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
            onClick={() => {
              setUploadMethod('drive');
              setLocalFile(null);
              setSubmitError('');
              setIsModalOpen(true);
            }}
            className="bg-white text-emerald-700 px-6 py-4 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" /> Subir Apunte
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex bg-white items-center gap-0 w-full border border-stone-200 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 overflow-hidden transition-all">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por materia, título o autor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-transparent border-none focus:outline-none focus:ring-0 text-base"
            />
          </div>
          <div className="w-px h-6 bg-stone-200 hidden sm:block"></div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              "px-5 py-4 transition-colors flex items-center gap-2 text-sm font-medium shrink-0",
              showFilters || filterUniversityId || filterYear || filterSubjectId
                ? "bg-emerald-50 text-emerald-600"
                : "hover:bg-stone-50 text-stone-600"
            )}
          >
            <Filter className="w-5 h-5" />
            <span className="hidden sm:inline">Filtros</span>
            {(filterUniversityId || filterYear || filterSubjectId) && (
              <span className="w-2 h-2 bg-emerald-600 rounded-full" />
            )}
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
          const hasPreview = !!note.file_url;

          return (
            <div
              key={note.id}
              onClick={() => { if (note.file_url) openPreview(note); }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 group flex flex-col h-full relative cursor-pointer"
            >
              {/* View count badge */}
              <div className="absolute top-4 right-4 bg-stone-100 text-stone-600 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-inner">
                <Eye className="w-3.5 h-3.5 text-stone-400" /> {note.views}
              </div>

              {/* Bookmark button on card */}
              {user && (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      if (note.is_saved) {
                        await fetch(`/api/saved-for-later?resource_type=note&resource_id=${note.id}`, {
                          method: 'DELETE',
                          headers: { 'X-User-Id': String(user.id) }
                        });
                      } else {
                        await fetch('/api/saved-for-later', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-User-Id': String(user.id)
                          },
                          body: JSON.stringify({ resource_type: 'note', resource_id: note.id }),
                        });
                      }
                      queryClient.invalidateQueries({ queryKey: ['notes'] });
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className={clsx(
                    "absolute top-4 right-16 p-1.5 rounded-lg border transition-all cursor-pointer shadow-sm hover:scale-105 z-10",
                    note.is_saved 
                      ? "bg-amber-500 text-white border-amber-500" 
                      : "bg-white text-stone-400 hover:text-stone-600 border-stone-200"
                  )}
                  title={note.is_saved ? "Quitar de mis lecturas" : "Guardar para después"}
                >
                  <Bookmark className={clsx("w-3.5 h-3.5", note.is_saved && "fill-current")} />
                </button>
              )}

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

              {/* Cátedra / Profesor badge */}
              {(note.chair_name || note.professor) && (
                <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-3">
                  <GraduationCap className="w-3 h-3 text-stone-400" />
                  {note.chair_name && <span>Cátedra {note.chair_name}</span>}
                  {note.professor && <span className="text-stone-400">· Prof. {note.professor}</span>}
                </div>
              )}

              {/* Description or content preview */}
              <p className="text-stone-500 text-sm flex-1 line-clamp-3 mb-6 leading-relaxed" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                {note.content || 'Apunte compartido vía Google Drive.'}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-5 border-t border-stone-100 min-w-0">
                <div className="flex items-center gap-2 text-sm text-stone-600 min-w-0 mr-2">
                  <div className="bg-stone-100 p-1.5 rounded-full shrink-0">
                    <User className="w-3.5 h-3.5 text-stone-500" />
                  </div>
                  <span className="font-medium truncate">{note.author_name}</span>
                  <UserRoleBadge role={note.author_role} className="scale-[0.8] origin-left shrink-0" />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {user && (user.id === note.author_id || user.tier === 'super_admin' || user.tier === 'admin') && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditNote(note);
                        }}
                        className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                        title="Editar apunte"
                      >
                        <PencilLine className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="Eliminar apunte"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Preview button — always available */}
                  {hasPreview && (
                    <button
                      onClick={() => openPreview(note)}
                      className="text-emerald-600 hover:text-emerald-800 font-bold text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-all"
                    >
                      <Eye className="w-4 h-4" /> Ver
                    </button>
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
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

              <form onSubmit={handleUploadSubmit} className="flex flex-col overflow-hidden min-h-0">
                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
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
                  <input
                    id="note-year"
                    type="text"
                    value={newNote.year}
                    onChange={(e) => setNewNote({ ...newNote, year: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    placeholder="Ej. 2025 o 2° año"
                  />
                </div>

                {/* Cátedra */}
                <div className="space-y-1.5">
                  <label htmlFor="note-chair" className="block text-sm font-bold text-stone-700">
                    Cátedra <span className="text-stone-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    id="note-chair"
                    type="text"
                    value={newNote.chair_name}
                    onChange={(e) => setNewNote({ ...newNote, chair_name: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    placeholder="Ej. Cátedra Alterini"
                  />
                </div>

                {/* Profesor */}
                <div className="space-y-1.5">
                  <label htmlFor="note-profesor" className="block text-sm font-bold text-stone-700">
                    Profesor <span className="text-stone-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    id="note-profesor"
                    type="text"
                    value={newNote.profesor}
                    onChange={(e) => setNewNote({ ...newNote, profesor: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    placeholder="Ej. Dr. Pérez"
                  />
                </div>

                {/* Métodos de Carga (Tabs) */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-stone-700">Método de carga del contenido</label>
                  <div className="flex bg-stone-100 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => { setUploadMethod('drive'); setSubmitError(''); }}
                      className={clsx(
                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
                        uploadMethod === 'drive' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                      )}
                    >
                      🔗 Link de Google Drive
                    </button>
                    <button
                      type="button"
                      onClick={() => { setUploadMethod('file'); setSubmitError(''); }}
                      className={clsx(
                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
                        uploadMethod === 'file' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                      )}
                    >
                      📁 Subir Archivo
                    </button>
                  </div>
                </div>

                {/* Google Drive Link */}
                {uploadMethod === 'drive' && (
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
                        required={uploadMethod === 'drive'}
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
                )}

                {/* File Upload Tab */}
                {uploadMethod === 'file' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-stone-700">Subir Archivo Local</label>
                    <input
                      type="file"
                      id="note-file-upload"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                    />
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={clsx(
                        "border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center transition-all cursor-pointer",
                        isDragOver ? "border-emerald-500 bg-emerald-50/20" : "border-stone-200 hover:border-emerald-400 hover:bg-stone-50/55"
                      )}
                    >
                      <FileUp className={clsx("w-8 h-8 mb-2 transition-colors", isDragOver ? "text-emerald-600" : "text-stone-450")} />
                      <p className="text-sm font-bold text-stone-700">
                        {isDragOver ? "¡Soltalo acá!" : "Arrastrá tu archivo acá o hace clic para buscar"}
                      </p>
                      <p className="text-xs text-stone-400 mt-1 leading-normal">
                        PDF, Word, PowerPoint, Excel, TXT o imágenes
                      </p>
                    </div>
                    {localFile && (
                      <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                        <div className="flex items-center gap-2 text-stone-750 min-w-0 flex-1">
                          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-sm font-medium truncate">{localFile.name}</span>
                          <span className="text-xs text-stone-450 shrink-0">({(localFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLocalFile(null)}
                          className="text-stone-400 hover:text-rose-600 p-1 transition-colors cursor-pointer shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

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

                </div>

                {/* Actions */}
                <div className="p-6 border-t border-stone-100 bg-stone-50/50 flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 text-stone-600 font-bold hover:bg-stone-100 rounded-xl transition-colors font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploadNoteMutation.isPending || isUploadingFile}
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    {uploadNoteMutation.isPending || isUploadingFile ? 'Subiendo...' : (
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

      {/* ===== EDIT MODAL ===== */}
      <AnimatePresence>
        {isEditModalOpen && editingNote && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50"
              onClick={() => setIsEditModalOpen(false)}
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
                    <PencilLine className="w-5 h-5 text-emerald-600" />
                  </div>
                  Editar Apunte
                </h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateNote} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
                {/* Title */}
                <div className="space-y-1.5">
                  <label htmlFor="edit-note-title" className="block text-sm font-bold text-stone-700">Título del Apunte</label>
                  <input
                    id="edit-note-title"
                    type="text"
                    required
                    value={editNoteForm.title}
                    onChange={(e) => setEditNoteForm({ ...editNoteForm, title: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    placeholder="Ej. Resumen Primer Parcial"
                  />
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label htmlFor="edit-note-subject" className="block text-sm font-bold text-stone-700">Materia</label>
                  <select
                    id="edit-note-subject"
                    required
                    value={editNoteForm.subject_id}
                    onChange={(e) => setEditNoteForm({ ...editNoteForm, subject_id: e.target.value })}
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
                  <label htmlFor="edit-note-university" className="block text-sm font-bold text-stone-700">
                    Universidad <span className="text-stone-400 font-normal">(opcional)</span>
                  </label>
                  <select
                    id="edit-note-university"
                    value={editNoteForm.university_id}
                    onChange={(e) => setEditNoteForm({ ...editNoteForm, university_id: e.target.value })}
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
                  <label htmlFor="edit-note-year" className="block text-sm font-bold text-stone-700">
                    Año <span className="text-stone-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    id="edit-note-year"
                    type="text"
                    value={editNoteForm.year}
                    onChange={(e) => setEditNoteForm({ ...editNoteForm, year: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    placeholder="Ej. 2025 o 2° año"
                  />
                </div>

                {/* Cátedra */}
                <div className="space-y-1.5">
                  <label htmlFor="edit-note-chair" className="block text-sm font-bold text-stone-700">
                    Cátedra <span className="text-stone-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    id="edit-note-chair"
                    type="text"
                    value={editNoteForm.chair_name}
                    onChange={(e) => setEditNoteForm({ ...editNoteForm, chair_name: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    placeholder="Ej. Cátedra Alterini"
                  />
                </div>

                {/* Profesor */}
                <div className="space-y-1.5">
                  <label htmlFor="edit-note-profesor" className="block text-sm font-bold text-stone-700">
                    Profesor <span className="text-stone-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    id="edit-note-profesor"
                    type="text"
                    value={editNoteForm.profesor}
                    onChange={(e) => setEditNoteForm({ ...editNoteForm, profesor: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    placeholder="Ej. Dr. Pérez"
                  />
                </div>

                {/* Google Drive Link */}
                <div className="space-y-1.5">
                  <label htmlFor="edit-note-url" className="block text-sm font-bold text-stone-700">
                    Link de Google Drive
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      id="edit-note-url"
                      type="url"
                      required
                      value={editNoteForm.file_url}
                      onChange={(e) => setEditNoteForm({ ...editNoteForm, file_url: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                      placeholder="https://docs.google.com/document/d/..."
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label htmlFor="edit-note-desc" className="block text-sm font-bold text-stone-700">
                    Descripción breve <span className="text-stone-400 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    id="edit-note-desc"
                    rows={2}
                    value={editNoteForm.description}
                    onChange={(e) => setEditNoteForm({ ...editNoteForm, description: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none"
                    placeholder="Ej. Resumen de los primeros 5 temas con cuadros sinópticos..."
                  ></textarea>
                </div>

                {/* Actions */}
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-4 py-3 text-stone-600 font-bold hover:bg-stone-100 rounded-xl transition-colors text-center cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
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
                  <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
                    {previewNote.subject_name} · {previewNote.author_name}
                    <UserRoleBadge role={previewNote.author_role} className="scale-[0.8] origin-left" />
                  </p>
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

              {/* Main Content Area: Split layout */}
              <div className="flex-1 flex flex-row overflow-hidden">
                {/* Left Side: Iframe */}
                <div className="flex-1 relative bg-stone-100 h-full border-r border-stone-150">
                  {previewLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/80">
                      <div className="w-10 h-10 border-4 border-emerald-250 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
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
                      <p className="text-sm">Este archivo o enlace no admite previsualización directa. Podés abrirlo o descargarlo:</p>
                      <a href={previewNote.file_url} target="_blank" rel="noopener noreferrer" className="mt-3 text-emerald-600 underline flex items-center gap-1 font-bold">
                        <ExternalLink className="w-4 h-4" /> Abrir o descargar archivo
                      </a>
                    </div>
                  )}
                </div>

                {/* Right Side: Details, Ratings & Comments */}
                <div className="w-80 flex flex-col h-full bg-stone-50 shrink-0">
                  {/* Actions & Rating */}
                  <div className="p-4 bg-white border-b border-stone-200 space-y-4 shrink-0">
                    {/* Like / Dislike */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Valoración</span>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={!user}
                          onClick={() => handleVote(1)}
                          className={clsx(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all",
                            !user ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                            voteState.vote === 1 
                              ? "bg-emerald-500 text-white shadow-sm font-bold" 
                              : "bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                          )}
                        >
                          <ThumbsUp className="w-4 h-4" /> {voteState.likes}
                        </button>

                        <button
                          disabled={!user}
                          onClick={() => handleVote(-1)}
                          className={clsx(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all",
                            !user ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                            voteState.vote === -1 
                              ? "bg-rose-500 text-white shadow-sm font-bold" 
                              : "bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                          )}
                        >
                          <ThumbsDown className="w-4 h-4" /> {voteState.dislikes}
                        </button>
                      </div>
                    </div>

                    {/* Bookmark / Guardar para después */}
                    <button
                      disabled={!user}
                      onClick={handleToggleSave}
                      className={clsx(
                        "w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-bold border transition-all",
                        !user ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                        isSaved 
                          ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-sm" 
                          : "bg-white hover:bg-stone-50 text-stone-700 border-stone-300"
                      )}
                    >
                      <Bookmark className={clsx("w-4 h-4", isSaved && "fill-current")} />
                      {isSaved ? "Guardado en mis lecturas" : "Guardar para después"}
                    </button>
                  </div>

                  {/* Comments list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Comentarios ({comments.length})</h3>
                    {comments.map((c: any) => (
                      <div key={c.id} className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-stone-500">
                          <span className="font-bold text-stone-700">{c.author_name}</span>
                          <div className="flex items-center gap-1.5">
                            <UserRoleBadge role={c.author_role} className="scale-[0.7] origin-right" />
                            {user && (user.id === c.user_id || user.tier === 'super_admin' || user.tier === 'admin') && editingCommentId !== c.id && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingCommentId(c.id);
                                    setEditCommentContent(c.content);
                                  }}
                                  className="text-stone-400 hover:text-emerald-600 transition-colors p-0.5 cursor-pointer"
                                  title="Editar"
                                >
                                  <PencilLine className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="text-stone-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {editingCommentId === c.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editCommentContent}
                              onChange={(e) => setEditCommentContent(e.target.value)}
                              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white resize-none"
                              rows={2}
                            />
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => handleUpdateComment(c.id)}
                                disabled={!editCommentContent.trim() || isSavingComment}
                                className="bg-emerald-600 text-white px-2 py-1 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {isSavingComment ? '...' : 'Guardar'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditCommentContent('');
                                }}
                                className="bg-stone-100 text-stone-600 px-2 py-1 rounded-lg text-xs font-bold hover:bg-stone-200 transition-colors cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-stone-600 leading-relaxed font-sans">{c.content}</p>
                        )}
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <div className="text-center py-8 text-stone-400 text-xs">
                        No hay comentarios todavía. ¡Sé el primero en comentar!
                      </div>
                    )}
                  </div>

                  {/* Comment Input */}
                  <div className="p-4 bg-white border-t border-stone-200 shrink-0">
                    {user ? (
                      <form onSubmit={handleSendComment} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Escribir un comentario..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                        <button
                          type="submit"
                          disabled={submittingComment || !newComment.trim()}
                          className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </form>
                    ) : (
                      <p className="text-xs text-stone-400 text-center">Debes iniciar sesión para votar o comentar.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
