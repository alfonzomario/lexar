import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Users, MessageSquare, Search, Filter, Plus, ChevronRight, Eye, Clock, User, X, ArrowLeft, Send, Loader2, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserRoleBadge } from '../components/UserRoleBadge';

const CATEGORIES = [
  { value: 'all', label: 'Todos' },
  { value: 'Derecho Constitucional', label: 'D. Constitucional' },
  { value: 'Derecho Civil', label: 'D. Civil' },
  { value: 'Derecho Penal', label: 'D. Penal' },
  { value: 'Actualidad', label: 'Actualidad' },
  { value: 'general', label: 'General' },
];

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

export function Forum() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [replyContent, setReplyContent] = useState('');

  // New topic form
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  // Edit topic state
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [editTopicTitle, setEditTopicTitle] = useState('');
  const [editTopicContent, setEditTopicContent] = useState('');
  const [editTopicCategory, setEditTopicCategory] = useState('');

  // Edit reply state
  const [editingReply, setEditingReply] = useState<any>(null);
  const [editReplyContent, setEditReplyContent] = useState('');

  const isBasicOrAbove = user && (user.tier === 'basic' || user.tier === 'pro' || user.tier === 'admin' || user.tier === 'super_admin');

  const { data, isLoading } = useQuery({
    queryKey: ['forum-topics', category, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category !== 'all') params.append('category', category);
      params.append('page', page.toString());
      params.append('limit', '10');
      const res = await fetch(`/api/forum/topics?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!isBasicOrAbove,
  });

  const topics = data?.topics || [];
  const totalPages = data?.totalPages || 1;

  // Topic detail + replies
  const { data: topicDetail } = useQuery({
    queryKey: ['forum-topic', selectedTopic?.id],
    queryFn: async () => {
      const res = await fetch(`/api/forum/topics/${selectedTopic.id}`);
      return res.json();
    },
    enabled: !!selectedTopic?.id,
  });

  const { data: replies = [], isLoading: repliesLoading, refetch: refetchReplies } = useQuery({
    queryKey: ['forum-replies', selectedTopic?.id],
    queryFn: async () => {
      const res = await fetch(`/api/forum/topics/${selectedTopic.id}/replies`);
      return res.json();
    },
    enabled: !!selectedTopic?.id,
  });

  const createTopicMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/forum/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': String(user!.id) },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-topics'] });
      setShowNewTopic(false);
      setNewTitle('');
      setNewContent('');
      setNewCategory('general');
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (data: { topicId: number; content: string }) => {
      const res = await fetch(`/api/forum/topics/${data.topicId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': String(user!.id) },
        body: JSON.stringify({ content: data.content }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error');
      }
      return res.json();
    },
    onSuccess: () => {
      refetchReplies();
      setReplyContent('');
      queryClient.invalidateQueries({ queryKey: ['forum-topics'] });
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (topicId: number) => {
      const res = await fetch(`/api/forum/topics/${topicId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': String(user!.id) },
      });
      if (!res.ok) throw new Error('No se pudo eliminar el tema');
      return res.json();
    },
    onSuccess: () => {
      setSelectedTopic(null);
      queryClient.invalidateQueries({ queryKey: ['forum-topics'] });
    },
  });

  const editTopicMutation = useMutation({
    mutationFn: async (data: { id: number; title: string; content: string; category: string }) => {
      const res = await fetch(`/api/forum/topics/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': String(user!.id) },
        body: JSON.stringify({ title: data.title, content: data.content, category: data.category }),
      });
      if (!res.ok) throw new Error('No se pudo editar el tema');
      return res.json();
    },
    onSuccess: (data, variables) => {
      setEditingTopic(null);
      setSelectedTopic((prev: any) => ({
        ...prev,
        title: variables.title,
        content: variables.content,
        category: variables.category,
      }));
      queryClient.invalidateQueries({ queryKey: ['forum-topics'] });
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId: number) => {
      const res = await fetch(`/api/forum/replies/${replyId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': String(user!.id) },
      });
      if (!res.ok) throw new Error('No se pudo eliminar la respuesta');
      return res.json();
    },
    onSuccess: () => {
      refetchReplies();
      queryClient.invalidateQueries({ queryKey: ['forum-topics'] });
    },
  });

  const editReplyMutation = useMutation({
    mutationFn: async (data: { id: number; content: string }) => {
      const res = await fetch(`/api/forum/replies/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': String(user!.id) },
        body: JSON.stringify({ content: data.content }),
      });
      if (!res.ok) throw new Error('No se pudo editar la respuesta');
      return res.json();
    },
    onSuccess: () => {
      setEditingReply(null);
      setEditReplyContent('');
      refetchReplies();
    },
  });

  const filteredTopics = topics.filter((t: any) =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.author_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto text-center py-16 px-6">
        <div className="bg-stone-100 rounded-2xl p-10">
          <Users className="w-14 h-14 text-stone-400 mx-auto mb-4" />
          <p className="text-stone-600 mb-4">Iniciá sesión y contratá el plan Basic o superior para acceder al Foro.</p>
          <Link to="/pricing" className="text-indigo-600 font-medium hover:underline">Ver planes</Link>
        </div>
      </motion.div>
    );
  }

  if (!isBasicOrAbove) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto text-center py-16 px-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10">
          <Users className="w-14 h-14 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 mb-2">Foro Basic</h2>
          <p className="text-stone-600 mb-6">El foro de discusión es exclusivo del plan Basic o superior. Actualizá tu plan para participar.</p>
          <Link to="/pricing" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors">Ver planes Basic</Link>
        </div>
      </motion.div>
    );
  }

  // Topic Detail View
  if (selectedTopic) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 max-w-4xl mx-auto"
      >
        <button
          onClick={() => setSelectedTopic(null)}
          className="flex items-center gap-2 text-stone-600 hover:text-indigo-600 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al foro
        </button>

        {/* Topic */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full">
                {selectedTopic.category || 'General'}
              </span>
              {selectedTopic.subject_name && (
                <span className="bg-stone-100 text-stone-600 text-xs font-medium px-2.5 py-1 rounded-full">
                  {selectedTopic.subject_name}
                </span>
              )}
            </div>
            {user && (user.id === selectedTopic.author_id || user.tier === 'super_admin' || user.tier === 'admin') && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingTopic(selectedTopic);
                    setEditTopicTitle(selectedTopic.title);
                    setEditTopicContent(selectedTopic.content || '');
                    setEditTopicCategory(selectedTopic.category || 'general');
                  }}
                  className="p-1.5 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                  title="Editar tema"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de que querés eliminar este tema? Se borrarán todas sus respuestas.')) {
                      deleteTopicMutation.mutate(selectedTopic.id);
                    }
                  }}
                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                  title="Eliminar tema"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-4">{selectedTopic.title}</h1>
          {selectedTopic.content && (
            <p className="text-stone-700 leading-relaxed whitespace-pre-wrap mb-6">{selectedTopic.content}</p>
          )}
          <div className="flex items-center gap-3 text-sm text-stone-500 border-t border-stone-100 pt-4">
            <div className="bg-stone-100 w-8 h-8 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-stone-500" />
            </div>
            <span className="font-medium text-stone-700">{selectedTopic.author_name}</span>
            <UserRoleBadge role={selectedTopic.author_role} />
            <span>•</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {timeAgo(selectedTopic.created_at)}</span>
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {selectedTopic.views || 0}</span>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4">
          <h2 className="font-bold text-stone-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            {replies.length} {replies.length === 1 ? 'Respuesta' : 'Respuestas'}
          </h2>
          {repliesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : (
            replies.map((reply: any) => (
              <div key={reply.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                {editingReply?.id === reply.id ? (
                  <div className="space-y-4">
                    <textarea
                      value={editReplyContent}
                      onChange={(e) => setEditReplyContent(e.target.value)}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => editReplyMutation.mutate({ id: reply.id, content: editReplyContent })}
                        disabled={!editReplyContent.trim() || editReplyMutation.isPending}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {editReplyMutation.isPending ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => setEditingReply(null)}
                        className="bg-stone-100 text-stone-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-stone-200 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-stone-800 leading-relaxed whitespace-pre-wrap mb-4">{reply.content}</p>
                    <div className="flex items-center justify-between gap-3 text-sm text-stone-500">
                      <div className="flex items-center gap-3">
                        <div className="bg-stone-100 w-7 h-7 rounded-full flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-stone-500" />
                        </div>
                        <span className="font-medium text-stone-700">{reply.author_name}</span>
                        <UserRoleBadge role={reply.author_role} className="scale-[0.8] origin-left" />
                        <span>•</span>
                        <span>{timeAgo(reply.created_at)}</span>
                      </div>
                      {user && (user.id === reply.author_id || user.tier === 'super_admin' || user.tier === 'admin') && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingReply(reply);
                              setEditReplyContent(reply.content);
                            }}
                            className="p-1 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                            title="Editar respuesta"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('¿Estás seguro de que querés eliminar esta respuesta?')) {
                                deleteReplyMutation.mutate(reply.id);
                              }
                            }}
                            className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            title="Eliminar respuesta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Reply Form */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-900 mb-3">Tu respuesta</h3>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Escribí tu respuesta…"
            rows={4}
            className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none mb-4"
          />
          <button
            onClick={() => replyMutation.mutate({ topicId: selectedTopic.id, content: replyContent })}
            disabled={!replyContent.trim() || replyMutation.isPending}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {replyMutation.isPending ? 'Enviando...' : 'Responder'}
          </button>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-indigo-600" />
            Foro de Discusión
          </h1>
          <p className="text-stone-500 mt-2">
            Conectá con otros estudiantes, profesores y profesionales del derecho.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar temas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-stone-200 rounded-xl w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowNewTopic(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Nuevo Tema
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => { setCategory(cat.value); setPage(1); }}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              category === cat.value
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Topics List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="divide-y divide-stone-200">
            {filteredTopics.map((topic: any) => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic)}
                className="w-full p-6 hover:bg-stone-50 transition-colors flex items-start gap-4 text-left"
              >
                <div className="bg-stone-100 w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                  <MessageSquare className="w-6 h-6 text-stone-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      {topic.category}
                    </span>
                    {topic.subject_name && (
                      <span className="bg-stone-100 text-stone-600 text-xs font-medium px-2 py-0.5 rounded-full">
                        {topic.subject_name}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-stone-900 mb-1 truncate">
                    {topic.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-stone-500">
                    <span className="font-medium text-stone-700">{topic.author_name}</span>
                    <UserRoleBadge role={topic.author_role} />
                    <span>•</span>
                    <span>{timeAgo(topic.created_at)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center shrink-0 ml-4 text-stone-500">
                  <span className="text-lg font-bold text-stone-900">{topic.reply_count || 0}</span>
                  <span className="text-xs uppercase tracking-wider">Respuestas</span>
                </div>
              </button>
            ))}
            {filteredTopics.length === 0 && (
              <div className="p-12 text-center text-stone-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No se encontraron temas. ¡Sé el primero en crear uno!</p>
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-stone-200 px-6 py-4 bg-stone-50/50">
                <button
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-stone-500 font-medium">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Topic Modal */}
      <AnimatePresence>
        {showNewTopic && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50"
              onClick={() => setShowNewTopic(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-stone-50/50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  Nuevo Tema
                </h2>
                <button onClick={() => setShowNewTopic(false)} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createTopicMutation.mutate({ title: newTitle, content: newContent, category: newCategory });
                }}
                className="p-6 space-y-5"
              >
                {createTopicMutation.isError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100">
                    {(createTopicMutation.error as Error).message}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Título</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej: Duda sobre el fallo Siri..."
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Categoría</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white appearance-none"
                  >
                    {CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Contenido</label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Describí tu pregunta o debate..."
                    rows={5}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTopic(false)}
                    className="flex-1 px-4 py-3 text-stone-600 font-bold hover:bg-stone-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!newTitle.trim() || createTopicMutation.isPending}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {createTopicMutation.isPending ? 'Publicando...' : 'Publicar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Topic Modal */}
      <AnimatePresence>
        {editingTopic && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50"
              onClick={() => setEditingTopic(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-stone-50/50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900">
                  <Pencil className="w-5 h-5 text-indigo-600" />
                  Editar Tema
                </h2>
                <button onClick={() => setEditingTopic(null)} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  editTopicMutation.mutate({
                    id: editingTopic.id,
                    title: editTopicTitle,
                    content: editTopicContent,
                    category: editTopicCategory,
                  });
                }}
                className="p-6 space-y-5"
              >
                {editTopicMutation.isError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100">
                    {(editTopicMutation.error as Error).message}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Título</label>
                  <input
                    type="text"
                    required
                    value={editTopicTitle}
                    onChange={(e) => setEditTopicTitle(e.target.value)}
                    placeholder="Ej: Duda sobre el fallo Siri..."
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Categoría</label>
                  <select
                    value={editTopicCategory}
                    onChange={(e) => setEditTopicCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white appearance-none"
                  >
                    {CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Contenido</label>
                  <textarea
                    value={editTopicContent}
                    onChange={(e) => setEditTopicContent(e.target.value)}
                    placeholder="Describí tu pregunta o debate..."
                    rows={5}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingTopic(null)}
                    className="flex-1 px-4 py-3 text-stone-600 font-bold hover:bg-stone-100 rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!editTopicTitle.trim() || editTopicMutation.isPending}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer text-center"
                  >
                    {editTopicMutation.isPending ? 'Guardando...' : 'Guardar'}
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
