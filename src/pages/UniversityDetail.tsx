import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { GraduationCap, BookOpen, MapPin, ExternalLink, School, ArrowLeft, MessageSquare, User, Send, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} hs`;
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`;
  return date.toLocaleDateString('es-AR');
}

export function UniversityDetail() {
  const { uniId } = useParams();
  const { user } = useAuth();
  const [university, setUniversity] = useState<any>(null);
  const [studyPlan, setStudyPlan] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Comments
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (!uniId) return;
    
    setIsLoading(true);
    Promise.all([
      fetch(`/api/universities/${uniId}`).then(res => res.json()),
      fetch(`/api/universities/${uniId}/study-plan`).then(res => res.json())
    ]).then(([uniData, planData]) => {
      setUniversity(uniData);
      setStudyPlan(planData);
      setIsLoading(false);
    }).catch(err => {
      console.error('Error fetching university details:', err);
      setIsLoading(false);
    });
  }, [uniId]);

  // Load comments
  useEffect(() => {
    if (!uniId) return;
    setCommentsLoading(true);
    fetch(`/api/comments/university/${uniId}`)
      .then(res => res.json())
      .then(data => {
        setComments(data);
        setCommentsLoading(false);
      })
      .catch(() => setCommentsLoading(false));
  }, [uniId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !uniId || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/comments/university/${uniId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id),
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => [{
          id: data.id,
          content: newComment.trim(),
          author_name: data.author_name,
          author_role: data.author_role,
          created_at: new Date().toISOString(),
        }, ...prev]);
        setNewComment('');
      }
    } catch (e) {
      console.error('Error posting comment:', e);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!university) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-stone-800">Universidad no encontrada</h2>
        <Link to="/universities" className="mt-4 text-sky-600 font-bold hover:underline flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Volver al listado
        </Link>
      </div>
    );
  }

  // Group study plan by year
  const groupedPlan = studyPlan.reduce((acc: any, item: any) => {
    const year = item.year || 0;
    if (!acc[year]) acc[year] = [];
    acc[year].push(item);
    return acc;
  }, {});

  const years = Object.keys(groupedPlan).sort((a, b) => Number(a) - Number(b));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      <Link to="/universities" className="inline-flex items-center gap-2 text-stone-500 hover:text-sky-600 font-bold transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a Universidades
      </Link>

      {/* University Header */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 flex flex-col md:flex-row gap-8 items-start">
        <div className="bg-sky-100 p-6 rounded-2xl text-sky-600">
          <School className="w-12 h-12" />
        </div>
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
             <span className={clsx(
                "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                university.type === 'Pública' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-indigo-50 text-indigo-700 border border-indigo-100"
              )}>
                {university.type}
              </span>
              <div className="flex items-center gap-1.5 text-stone-500 text-xs font-bold uppercase">
                <MapPin className="w-3.5 h-3.5" />
                {university.city}, {university.province}
              </div>
          </div>
          <h1 className="text-4xl font-bold text-stone-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {university.name}
          </h1>
          <p className="text-lg text-stone-500 max-w-3xl" style={{ fontFamily: "'Lora', serif" }}>
            {university.description}
          </p>
          {university.program_url && (
            <a 
              href={university.program_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-sm font-bold hover:bg-stone-200 transition-all"
            >
              <ExternalLink className="w-4 h-4" /> Programa Oficial
            </a>
          )}
        </div>
      </div>

      {/* Study Plan Section */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-stone-100">
          <div className="bg-sky-100 p-3 rounded-2xl">
            <BookOpen className="w-8 h-8 text-sky-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Plan de Estudios Interactivo
            </h2>
            <p className="text-stone-500 text-sm">Navegá las materias y accedé a los apuntes específicos de esta facultad.</p>
          </div>
        </div>

        {years.length > 0 ? (
          <div className="space-y-12">
            {years.map((year) => (
              <div key={year} className="space-y-6">
                <h3 className="text-xl font-bold text-stone-800 flex items-center gap-3">
                  <span className="bg-stone-900 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm">{year}°</span>
                  Año de la Carrera
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedPlan[year].map((item: any) => (
                    <Link
                      key={item.id}
                      to={`/subjects/${item.subject_id}?university_id=${university.id}`}
                      className="group border border-stone-100 bg-stone-50/50 rounded-2xl p-5 hover:bg-white hover:border-sky-200 hover:shadow-md transition-all flex items-start gap-4"
                    >
                      <div className="bg-white p-2.5 rounded-xl border border-stone-100 group-hover:border-sky-100 text-stone-400 group-hover:text-sky-600 transition-colors">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-800 group-hover:text-sky-900 transition-colors leading-tight mb-1">
                          {item.subject_name}
                        </h4>
                        <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">
                          {item.semester ? `${item.semester}° Cuatrimestre` : item.category || 'Materia'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-stone-50 rounded-3xl border border-stone-200 border-dashed">
            <GraduationCap className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-stone-700 mb-2">Plan no disponible digitalmente</h3>
            <p className="text-stone-500 max-w-sm mx-auto">No tenemos cargada la grilla interactiva para esta facultad todavía.</p>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-stone-100">
          <div className="bg-amber-100 p-3 rounded-2xl">
            <MessageSquare className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Comentarios y Opiniones
            </h2>
            <p className="text-stone-500 text-sm">Compartí tu experiencia sobre materias, cátedras y profesores de esta facultad.</p>
          </div>
        </div>

        {/* Comment Form */}
        {user ? (
          <form onSubmit={handleSubmitComment} className="mb-8">
            <div className="flex gap-3">
              <div className="bg-stone-100 w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1">
                <User className="w-5 h-5 text-stone-500" />
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Compartí tu experiencia, opinión sobre una cátedra o profesor..."
                  rows={3}
                  className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none transition-all"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    className="bg-amber-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                  >
                    <Send className="w-4 h-4" />
                    {submittingComment ? 'Enviando...' : 'Comentar'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="text-center py-6 mb-6 bg-stone-50 rounded-xl border border-stone-200 border-dashed">
            <p className="text-stone-500 text-sm">Iniciá sesión para dejar un comentario.</p>
          </div>
        )}

        {/* Comments List */}
        {commentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-3">
                <div className="bg-stone-100 w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-stone-500" />
                </div>
                <div className="flex-1 bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-stone-900 text-sm">{comment.author_name}</span>
                    <span className="text-[10px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded">{comment.author_role}</span>
                    <span className="text-xs text-stone-400">• {timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-stone-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sé el primero en dejar un comentario sobre esta universidad.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
