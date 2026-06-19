import { useState, useEffect } from 'react';
import { Film, PlayCircle, Search, Filter, Loader2, X, Send, ExternalLink, User, Calendar, MessageSquare, PencilLine, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { UserRoleBadge } from '../components/UserRoleBadge';
import { clsx } from 'clsx';

export function Movies() {
  const { user } = useAuth();
  const [movies, setMovies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);

  useEffect(() => {
    fetch('/api/movies')
      .then((res) => res.json())
      .then((data) => {
        setMovies(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchComments = async (movieId: number) => {
    try {
      const res = await fetch(`/api/comments/movie/${movieId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const handleOpenMovie = (movie: any) => {
    setSelectedMovie(movie);
    setComments([]);
    setNewComment('');
    fetchComments(movie.id);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || !selectedMovie) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/comments/movie/${selectedMovie.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id),
        },
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        setNewComment('');
        fetchComments(selectedMovie.id);
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
        if (selectedMovie) fetchComments(selectedMovie.id);
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
        if (selectedMovie) fetchComments(selectedMovie.id);
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const filteredMovies = movies.filter(
    (movie) =>
      movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (movie.director && movie.director.toLowerCase().includes(searchTerm.toLowerCase())) ||
      movie.legal_themes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Film className="w-8 h-8 text-indigo-650" />
            Cine Jurídico
          </h1>
          <p className="text-stone-555 mt-2">
            Películas y documentales recomendados para estudiantes de derecho y apasionados de los debates éticos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título, director o tema..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMovies.map((movie) => (
            <div
              key={movie.id}
              onClick={() => handleOpenMovie(movie)}
              className="bg-white rounded-2xl shadow-sm border border-stone-200 hover:border-indigo-300 hover:shadow-md transition-all duration-300 group flex flex-col h-full overflow-hidden cursor-pointer"
            >
              {/* Poster or Fallback */}
              <div className="w-full h-64 relative overflow-hidden bg-stone-100 shrink-0">
                {movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`${movie.poster_url ? 'hidden' : ''} w-full h-full flex items-center justify-center`}>
                  <Film className="w-16 h-16 text-stone-300" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <PlayCircle className="w-16 h-16 text-white drop-shadow-lg" />
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-stone-900 mb-1 group-hover:text-indigo-650 transition-colors leading-tight">{movie.title}</h3>
                {movie.director && (
                  <p className="text-xs text-stone-500 mb-1">Dirigida por: <span className="font-semibold text-stone-650">{movie.director}</span></p>
                )}
                <p className="text-[11px] text-stone-400 mb-3">{movie.year} • {movie.country}</p>
                <p className="text-stone-600 text-sm line-clamp-3 mb-4 flex-1 leading-relaxed">
                  {movie.synopsis}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {movie.legal_themes?.split(',').map((theme: string, idx: number) => (
                    <span key={idx} className="bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-100/50">
                      {theme.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {filteredMovies.length === 0 && (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-stone-200 border-dashed">
              <Film className="w-14 h-14 text-stone-300 mx-auto mb-4" />
              <p className="text-lg font-bold text-stone-700">No encontramos películas</p>
              <p className="text-sm text-stone-400 mt-1">Probá con otros términos de búsqueda.</p>
            </div>
          )}
        </div>
      )}

      {/* ===== DETAIL / COMMENTS MODAL ===== */}
      <AnimatePresence>
        {selectedMovie && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50"
              onClick={() => setSelectedMovie(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl h-[80vh] bg-white rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-stone-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {selectedMovie.title}
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {selectedMovie.year} · {selectedMovie.country} {selectedMovie.director && `· Dir: ${selectedMovie.director}`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMovie(null)}
                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Split Body */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Column: Movie Info */}
                <div className="flex-1 p-6 overflow-y-auto space-y-6 md:border-r md:border-stone-150">
                  <div className="flex gap-4 items-start">
                    {selectedMovie.poster_url && (
                      <img
                        src={selectedMovie.poster_url}
                        alt={selectedMovie.title}
                        className="w-32 h-48 object-cover rounded-xl shadow-md border border-stone-200 shrink-0"
                      />
                    )}
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Director</h3>
                        <p className="text-stone-800 text-sm font-semibold">{selectedMovie.director || 'No especificado'}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">Debates Jurídicos</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedMovie.legal_themes?.split(',').map((theme: string, idx: number) => (
                            <span key={idx} className="bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-100/50">
                              {theme.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Sinopsis Jurídica</h3>
                    <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line font-sans">
                      {selectedMovie.synopsis}
                    </p>
                  </div>

                  {selectedMovie.trailer_link && (
                    <div className="pt-2">
                      <a
                        href={selectedMovie.trailer_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all shadow-md shadow-indigo-600/10"
                      >
                        <PlayCircle className="w-5 h-5" /> Ver Tráiler en IMDb <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Right Column: Comments */}
                <div className="w-full md:w-96 flex flex-col h-full bg-stone-50 shrink-0 border-t md:border-t-0 border-stone-150">
                  <div className="p-4 border-b border-stone-150 bg-white flex items-center gap-2 shrink-0">
                    <MessageSquare className="w-4 h-4 text-stone-400" />
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Debate Comunitario ({comments.length})</span>
                  </div>

                  {/* Comment List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white resize-none"
                              rows={2}
                            />
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => handleUpdateComment(c.id)}
                                disabled={!editCommentContent.trim() || isSavingComment}
                                className="bg-indigo-650 bg-indigo-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {isSavingComment ? '...' : 'Guardar'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditCommentContent('');
                                }}
                                className="bg-stone-100 text-stone-600 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-stone-200 transition-colors cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-stone-650 leading-relaxed font-sans">{c.content}</p>
                        )}
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <div className="text-center py-12 text-stone-400 text-xs font-medium">
                        No hay discusiones sobre esta película todavía.
                        <p className="text-[10px] text-stone-400 mt-1">¡Iniciá el debate compartiendo tu análisis ético!</p>
                      </div>
                    )}
                  </div>

                  {/* Comment Input */}
                  <div className="p-4 bg-white border-t border-stone-200 shrink-0">
                    {user ? (
                      <form onSubmit={handleSendComment} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Analizar implicancias jurídicas..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                        <button
                          type="submit"
                          disabled={submittingComment || !newComment.trim()}
                          className="bg-indigo-650 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </form>
                    ) : (
                      <p className="text-xs text-stone-400 text-center">Iniciá sesión para participar en el debate.</p>
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
