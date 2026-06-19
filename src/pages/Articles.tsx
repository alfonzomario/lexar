import { useState, useEffect } from 'react';
import { UserRoleBadge } from '../components/UserRoleBadge';
import { Link } from 'react-router';
import { Newspaper, PenTool, MessageSquare, AlertCircle, Search, Tag, X, Loader2, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';

export function Articles() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'news' | 'articles' | 'submit'>('news');
  const [news, setNews] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [newsSearch, setNewsSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [newsLoading, setNewsLoading] = useState(false);

  // Submit article state
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitContent, setSubmitContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Redesign states
  const [uploadMethod, setUploadMethod] = useState<'text' | 'pdf' | 'drive'>('text');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [driveUrl, setDriveUrl] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  // Comments states
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<number, any[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<number, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<number, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<number, boolean>>({});

  const canPublish = user && (user.tier === 'basic' || user.tier === 'pro' || user.tier === 'admin' || user.tier === 'super_admin');

  const fetchNews = (q = '', tag = '') => {
    setNewsLoading(true);
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (tag) params.append('tag', tag);
    fetch(`/api/news?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setNews(data);
        setNewsLoading(false);
      })
      .catch(() => setNewsLoading(false));
  };

  useEffect(() => {
    fetchNews();
    fetch('/api/articles').then(res => res.json()).then(setArticles);
  }, []);

  const handleNewsSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNews(newsSearch, activeTag);
  };

  const handleTagClick = (tag: string) => {
    if (activeTag === tag) {
      setActiveTag('');
      fetchNews(newsSearch, '');
    } else {
      setActiveTag(tag);
      fetchNews(newsSearch, tag);
    }
  };

  // Extract all unique tags from news
  const allTags = [...new Set(news.flatMap((item: any) => 
    item.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) || []
  ))];

  const handleSubmitArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canPublish) return;
    if (!acceptTerms) {
      setSubmitError('Debés aceptar las bases y condiciones de publicación.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);
    try {
      const formData = new FormData();
      formData.append('title', submitTitle);

      if (uploadMethod === 'text') {
        formData.append('content', submitContent);
      } else if (uploadMethod === 'pdf') {
        if (!pdfFile) {
          setSubmitError('Seleccioná un archivo PDF.');
          setSubmitting(false);
          return;
        }
        formData.append('pdf', pdfFile);
      } else if (uploadMethod === 'drive') {
        if (!driveUrl || !/(?:docs|drive|sheets)\.google\.com/.test(driveUrl)) {
          setSubmitError('Por favor, ingresá un enlace de Google Drive válido.');
          setSubmitting(false);
          return;
        }
        formData.append('driveUrl', driveUrl);
      }

      const res = await fetch('/api/articles', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setSubmitSuccess(true);
        setSubmitTitle('');
        setSubmitContent('');
        setPdfFile(null);
        setDriveUrl('');
        setAcceptTerms(false);
        // Refresh articles
        fetch('/api/articles').then(res => res.json()).then(setArticles);
      } else {
        const data = await res.json();
        setSubmitError(data.error || 'Error al enviar artículo');
      }
    } catch (err) {
      setSubmitError('Error de red al enviar artículo');
    } finally {
      setSubmitting(false);
    }
  };

  // Comments Handlers
  const toggleComments = async (articleId: number) => {
    const isExpanded = !expandedComments[articleId];
    setExpandedComments(prev => ({ ...prev, [articleId]: isExpanded }));
    
    if (isExpanded) {
      setCommentsLoading(prev => ({ ...prev, [articleId]: true }));
      try {
        const res = await fetch(`/api/comments/article/${articleId}`);
        const data = await res.json();
        setCommentsMap(prev => ({ ...prev, [articleId]: data }));
      } catch (err) {
        console.error('Error fetching comments:', err);
      } finally {
        setCommentsLoading(prev => ({ ...prev, [articleId]: false }));
      }
    }
  };

  const handleAddComment = async (articleId: number) => {
    const text = newCommentText[articleId] || '';
    if (!text.trim() || !user) return;
    
    setSubmittingComment(prev => ({ ...prev, [articleId]: true }));
    try {
      const res = await fetch(`/api/comments/article/${articleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: text })
      });
      if (res.ok) {
        const newComment = await res.json();
        setCommentsMap(prev => ({
          ...prev,
          [articleId]: [
            {
              id: newComment.id,
              user_id: user.id,
              content: text.trim(),
              created_at: new Date().toISOString(),
              author_name: newComment.author_name,
              author_role: newComment.author_role
            },
            ...(prev[articleId] || [])
          ]
        }));
        setNewCommentText(prev => ({ ...prev, [articleId]: '' }));
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmittingComment(prev => ({ ...prev, [articleId]: false }));
    }
  };

  const handleDeleteComment = async (articleId: number, commentId: number) => {
    if (!window.confirm('¿Estás seguro de que querés eliminar este comentario?')) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCommentsMap(prev => ({
          ...prev,
          [articleId]: (prev[articleId] || []).filter(c => c.id !== commentId)
        }));
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };


  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setPdfFile(file);
        setSubmitError('');
      } else {
        setSubmitError('Solo se permiten archivos estrictamente en formato PDF (.pdf)');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setPdfFile(file);
        setSubmitError('');
      } else {
        setSubmitError('Solo se permiten archivos estrictamente en formato PDF (.pdf)');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <div className="text-center space-y-4">
        <div className="bg-amber-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Newspaper className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
          Artículos y Noticias
        </h1>
        <p className="text-lg text-stone-500 max-w-2xl mx-auto">
          Mantenete actualizado con las últimas novedades jurídicas y leé artículos de la comunidad.
        </p>
      </div>

      <div className="flex justify-center">
        <div className="bg-stone-200 p-1 rounded-xl inline-flex">
          <button
            onClick={() => setActiveTab('news')}
            className={clsx(
              'px-6 py-2.5 rounded-lg font-medium text-sm transition-all',
              activeTab === 'news' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            Noticias
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={clsx(
              'px-6 py-2.5 rounded-lg font-medium text-sm transition-all',
              activeTab === 'articles' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            Artículos de la Comunidad
          </button>
          <button
            onClick={() => setActiveTab('submit')}
            className={clsx(
              'px-6 py-2.5 rounded-lg font-medium text-sm transition-all',
              activeTab === 'submit' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            Enviá tu artículo
          </button>
        </div>
      </div>

      {activeTab === 'news' && (
        <div className="space-y-6">
          {/* Search bar */}
          <form onSubmit={handleNewsSearch} className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar noticias..."
                value={newsSearch}
                onChange={(e) => setNewsSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors shrink-0"
            >
              Buscar
            </button>
          </form>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider self-center mr-1">
                <Tag className="w-3.5 h-3.5 inline" /> Etiquetas:
              </span>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={clsx(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all border",
                    activeTag === tag
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                  )}
                >
                  {tag}
                  {activeTag === tag && <X className="w-3 h-3 inline ml-1" />}
                </button>
              ))}
            </div>
          )}

          {newsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {news.map((item: any) => (
                <a
                  key={item.id}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 hover:border-amber-300 hover:shadow-md transition-all flex flex-col"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-600 mb-3">
                    <span className="bg-amber-50 px-2 py-1 rounded-md">{item.source}</span>
                    <span className="text-stone-400">{new Date(item.date).toLocaleDateString('es-AR')}</span>
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 mb-2">{item.title}</h3>
                  <p className="text-stone-500 text-sm mb-4 flex-1">{item.summary}</p>
                  {/* Tags */}
                  {item.tags && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {item.tags.split(',').map((tag: string, idx: number) => (
                        <span key={idx} className="bg-stone-100 text-stone-600 text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="text-sm font-medium text-amber-600 mt-auto">Leer en fuente original &rarr;</span>
                </a>
              ))}
              {news.length === 0 && (
                <div className="col-span-full text-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-200 border-dashed">
                  <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No se encontraron noticias{newsSearch ? ` para "${newsSearch}"` : ''}.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'articles' && (
        <div className="space-y-6">
          {articles.length === 0 ? (
            <div className="text-center py-12 text-stone-500 bg-white rounded-3xl border border-stone-200 border-dashed">
              <PenTool className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Todavía no hay artículos publicados.</p>
              <button onClick={() => setActiveTab('submit')} className="text-amber-600 font-medium mt-2">¡Sé el primero en publicar!</button>
            </div>
          ) : (
            articles.map((article: any) => (
              <div key={article.id} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-stone-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-stone-100 w-10 h-10 rounded-full flex items-center justify-center font-bold text-stone-500">
                    {article.author_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 flex items-center gap-2">
                      {article.author_name}
                      <UserRoleBadge role={article.author_role} />
                    </p>
                    <p className="text-xs text-stone-500">{new Date(article.date).toLocaleDateString('es-AR')}</p>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-stone-900 mb-4">{article.title}</h3>
                <div className="prose prose-stone max-w-none mb-6">
                  {article.content}
                </div>
                <div className="border-t border-stone-100 pt-4 flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => toggleComments(article.id)}
                      className={clsx(
                        "flex items-center gap-2 text-sm font-medium transition-colors",
                        expandedComments[article.id] ? "text-amber-650" : "text-stone-500 hover:text-amber-600"
                      )}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Comentar {(commentsMap[article.id] || []).length > 0 ? `(${(commentsMap[article.id] || []).length})` : ''}
                    </button>
                  </div>

                  {expandedComments[article.id] && (
                    <div className="space-y-4 pt-4 border-t border-stone-100">
                      {/* Form to add comment */}
                      {user ? (
                        <div className="flex gap-3">
                          <div className="bg-amber-105 w-8 h-8 rounded-full flex items-center justify-center font-bold text-amber-700 text-xs shrink-0">
                            {user.name?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1 space-y-2">
                            <textarea
                              rows={2}
                              value={newCommentText[article.id] || ''}
                              onChange={(e) => setNewCommentText(prev => ({ ...prev, [article.id]: e.target.value }))}
                              placeholder="Escribí un comentario..."
                              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all resize-none"
                            />
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleAddComment(article.id)}
                                disabled={submittingComment[article.id] || !(newCommentText[article.id] || '').trim()}
                                className="bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                              >
                                {submittingComment[article.id] ? 'Enviando...' : 'Comentar'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-stone-500 italic">Iniciá sesión para dejar un comentario.</p>
                      )}

                      {/* Comments list */}
                      {commentsLoading[article.id] ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                        </div>
                      ) : (commentsMap[article.id] || []).length === 0 ? (
                        <p className="text-xs text-stone-400 text-center py-2">No hay comentarios aún. ¡Sé el primero en comentar!</p>
                      ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                          {(commentsMap[article.id] || []).map((comment: any) => (
                            <div key={comment.id} className="bg-stone-50 p-3 rounded-2xl border border-stone-100 text-sm flex gap-3 group relative">
                              <div className="bg-stone-200 w-7 h-7 rounded-full flex items-center justify-center font-semibold text-stone-600 text-xs shrink-0">
                                {comment.author_name?.charAt(0) || 'U'}
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-stone-850 text-xs">{comment.author_name}</span>
                                  <UserRoleBadge role={comment.author_role} />
                                  <span className="text-[10px] text-stone-400">{new Date(comment.created_at).toLocaleDateString('es-AR')}</span>
                                </div>
                                <p className="text-stone-600 text-xs leading-relaxed whitespace-pre-line">{comment.content}</p>
                              </div>
                              
                              {/* Delete button (only for author or super admin) */}
                              {(user && (user.id === comment.user_id || user.tier === 'super_admin')) && (
                                <button
                                  onClick={() => handleDeleteComment(article.id, comment.id)}
                                  className="text-stone-400 hover:text-rose-600 transition-colors p-1 self-start opacity-0 group-hover:opacity-100 focus:opacity-100"
                                  title="Eliminar comentario"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'submit' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-stone-200">
          {!user ? (
            <div className="text-center py-8">
              <p className="text-stone-600 mb-4">Iniciá sesión para publicar artículos.</p>
              <Link to="/pricing" className="text-indigo-600 font-medium hover:underline">Ver planes</Link>
            </div>
          ) : !canPublish ? (
            <div className="text-center py-8">
              <h2 className="text-xl font-bold text-stone-900 mb-2">Publicar artículos es Basic</h2>
              <p className="text-stone-600 mb-6">Para enviar artículos a la comunidad necesitás el plan Basic o superior.</p>
              <Link to="/pricing" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors">Ver planes Basic</Link>
            </div>
          ) : (
          <>
            <h2 className="text-2xl font-bold text-stone-900 mb-6">Publicá tu artículo</h2>
            
            {submitSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl mb-6 text-sm font-medium">
                ¡Artículo enviado con éxito! Será revisado por un administrador antes de su publicación.
              </div>
            )}
            {submitError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl mb-6 text-sm font-medium">
                {submitError}
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleSubmitArticle}>
              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">Título del artículo</label>
                <input 
                  type="text" 
                  value={submitTitle}
                  onChange={(e) => setSubmitTitle(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-sm" 
                  placeholder="Ej: Análisis del fallo..." 
                  required 
                />
              </div>

              {/* Upload method selector */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-stone-900">Método de carga del contenido</label>
                <div className="flex bg-stone-100 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setUploadMethod('text')}
                    className={clsx(
                      "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                      uploadMethod === 'text' ? "bg-white text-stone-950 shadow-sm" : "text-stone-500 hover:text-stone-700"
                    )}
                  >
                    Escribir texto
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMethod('pdf')}
                    className={clsx(
                      "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                      uploadMethod === 'pdf' ? "bg-white text-stone-950 shadow-sm" : "text-stone-500 hover:text-stone-700"
                    )}
                  >
                    Subir PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMethod('drive')}
                    className={clsx(
                      "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                      uploadMethod === 'drive' ? "bg-white text-stone-950 shadow-sm" : "text-stone-500 hover:text-stone-700"
                    )}
                  >
                    Importar desde Google Drive
                  </button>
                </div>
              </div>

              {/* Text method content */}
              {uploadMethod === 'text' && (
                <div>
                  <label className="block text-sm font-semibold text-stone-900 mb-2">Contenido</label>
                  <textarea 
                    rows={10} 
                    value={submitContent}
                    onChange={(e) => setSubmitContent(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-sm resize-none" 
                    placeholder="Escribí tu artículo acá..." 
                    required={uploadMethod === 'text'}
                  />
                </div>
              )}

              {/* PDF method content */}
              {uploadMethod === 'pdf' && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-stone-900">Archivo de documento (.pdf)</label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={clsx(
                      "border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer",
                      isDragOver ? "border-amber-500 bg-amber-50/20" : "border-stone-200 hover:border-stone-300"
                    )}
                  >
                    <input
                      type="file"
                      id="pdf-upload"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
                      <Tag className="w-10 h-10 text-stone-400 mb-3" />
                      <p className="text-sm font-semibold text-stone-700">Arrastrá tu archivo PDF aquí o hace clic para buscar</p>
                      <p className="text-xs text-stone-400 mt-1">Soporta estrictamente archivos con formato .pdf</p>
                    </label>
                  </div>
                  {pdfFile && (
                    <div className="flex items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="flex items-center gap-2 text-stone-750">
                        <Newspaper className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium truncate max-w-xs">{pdfFile.name}</span>
                        <span className="text-xs text-stone-400">({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPdfFile(null)}
                        className="text-stone-400 hover:text-rose-600 p-1 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Google Drive method content */}
              {uploadMethod === 'drive' && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-stone-900 mb-2">
                    Enlace del documento en Google Drive
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="Ej: https://docs.google.com/document/d/.../edit"
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-sm"
                  />
                  <p className="text-xs text-stone-400 leading-relaxed mt-1">
                    Asegúrate de que el documento de Google Drive esté configurado con acceso de lectura pública ("Cualquier persona con el enlace puede ver"). El servidor importará el contenido de texto directamente.
                  </p>
                </div>
              )}

              {/* Bases y condiciones legal alert */}
              <div className="space-y-3 border-t border-stone-150 pt-6">
                <div className="bg-rose-50 border border-rose-150 text-rose-800 p-4 rounded-xl flex gap-3 items-start shadow-sm">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-850 leading-relaxed font-semibold">
                    Es obligatorio leer las bases y condiciones en su totalidad. Su incumplimiento implicará el rechazo in limine del artículo.
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsTermsModalOpen(true)}
                    className="text-indigo-600 font-bold hover:underline text-sm flex items-center gap-1 cursor-pointer"
                  >
                    Ver bases y condiciones para la admisión y publicación
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="terms-admission" 
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500 cursor-pointer" 
                  />
                  <label htmlFor="terms-admission" className="text-xs font-semibold text-stone-600 cursor-pointer">
                    He leído y acepto las bases y condiciones de publicación.
                  </label>
                </div>
              </div>

              {/* Submit button */}
              <button 
                type="submit" 
                disabled={submitting || !acceptTerms || !submitTitle.trim() || (uploadMethod === 'text' && !submitContent.trim()) || (uploadMethod === 'pdf' && !pdfFile) || (uploadMethod === 'drive' && !driveUrl.trim())}
                className="w-full bg-amber-600 text-white font-bold py-4 rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer text-sm shadow-md shadow-amber-600/10"
              >
                {submitting ? 'Enviando...' : 'Enviar para revisión'}
              </button>

              {/* Footnote discretion clarification */}
              <p className="text-[10px] text-stone-400 text-center leading-relaxed mt-4">
                La aprobación y posterior publicación de los artículos subidos queda sujeta completamente a la discrecionalidad del equipo de desarrolladores de la plataforma.
              </p>
            </form>

            {/* Bases y Condiciones Modal */}
            {isTermsModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
                <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 max-h-[80vh] overflow-y-auto shadow-2xl border border-stone-200">
                  <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-6">
                    <h3 className="text-xl font-bold text-stone-900 font-sans">
                      Bases y Condiciones de Publicación
                    </h3>
                    <button
                      onClick={() => setIsTermsModalOpen(false)}
                      className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-50 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-6 text-sm text-stone-600 leading-relaxed font-sans pr-2">
                    <p className="font-semibold text-stone-800">
                      A continuación se establecen las bases y condiciones para la admisión y posterior publicación de artículos de doctrina, opinión jurídica y análisis de fallos en LexARG.
                    </p>
                    
                    <div className="space-y-2">
                      <h4 className="font-bold text-stone-900 text-base">1. Requisitos de Originalidad</h4>
                      <p>Todos los artículos enviados deben ser de autoría exclusiva del usuario que realiza la postulación. Está estrictamente prohibido el plagio, copia parcial o reproducción sin autorización de contenidos preexistentes.</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-stone-900 text-base">2. Rigor Científico y Académico</h4>
                      <p>El contenido debe poseer un nivel técnico-académico apropiado para la divulgación en la comunidad jurídica. Las opiniones expresadas deben estar fundamentadas en doctrina, jurisprudencia o normas de derecho vigente en la República Argentina.</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-stone-900 text-base">3. Proceso de Revisión y Moderación</h4>
                      <p>El equipo editorial de LexARG se reserva el derecho de rechazar de forma discrecional o sugerir modificaciones en los artículos que no cumplan con el perfil técnico de la plataforma. El incumplimiento de las presentes bases dará lugar al rechazo inmediato in limine del artículo.</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-stone-900 text-base">4. Licencia y Distribución</h4>
                      <p>Al enviar un artículo, el autor concede a LexARG una licencia gratuita, no exclusiva y de alcance nacional para reproducir, distribuir y comunicar públicamente el texto en la plataforma con fines educativos y de consulta comunitaria.</p>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-stone-100 flex justify-end">
                    <button
                      onClick={() => setIsTermsModalOpen(false)}
                      className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      Entendido
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
          )}
        </div>
      )}

      <div className="text-center text-xs text-stone-400 mt-12">
        Contenido con fines educativos e informativos. No constituye asesoramiento legal.
      </div>
    </motion.div>
  );
}
