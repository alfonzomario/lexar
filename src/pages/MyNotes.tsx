import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { PencilLine, Trash2, ExternalLink, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { BalanzaLoader } from '../components/BalanzaLoader';

export function MyNotes() {
    const { user } = useAuth();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            Promise.all([
                fetch(`/api/users/${user.id}/private-notes`).then(res => res.json()),
                fetch(`/api/users/${user.id}/text-annotations`).then(res => res.json())
            ])
                .then(([privateNotes, textAnnotations]) => {
                    const mappedAnnotations = textAnnotations.map((ta: any) => ({
                        id: `ta_${ta.id}`,
                        isAnnotation: true,
                        originalId: ta.id,
                        url: `/fallos/${ta.brief_id}`,
                        page_title: ta.brief_title || `Documento #${ta.brief_id}`,
                        content: `[Subrayado]\n"${ta.selected_text}"\n\n[Apunte]\n${ta.note || 'Sin apunte extra.'}`,
                        date: ta.created_at
                    }));

                    const allNotes = [...privateNotes, ...mappedAnnotations];
                    allNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    setNotes(allNotes);
                    setLoading(false);
                })
                .catch(console.error);
        }
    }, [user]);

    const handleDelete = async (note: any) => {
        try {
            if (note.isAnnotation) {
                const res = await fetch(`/api/annotations/${note.originalId}`, { method: 'DELETE' });
                if (res.ok) {
                    setNotes((prev) => prev.filter((n) => n.id !== note.id));
                }
            } else {
                const res = await fetch(`/api/private-notes/${note.id}`, { method: 'DELETE' });
                if (res.ok) {
                    setNotes((prev) => prev.filter((n) => n.id !== note.id));
                }
            }
        } catch (error) {
            console.error('Error al eliminar nota:', error);
        }
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl shadow-sm border border-stone-200">
                <BookOpen className="w-16 h-16 text-stone-300 mb-4" />
                <h2 className="text-2xl font-bold text-stone-900 mb-2">Iniciá sesión</h2>
                <p className="text-stone-500">Debes iniciar sesión para ver tus notas privadas.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <BalanzaLoader size="lg" text="Cargando tus anotaciones..." />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 max-w-5xl mx-auto w-full"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2">
                        <PencilLine className="w-8 h-8 text-indigo-600" />
                        Mis Anotaciones
                    </h1>
                    <p className="text-stone-500 mt-2">
                        Aquí están todas las notas y resúmenes personales que fuiste tomando mientras leías fallos y normativas. Son privadas y solo vos podés verlas.
                    </p>
                </div>
            </div>

            {notes.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 shadow-sm">
                    <PencilLine className="w-16 h-16 text-stone-200 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-stone-900 mb-2">No tenés notas todavía</h2>
                    <p className="text-stone-500 max-w-sm mx-auto">
                        Mientras navegás y estudiás, usá el botón flotante del lápiz abajo a la derecha para tomar notas vinculadas a esa página.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AnimatePresence>
                        {notes.map((note) => (
                            <motion.div
                                key={note.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                layout
                                className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 flex flex-col h-full group"
                            >
                                <div className="flex items-start justify-between mb-4 gap-4">
                                    <div className="flex-1">
                                        <p className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider mb-1">
                                            {new Date(note.date).toLocaleDateString('es-AR', {
                                                day: 'numeric', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                        <h3 className="font-bold text-stone-900 line-clamp-2 leading-snug">
                                            Asociado a: {note.page_title}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(note)}
                                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                                        title="Eliminar nota"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex-1 bg-stone-50 p-4 rounded-xl border border-stone-100 mb-4 text-stone-700 text-sm whitespace-pre-wrap font-serif leading-relaxed">
                                    {note.content}
                                </div>

                                <div className="mt-auto flex justify-end">
                                    <Link
                                        to={note.url}
                                        className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                                    >
                                        Volver a la lectura <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );
}
