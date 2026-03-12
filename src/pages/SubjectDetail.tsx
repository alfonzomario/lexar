import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router';
import {
  BookOpen, Scale, FileText, Layers, ArrowRight, BookMarked, FileQuestion,
  Plus, X, Sparkles, Pencil, Trash2, Check, XCircle, ExternalLink, ThumbsUp, Bookmark, School
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { BalanzaLoader } from '../components/BalanzaLoader';
import { useAuth } from '../contexts/AuthContext';

/** Convierte un link de Google Drive compartido en URL de preview para iframe */
function getDrivePreviewUrl(shareUrl: string): string | null {
  if (!shareUrl || typeof shareUrl !== 'string') return null;
  const u = shareUrl.trim();
  const match = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return `https://drive.google.com/file/d/${match[1]}/preview`;
}

export function SubjectDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const universityId = searchParams.get('university_id');
  const { user, isSuperAdmin, isPro, isBasic } = useAuth();
  const isBasicOrAbove = user && ['basic', 'pro', 'admin', 'super_admin'].includes(user.tier);
  const [savedForLaterIds, setSavedForLaterIds] = useState<Set<string>>(new Set());
  const [documentQuota, setDocumentQuota] = useState<{ used: number; limit: number } | null>(null);
  const [subject, setSubject] = useState<any>(null);
  const [briefs, setBriefs] = useState<any[]>([]);
  const [bibliography, setBibliography] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('bibliografia');
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingFlash, setLoadingFlash] = useState(false);
  const [examModal, setExamModal] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examDesc, setExamDesc] = useState('');
  const [examUrl, setExamUrl] = useState('');
  const [examYear, setExamYear] = useState<string>('');
  const [examUniversityId, setExamUniversityId] = useState<string>(universityId || '');
  const [submittingExam, setSubmittingExam] = useState(false);
  const [generatingFlash, setGeneratingFlash] = useState(false);
  const [editingCard, setEditingCard] = useState<number | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [noteModal, setNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteFileUrl, setNoteFileUrl] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [noteYear, setNoteYear] = useState<string>('');
  const [noteUniversityId, setNoteUniversityId] = useState<string>(universityId || '');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [universities, setUniversities] = useState<{ id: number; name: string }[]>([]);
  const [previewModal, setPreviewModal] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: '', title: '' });
  const [addFlashcardModal, setAddFlashcardModal] = useState(false);
  const [flashcardFront, setFlashcardFront] = useState('');
  const [flashcardBack, setFlashcardBack] = useState('');
  const [submittingFlashcard, setSubmittingFlashcard] = useState(false);
  const [privateNoteEditing, setPrivateNoteEditing] = useState<string | null>(null);
  const [privateNotes, setPrivateNotes] = useState<Record<string, string>>({});

  const headers = () => (user ? { 'X-User-Id': String(user.id) } : {});

  const openPrivateNoteEditor = (resourceType: string, resourceId: number) => {
    if (!user || !isBasicOrAbove) return;
    const key = `${resourceType}-${resourceId}`;
    fetch(`/api/user-notes/${resourceType}/${resourceId}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setPrivateNotes((prev) => ({ ...prev, [key]: (data && data.content) || '' }));
        setPrivateNoteEditing(key);
      })
      .catch(() => setPrivateNoteEditing(key));
  };

  const savePrivateNote = (resourceType: string, resourceId: number, content: string) => {
    if (!user || !isBasicOrAbove) return;
    fetch(`/api/user-notes/${resourceType}/${resourceId}`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }).then(() => {
      setPrivateNotes((prev) => ({ ...prev, [`${resourceType}-${resourceId}`]: content }));
      setPrivateNoteEditing(null);
    });
  };

  const openPreview = (fileUrl: string, title: string) => {
    const previewUrl = getDrivePreviewUrl(fileUrl);
    if (previewUrl) setPreviewModal({ open: true, url: previewUrl, title });
    else window.open(fileUrl, '_blank');
  };

  const downloadNoteAsPdf = (noteId: number) => {
    fetch(`/api/notes/${noteId}/export`, { headers: headers() })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('No autorizado')))
      .then(({ title, content }) => {
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`
          <!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
          <style>body{font-family:system-ui;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6;}</style></head>
          <body><h1>${title}</h1><div>${(content || '').replace(/\n/g, '<br>')}</div></body></html>
        `);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); }, 300);
      })
      .catch(() => alert('No podés descargar este apunte. Solo plan Pro puede descargar en PDF.'));
  };

  const recordView = (type: 'note' | 'exam', resourceId: number) => {
    fetch(`/api/${type === 'note' ? 'notes' : 'exams'}/${resourceId}/view`, { method: 'POST', headers: headers() }).catch(() => {});
  };

  useEffect(() => {
    if (!user || (activeTab !== 'apuntes' && activeTab !== 'exams')) return;
    if (!isPro && !isSuperAdmin) fetch('/api/me/document-quota', { headers: headers() }).then((r) => r.json()).then(setDocumentQuota).catch(() => setDocumentQuota(null));
    else setDocumentQuota(null);
  }, [user, isPro, isSuperAdmin, activeTab]);

  useEffect(() => {
    if (!user || !isBasicOrAbove) return;
    fetch('/api/saved-for-later', { headers: headers() })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { resource_type: string; resource_id: number }[]) => {
        setSavedForLaterIds(new Set(list.map((x) => `${x.resource_type}-${x.resource_id}`)));
      })
      .catch(() => {});
  }, [user?.id, isBasicOrAbove]);

  const toggleSavedForLater = (resourceType: 'note' | 'exam', resourceId: number) => {
    if (!user) return;
    const key = `${resourceType}-${resourceId}`;
    const isSaved = savedForLaterIds.has(key);
    if (isSaved) {
      fetch(`/api/saved-for-later?resource_type=${resourceType}&resource_id=${resourceId}`, { method: 'DELETE', headers: headers() }).then(() => {
        setSavedForLaterIds((s) => { const n = new Set(s); n.delete(key); return n; });
      });
    } else {
      fetch('/api/saved-for-later', { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ resource_type: resourceType, resource_id: resourceId }) }).then(() => {
        setSavedForLaterIds((s) => new Set(s).add(key));
      });
    }
  };

  const openDocumentByQuota = async (type: 'note' | 'exam', resourceId: number, title: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/${type === 'note' ? 'notes' : 'exams'}/${resourceId}/view-url`, { headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'No se pudo abrir el documento');
        if (res.status === 403) fetch('/api/me/document-quota', { headers: headers() }).then((r) => r.json()).then(setDocumentQuota);
        return;
      }
      const url = data.url;
      const previewUrl = getDrivePreviewUrl(url);
      if (previewUrl) setPreviewModal({ open: true, url: previewUrl, title });
      else window.open(url, '_blank');
      if (documentQuota && documentQuota.limit > 0) setDocumentQuota({ ...documentQuota, used: documentQuota.used + 1 });
    } catch (e) {
      alert('Error al abrir');
    }
  };

  const handleVoteNote = async (noteId: number) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notes/${noteId}/vote`, { method: 'POST', headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'No se pudo registrar el voto');
        return;
      }
      setNotes((prev) => prev.map((n: any) => n.id === noteId ? { ...n, vote_count: (n.vote_count ?? 0) + (data.already_voted ? 0 : 1), user_voted: 1 } : n));
    } catch (e) {
      alert('Error al votar');
    }
  };

  const handleVoteExam = async (examId: number) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/exams/${examId}/vote`, { method: 'POST', headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'No se pudo registrar el voto');
        return;
      }
      setExams((prev) => prev.map((ex: any) => ex.id === examId ? { ...ex, vote_count: (ex.vote_count ?? 0) + (data.already_voted ? 0 : 1), user_voted: 1 } : ex));
    } catch (e) {
      alert('Error al votar');
    }
  };

  useEffect(() => {
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data) => setSubject(data.find((s: any) => s.id === Number(id))));

    fetch('/api/briefs')
      .then((res) => res.json())
      .then((data) => {
        const sid = Number(id);
        setBriefs(data.filter((b: any) => {
          const ids = b.subject_ids ? String(b.subject_ids).split(',').map((n: string) => Number(n.trim())) : [];
          return ids.includes(sid);
        }));
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/subjects/${id}/bibliography`).then((r) => r.json()).then(setBibliography);
  }, [id]);

  useEffect(() => {
    fetch('/api/universities').then((r) => r.json()).then((data) => setUniversities(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    if (!id || activeTab !== 'apuntes') return;
    const url = `/api/subjects/${id}/notes${universityId ? `?university_id=${universityId}` : ''}`;
    fetch(url, { headers: headers() }).then((r) => r.json()).then(setNotes);
  }, [id, activeTab, user, universityId]);

  useEffect(() => {
    if (!id || activeTab !== 'exams') return;
    setLoadingExams(true);
    const url = `/api/subjects/${id}/exams${universityId ? `?university_id=${universityId}` : ''}`;
    fetch(url, { headers: headers() })
      .then((r) => r.json())
      .then((data) => { setExams(data); setLoadingExams(false); })
      .catch(() => setLoadingExams(false));
  }, [id, activeTab, user, universityId]);

  useEffect(() => {
    if (!id || activeTab !== 'flashcards') return;
    setLoadingFlash(true);
    fetch(`/api/subjects/${id}/flashcards`)
      .then((r) => r.json())
      .then((data) => { setFlashcards(data); setLoadingFlash(false); })
      .catch(() => setLoadingFlash(false));
  }, [id, activeTab]);

  const refetchExams = () => {
    if (!id) return;
    const url = `/api/subjects/${id}/exams${universityId ? `?university_id=${universityId}` : ''}`;
    fetch(url, { headers: headers() }).then((r) => r.json()).then(setExams);
  };

  const refetchFlashcards = () => {
    if (!id) return;
    fetch(`/api/subjects/${id}/flashcards`).then((r) => r.json()).then(setFlashcards);
  };

  const refetchNotes = () => {
    if (!id) return;
    const url = `/api/subjects/${id}/notes${universityId ? `?university_id=${universityId}` : ''}`;
    fetch(url, { headers: headers() }).then((r) => r.json()).then(setNotes);
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !noteTitle.trim() || !noteFileUrl.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({
          title: noteTitle.trim(),
          file_url: noteFileUrl.trim(),
          description: noteDescription.trim() || null,
          subject_id: id,
          year: noteYear.trim() ? parseInt(noteYear, 10) : null,
          university_id: noteUniversityId.trim() ? parseInt(noteUniversityId, 10) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setNoteModal(false);
      setNoteTitle('');
      setNoteFileUrl('');
      setNoteDescription('');
      setNoteYear('');
      setNoteUniversityId('');
      refetchNotes();
      if (data.status === 'published') {
        alert('Apunte publicado.');
      } else {
        alert('Apunte enviado. Será visible cuando un administrador lo apruebe.');
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleApproveNote = async (noteId: number) => {
    if (!user) return;
    try {
      await fetch(`/api/notes/${noteId}/approve`, { method: 'PATCH', headers: headers() });
      refetchNotes();
    } catch (e) {
      alert('Error al aprobar');
    }
  };

  const handleRejectNote = async (noteId: number) => {
    if (!user) return;
    try {
      await fetch(`/api/notes/${noteId}/reject`, { method: 'PATCH', headers: headers() });
      refetchNotes();
    } catch (e) {
      alert('Error al rechazar');
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!user || !window.confirm('¿Eliminar este apunte?')) return;
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE', headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'No se pudo eliminar. ¿Sos super admin?');
        return;
      }
      setNotes((prev) => prev.filter((n: any) => n.id !== noteId));
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  const handleDeleteExam = async (examId: number) => {
    if (!user || !window.confirm('¿Eliminar este examen?')) return;
    try {
      const res = await fetch(`/api/exams/${examId}`, { method: 'DELETE', headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'No se pudo eliminar. ¿Sos super admin?');
        return;
      }
      setExams((prev) => prev.filter((ex: any) => ex.id !== examId));
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  const handleSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !examTitle.trim() || !examUrl.trim()) return;
    setSubmittingExam(true);
    try {
      const res = await fetch(`/api/subjects/${id}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({
          title: examTitle.trim(),
          description: examDesc.trim() || null,
          file_url: examUrl.trim(),
          year: examYear.trim() ? parseInt(examYear, 10) : null,
          university_id: examUniversityId.trim() ? parseInt(examUniversityId, 10) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setExamModal(false);
      setExamTitle('');
      setExamDesc('');
      setExamUrl('');
      setExamYear('');
      setExamUniversityId('');
      refetchExams();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmittingExam(false);
    }
  };

  const handleApproveExam = async (examId: number) => {
    if (!user) return;
    try {
      await fetch(`/api/exams/${examId}/approve`, { method: 'PATCH', headers: headers() });
      refetchExams();
    } catch (e) {
      alert('Error al aprobar');
    }
  };

  const handleRejectExam = async (examId: number) => {
    if (!user) return;
    try {
      await fetch(`/api/exams/${examId}/reject`, { method: 'PATCH', headers: headers() });
      refetchExams();
    } catch (e) {
      alert('Error al rechazar');
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!user || !id) return;
    setGeneratingFlash(true);
    try {
      const res = await fetch(`/api/subjects/${id}/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ count: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      refetchFlashcards();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setGeneratingFlash(false);
    }
  };

  const handleUpdateFlashcard = async (cardId: number) => {
    if (!user) return;
    try {
      await fetch(`/api/flashcards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ front: editFront, back: editBack }),
      });
      setEditingCard(null);
      refetchFlashcards();
    } catch (e) {
      alert('Error al guardar');
    }
  };

  const handleDeleteFlashcard = async (cardId: number) => {
    if (!user || !window.confirm('¿Eliminar esta flashcard?')) return;
    try {
      const res = await fetch(`/api/flashcards/${cardId}`, { method: 'DELETE', headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'No se pudo eliminar. ¿Sos super admin?');
        return;
      }
      setFlashcards((prev) => prev.filter((c: any) => c.id !== cardId));
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  const handleAddFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !flashcardFront.trim() || !flashcardBack.trim()) return;
    setSubmittingFlashcard(true);
    try {
      const res = await fetch(`/api/subjects/${id}/flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ front: flashcardFront.trim(), back: flashcardBack.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setAddFlashcardModal(false);
      setFlashcardFront('');
      setFlashcardBack('');
      refetchFlashcards();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmittingFlashcard(false);
    }
  };

  if (!subject) return (
    <div className="flex h-[60vh] items-center justify-center">
      <BalanzaLoader size="lg" text="Cargando Materia..." />
    </div>
  );

  const tabs = [
    { id: 'bibliografia', name: 'Bibliografía', icon: BookMarked },
    { id: 'briefs', name: 'Fallos', icon: Scale },
    { id: 'apuntes', name: 'Apuntes', icon: FileText },
    { id: 'exams', name: 'Exámenes', icon: FileQuestion },
    { id: 'flashcards', name: 'Flashcards', icon: Layers },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 flex items-center gap-6">
        <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center shrink-0">
          {subject.icon === 'Scale' ? (
            <Scale className="w-8 h-8 text-indigo-600" />
          ) : (
            <BookOpen className="w-8 h-8 text-indigo-600" />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">{subject.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-stone-500">{subject.description}</p>
            {universityId && (
              <span className="bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-100 uppercase tracking-wider whitespace-nowrap">
                Filtro: {universities.find((un) => un.id === Number(universityId))?.name || 'Universidad'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-stone-200 overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === 'bibliografia' && (
          <div className="space-y-4">
            {bibliography.length === 0 ? (
              <div className="text-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-100 border-dashed">
                <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay bibliografía cargada para esta materia.</p>
              </div>
            ) : (
              <ul className="grid gap-4">
                {bibliography.map((b: any) => (
                  <li key={b.id} className="bg-white p-5 rounded-2xl border border-stone-100 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-stone-900">{b.title}</p>
                      <p className="text-sm text-stone-500">{b.author} {b.type && ` · ${b.type}`}</p>
                    </div>
                    {b.link && (
                      <a href={b.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-sm font-medium flex items-center gap-1">
                        Ver <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'briefs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {briefs.length === 0 ? (
              <div className="col-span-full text-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-100 border-dashed">
                <Scale className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay fallos en esta materia.</p>
              </div>
            ) : (
              briefs.map((brief) => (
                <Link
                  key={brief.id}
                  to={`/briefs/${brief.id}`}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 hover:border-indigo-200 hover:shadow-md transition-all group flex flex-col h-full"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">Fallo</span>
                    {brief.is_demo && <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Demo</span>}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 leading-tight">{brief.title}</h3>
                  <p className="text-stone-500 text-sm flex-1 line-clamp-3">{brief.facts}</p>
                  <div className="mt-4 flex items-center text-sm font-medium text-indigo-600 group-hover:text-indigo-700">
                    Leer resumen <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === 'apuntes' && (
          <div className="space-y-4">
            {!isPro && !isSuperAdmin && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex flex-wrap items-center justify-between gap-2">
                {isBasic ? (
                  <>
                    <span>Tenés {documentQuota ? `${documentQuota.used} de ${documentQuota.limit}` : '—'} vistas de documentos este mes (límite Basic).</span>
                    <Link to="/pricing" className="font-medium text-amber-700 hover:text-amber-900 underline">Pro = ilimitado</Link>
                  </>
                ) : (
                  <>
                    <span>Los documentos requieren plan Basic (10/mes) o Pro (ilimitado).</span>
                    <Link to="/pricing" className="font-medium text-amber-700 hover:text-amber-900 underline">Ver planes</Link>
                  </>
                )}
              </div>
            )}
            {user && (
              <div className="flex flex-col items-end gap-1">
                {!isPro && !isSuperAdmin && (
                  <p className="text-xs text-stone-500 text-right max-w-md">Si un administrador lo aprueba, las vistas y votaciones que reciba sumarán para que subas de tier (500 → Basic, 1000 → Pro).</p>
                )}
                <button
                  onClick={() => setNoteModal(true)}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" /> Subir apunte
                </button>
              </div>
            )}
            {notes.length === 0 ? (
              <div className="text-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-100 border-dashed">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay apuntes publicados para esta materia.</p>
                {user && <p className="text-sm mt-2">Podés subir uno con el botón &quot;Subir apunte&quot; (un admin lo revisará y, si lo aprueba, las vistas sumarán para tu tier).</p>}
              </div>
            ) : (() => {
                const groupedNotes = notes.reduce((acc: any, n: any) => {
                  const uni = n.university_name || 'General / Otras';
                  if (!acc[uni]) acc[uni] = [];
                  acc[uni].push(n);
                  return acc;
                }, {});

                return (
                  <div className="space-y-8">
                    {Object.entries(groupedNotes).map(([uni, uniNotes]: [string, any]) => (
                      <div key={uni} className="space-y-4">
                        <h3 className="text-lg font-bold text-stone-700 flex items-center gap-2 px-1">
                          <School className="w-5 h-5 text-stone-400" />
                          {uni}
                        </h3>
                        <ul className="grid gap-4">
                          {uniNotes.map((n: any) => (
                            <li key={n.id} className="bg-white p-5 rounded-2xl border border-stone-100 flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-stone-900">{n.title}</p>
                                <p className="text-sm text-stone-500">{n.author_name}{n.year ? ` · ${n.year}` : ''} · {(n.views ?? 0)} vistas · {(n.vote_count ?? 0)} votaciones</p>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {n.status === 'published' && (
                                  <button onClick={() => handleVoteNote(n.id)} className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition', n.user_voted ? 'bg-indigo-100 text-indigo-700' : 'bg-stone-100 text-stone-600 hover:bg-indigo-50 hover:text-indigo-600')} title="Me resultó útil">
                                    <ThumbsUp className="w-4 h-4" /> Me resultó útil
                                  </button>
                                )}
                                {isBasicOrAbove && n.status === 'published' && (
                                  <button onClick={() => toggleSavedForLater('note', n.id)} className={clsx('p-2 rounded-lg transition-colors', savedForLaterIds.has(`note-${n.id}`) ? 'text-indigo-600 bg-indigo-50' : 'text-stone-400 hover:bg-stone-100 hover:text-indigo-600')} title={savedForLaterIds.has(`note-${n.id}`) ? 'Quitar de Para leer después' : 'Guardar para leer después'}>
                                    <Bookmark className={clsx('w-4 h-4', savedForLaterIds.has(`note-${n.id}`) && 'fill-current')} />
                                  </button>
                                )}
                                {n.file_url && (n.status === 'published' || isSuperAdmin) && (
                                  <button onClick={() => { recordView('note', n.id); openPreview(n.file_url, n.title); }} className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:underline">
                                    Ver documento <ExternalLink className="w-4 h-4" />
                                  </button>
                                )}
                                {(isPro || isSuperAdmin) && n.status === 'published' && (
                                  <button onClick={() => downloadNoteAsPdf(n.id)} className="text-stone-600 text-sm font-medium flex items-center gap-1 hover:underline">
                                    Descargar PDF
                                  </button>
                                )}
                                {n.has_document && (n.status === 'published' || isSuperAdmin) && !isPro && !isSuperAdmin && (documentQuota === null || documentQuota.used < documentQuota.limit) && (
                                  <button onClick={() => openDocumentByQuota('note', n.id, n.title)} className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:underline">
                                    Ver documento <ExternalLink className="w-4 h-4" />
                                  </button>
                                )}
                                {n.has_document && (n.status === 'published' || isSuperAdmin) && !isPro && !isSuperAdmin && documentQuota !== null && documentQuota.used >= documentQuota.limit && (
                                  <Link to="/pricing" className="text-amber-600 text-sm font-medium flex items-center gap-1 hover:underline">Límite del mes usado. Ver planes para más</Link>
                                )}
                                {isSuperAdmin && (
                                  <>
                                    {n.status === 'pending' && (
                                      <>
                                        <button onClick={() => handleApproveNote(n.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Aprobar"><Check className="w-5 h-5" /></button>
                                        <button onClick={() => handleRejectNote(n.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Rechazar"><XCircle className="w-5 h-5" /></button>
                                      </>
                                    )}
                                    <button onClick={() => handleDeleteNote(n.id)} className="p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 rounded-lg" title="Eliminar"><Trash2 className="w-5 h-5" /></button>
                                  </>
                                )}
                                {isSuperAdmin && n.status === 'pending' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Pendiente</span>}
                                {n.status === 'published' && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Publicado</span>}
                                {n.status === 'rejected' && <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded">Rechazado</span>}
                              </div>
                              {isBasicOrAbove && n.status === 'published' && (
                                <div className="w-full mt-3 pt-3 border-t border-stone-100">
                                  {privateNoteEditing === `note-${n.id}` ? (
                                    <div className="flex gap-2">
                                      <textarea
                                        value={privateNotes[`note-${n.id}`] ?? ''}
                                        onChange={(e) => setPrivateNotes((prev) => ({ ...prev, [`note-${n.id}`]: e.target.value }))}
                                        onBlur={(e) => { const v = e.target.value.trim(); savePrivateNote('note', n.id, v); setPrivateNoteEditing(null); }}
                                        placeholder="Tu nota privada..."
                                        className="flex-1 text-sm border border-stone-200 rounded-lg px-3 py-2 resize-none"
                                        rows={2}
                                        autoFocus
                                      />
                                      <button type="button" onClick={() => setPrivateNoteEditing(null)} className="text-stone-500 text-sm">Cerrar</button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => openPrivateNoteEditor('note', n.id)} className="text-xs text-stone-500 hover:text-indigo-600 flex items-center gap-1">
                                      <Pencil className="w-3 h-3" />
                                      {privateNotes[`note-${n.id}`] ? `Mi nota: ${privateNotes[`note-${n.id}`].slice(0, 50)}${privateNotes[`note-${n.id}`].length > 50 ? '…' : ''}` : 'Agregar mi nota'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                );
              })()}
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="space-y-4">
            {!isPro && !isSuperAdmin && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex flex-wrap items-center justify-between gap-2">
                {isBasic ? (
                  <>
                    <span>Tenés {documentQuota ? `${documentQuota.used} de ${documentQuota.limit}` : '—'} vistas de documentos este mes (límite Basic).</span>
                    <Link to="/pricing" className="font-medium text-amber-700 hover:text-amber-900 underline">Pro = ilimitado</Link>
                  </>
                ) : (
                  <>
                    <span>Tenés {documentQuota ? `${documentQuota.used} de ${documentQuota.limit}` : '1'} vista de documento este mes para probar. Con Basic son 10/mes, con Pro ilimitado y podés subir los tuyos.</span>
                    <Link to="/pricing" className="font-medium text-amber-700 hover:text-amber-900 underline">Ver planes</Link>
                  </>
                )}
              </div>
            )}
            {user && (
              <div className="flex flex-col items-end gap-1">
                {!isPro && !isSuperAdmin && (
                  <p className="text-xs text-stone-500 text-right max-w-md">Si un administrador lo aprueba, las vistas y votaciones que reciba sumarán para que subas de tier (500 → Basic, 1000 → Pro).</p>
                )}
                <button
                  onClick={() => setExamModal(true)}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" /> Subir examen
                </button>
              </div>
            )}
            {loadingExams ? (
              <div className="flex justify-center py-12"><BalanzaLoader size="md" text="Cargando exámenes..." /></div>
            ) : exams.length === 0 ? (
              <div className="text-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-100 border-dashed">
                <FileQuestion className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay exámenes aprobados para esta materia.</p>
                {user && <p className="text-sm mt-2">Podés subir uno con el botón &quot;Subir examen&quot; (un admin lo revisará y, si lo aprueba, las vistas sumarán para tu tier).</p>}
              </div>
            ) : (() => {
              const groupedExams = exams.reduce((acc: any, ex: any) => {
                const uni = ex.university_name || 'General / Otras';
                if (!acc[uni]) acc[uni] = [];
                acc[uni].push(ex);
                return acc;
              }, {});

              return (
                <div className="space-y-8">
                  {Object.entries(groupedExams).map(([uni, uniExams]: [string, any]) => (
                    <div key={uni} className="space-y-4">
                      <h3 className="text-lg font-bold text-stone-700 flex items-center gap-2 px-1">
                        <School className="w-5 h-5 text-stone-400" />
                        {uni}
                      </h3>
                      <ul className="space-y-3">
                        {uniExams.map((ex: any) => (
                          <li key={ex.id} className="bg-white p-5 rounded-2xl border border-stone-100 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-stone-900">{ex.title}</p>
                              {ex.description && <p className="text-sm text-stone-500">{ex.description}</p>}
                              <p className="text-xs text-stone-400">Subido por {ex.uploaded_by_name}{ex.year ? ` · ${ex.year}` : ''} · {(ex.views ?? 0)} vistas · {(ex.vote_count ?? 0)} votaciones</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {ex.status === 'approved' && (
                                <button onClick={() => handleVoteExam(ex.id)} className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition', ex.user_voted ? 'bg-indigo-100 text-indigo-700' : 'bg-stone-100 text-stone-600 hover:bg-indigo-50 hover:text-indigo-600')} title="Me resultó útil">
                                  <ThumbsUp className="w-4 h-4" /> Me resultó útil
                                </button>
                              )}
                              {isBasicOrAbove && ex.status === 'approved' && (
                                <button onClick={() => toggleSavedForLater('exam', ex.id)} className={clsx('p-2 rounded-lg transition-colors', savedForLaterIds.has(`exam-${ex.id}`) ? 'text-indigo-600 bg-indigo-50' : 'text-stone-400 hover:bg-stone-100 hover:text-indigo-600')} title={savedForLaterIds.has(`exam-${ex.id}`) ? 'Quitar de Para leer después' : 'Guardar para leer después'}>
                                  <Bookmark className={clsx('w-4 h-4', savedForLaterIds.has(`exam-${ex.id}`) && 'fill-current')} />
                                </button>
                              )}
                              {isSuperAdmin && (
                                <>
                                  {ex.status === 'pending' && (
                                    <>
                                      <button onClick={() => handleApproveExam(ex.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Aprobar"><Check className="w-5 h-5" /></button>
                                      <button onClick={() => handleRejectExam(ex.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Rechazar"><XCircle className="w-5 h-5" /></button>
                                    </>
                                  )}
                                  <button onClick={() => handleDeleteExam(ex.id)} className="p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 rounded-lg" title="Eliminar"><Trash2 className="w-5 h-5" /></button>
                                </>
                              )}
                              {ex.status === 'pending' && !isSuperAdmin && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Pendiente de aprobación</span>}
                              {ex.status === 'approved' && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Aprobado</span>}
                              {ex.file_url && (ex.status === 'approved' || isSuperAdmin) && (
                                <>
                                  <button onClick={() => { recordView('exam', ex.id); openPreview(ex.file_url, ex.title); }} className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:underline">
                                    Ver documento <ExternalLink className="w-4 h-4" />
                                  </button>
                                  {(isPro || isSuperAdmin) && (
                                    <a href={ex.file_url} target="_blank" rel="noopener noreferrer" className="text-stone-600 text-sm font-medium hover:underline">Descargar PDF</a>
                                  )}
                                </>
                              )}
                              {ex.has_document && ex.status === 'approved' && !isPro && !isSuperAdmin && (documentQuota === null || documentQuota.used < documentQuota.limit) && (
                                <button onClick={() => openDocumentByQuota('exam', ex.id, ex.title)} className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:underline">
                                  Ver documento <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                              {ex.has_document && ex.status === 'approved' && !isPro && !isSuperAdmin && documentQuota !== null && documentQuota.used >= documentQuota.limit && (
                                <Link to="/pricing" className="text-amber-600 text-sm font-medium flex items-center gap-1 hover:underline">Límite del mes usado. Ver planes para más</Link>
                              )}
                            </div>
                            {isBasicOrAbove && ex.status === 'approved' && (
                              <div className="w-full mt-3 pt-3 border-t border-stone-100">
                                {privateNoteEditing === `exam-${ex.id}` ? (
                                  <div className="flex gap-2">
                                    <textarea
                                      value={privateNotes[`exam-${ex.id}`] ?? ''}
                                      onChange={(e) => setPrivateNotes((prev) => ({ ...prev, [`exam-${ex.id}`]: e.target.value }))}
                                      onBlur={(e) => { const v = e.target.value.trim(); savePrivateNote('exam', ex.id, v); setPrivateNoteEditing(null); }}
                                      placeholder="Tu nota privada..."
                                      className="flex-1 text-sm border border-stone-200 rounded-lg px-3 py-2 resize-none"
                                      rows={2}
                                      autoFocus
                                    />
                                    <button type="button" onClick={() => setPrivateNoteEditing(null)} className="text-stone-500 text-sm">Cerrar</button>
                                  </div>
                                ) : (
                                  <button type="button" onClick={() => openPrivateNoteEditor('exam', ex.id)} className="text-xs text-stone-500 hover:text-indigo-600 flex items-center gap-1">
                                    <Pencil className="w-3 h-3" />
                                    {privateNotes[`exam-${ex.id}`] ? `Mi nota: ${privateNotes[`exam-${ex.id}`].slice(0, 50)}${privateNotes[`exam-${ex.id}`].length > 50 ? '…' : ''}` : 'Agregar mi nota'}
                                  </button>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'flashcards' && (
          <div className="space-y-4">
            {isSuperAdmin && (
              <div className="flex justify-end gap-2 flex-wrap">
                <button
                  onClick={() => setAddFlashcardModal(true)}
                  className="flex items-center gap-2 border border-indigo-600 text-indigo-600 px-4 py-2 rounded-xl font-medium hover:bg-indigo-50"
                >
                  <Plus className="w-4 h-4" /> Agregar manual
                </button>
                <button
                  onClick={handleGenerateFlashcards}
                  disabled={generatingFlash}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" /> {generatingFlash ? 'Generando...' : 'Generar con IA'}
                </button>
              </div>
            )}
            {loadingFlash ? (
              <div className="flex justify-center py-12"><BalanzaLoader size="md" text="Cargando flashcards..." /></div>
            ) : flashcards.length === 0 ? (
              <div className="text-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-100 border-dashed">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay flashcards en esta materia.</p>
                {isSuperAdmin && <p className="text-sm mt-2">Podés agregar manual o generar con IA desde los botones superiores.</p>}
              </div>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {flashcards.map((card: any) => (
                  <li key={card.id} className="bg-white p-5 rounded-2xl border border-stone-100">
                    {editingCard === card.id ? (
                      <div className="space-y-3">
                        <input value={editFront} onChange={(e) => setEditFront(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" placeholder="Frente" />
                        <input value={editBack} onChange={(e) => setEditBack(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" placeholder="Dorso" />
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdateFlashcard(card.id)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium">Guardar</button>
                          <button onClick={() => setEditingCard(null)} className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-stone-900">{card.front}</p>
                        <p className="text-sm text-stone-500 mt-1">{card.back}</p>
                        {card.source === 'ai_generated' && <span className="inline-block mt-2 text-xs text-indigo-600">IA</span>}
                        {isSuperAdmin && (
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => { setEditingCard(card.id); setEditFront(card.front); setEditBack(card.back); }} className="p-1.5 text-stone-500 hover:bg-stone-100 rounded" title="Editar"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteFlashcard(card.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {addFlashcardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !submittingFlashcard && setAddFlashcardModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-stone-900">Agregar flashcard</h2>
              <button type="button" onClick={() => !submittingFlashcard && setAddFlashcardModal(false)} className="p-2 text-stone-400 hover:text-stone-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddFlashcard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Frente (pregunta o término) *</label>
                <input type="text" value={flashcardFront} onChange={(e) => setFlashcardFront(e.target.value)} className="w-full border border-stone-200 rounded-xl px-4 py-2.5" placeholder="Ej. ¿Qué es el amparo?" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Dorso (respuesta) *</label>
                <textarea value={flashcardBack} onChange={(e) => setFlashcardBack(e.target.value)} className="w-full border border-stone-200 rounded-xl px-4 py-2.5 resize-none" rows={3} placeholder="Ej. Acción constitucional para proteger derechos." required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAddFlashcardModal(false)} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium">Cancelar</button>
                <button type="submit" disabled={submittingFlashcard || !flashcardFront.trim() || !flashcardBack.trim()} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-50">{submittingFlashcard ? 'Guardando...' : 'Agregar'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {examModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !submittingExam && setExamModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-stone-900">Subir examen</h2>
              <button type="button" onClick={() => !submittingExam && setExamModal(false)} className="p-2 text-stone-400 hover:text-stone-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitExam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Título *</label>
                <input type="text" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} className="w-full border border-stone-200 rounded-xl px-4 py-2.5" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Año</label>
                  <input type="number" min={1990} max={2030} value={examYear} onChange={(e) => setExamYear(e.target.value)} className="w-full border border-stone-200 rounded-xl px-4 py-2.5" placeholder="Ej. 2024" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Universidad</label>
                  <select value={examUniversityId} onChange={(e) => setExamUniversityId(e.target.value)} className="w-full border border-stone-200 rounded-xl px-4 py-2.5 bg-white">
                    <option value="">— Elegir —</option>
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Link de Google Drive (público) *</label>
                <input type="url" value={examUrl} onChange={(e) => setExamUrl(e.target.value)} className="w-full border border-stone-200 rounded-xl px-4 py-2.5" placeholder="https://drive.google.com/file/d/..." required />
                <p className="text-xs text-stone-500 mt-1">Compartí el archivo como “Cualquier persona con el enlace” y pegá el link acá.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Descripción (opcional)</label>
                <textarea value={examDesc} onChange={(e) => setExamDesc(e.target.value)} className="w-full border border-stone-200 rounded-xl px-4 py-2.5 resize-none" rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setExamModal(false)} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium">Cancelar</button>
                <button type="submit" disabled={submittingExam || !examTitle.trim() || !examUrl.trim()} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-50">{submittingExam ? 'Subiendo...' : 'Subir'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal preview Drive */}
      {previewModal.open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/90 p-0" onClick={() => setPreviewModal((p) => ({ ...p, open: false }))}>
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h3 className="text-white font-semibold truncate pr-4">{previewModal.title}</h3>
            <button type="button" onClick={() => setPreviewModal((p) => ({ ...p, open: false }))} className="p-2 text-white hover:bg-white/10 rounded-lg shrink-0">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 min-h-0 rounded-xl overflow-hidden bg-white" onClick={(e) => e.stopPropagation()}>
            <iframe
              title={previewModal.title}
              src={previewModal.url}
              className="w-full h-full min-h-[70vh] border-0"
              allow="autoplay"
            />
          </div>
        </div>
      )}

      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !submittingNote && setNoteModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-stone-900">Subir apunte</h2>
              <button type="button" onClick={() => !submittingNote && setNoteModal(false)} className="p-2 text-stone-400 hover:text-stone-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-stone-500 mb-4">
              Subí el documento a Google Drive, compartilo como “Cualquier persona con el enlace” y pegá el link. {isSuperAdmin ? 'Se publicará de inmediato.' : 'Un administrador lo revisará; si lo aprueba, se publica y las vistas y votaciones que reciba sumarán para que subas de tier (500 → Basic, 1000 → Pro).'}
            </p>
            <form onSubmit={handleSubmitNote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Título *</label>
                <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full border border-stone-200 rounded-xl px-4 py-2.5" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Año</label>
                  <input type="number" min={1990} max={2030} value={noteYear} onChange={(e) => setNoteYear(e.target.value)} className="w-full border border-stone-200 rounded-xl px-4 py-2.5" placeholder="Ej. 2024" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Universidad</label>
                  <select value={noteUniversityId} onChange={(e) => setNoteUniversityId(e.target.value)} className="w-full border border-stone-200 rounded-xl px-4 py-2.5 bg-white">
                    <option value="">— Elegir —</option>
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Link de Google Drive (público) *</label>
                <input type="url" value={noteFileUrl} onChange={(e) => setNoteFileUrl(e.target.value)} className="w-full border border-stone-200 rounded-xl px-4 py-2.5" placeholder="https://drive.google.com/file/d/..." required />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Descripción (opcional)</label>
                <textarea value={noteDescription} onChange={(e) => setNoteDescription(e.target.value)} className="w-full border border-stone-200 rounded-xl px-4 py-2.5 resize-none" rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setNoteModal(false)} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium">Cancelar</button>
                <button type="submit" disabled={submittingNote || !noteTitle.trim() || !noteFileUrl.trim()} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-50">{submittingNote ? 'Enviando...' : 'Enviar'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
