import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { PencilLine, X, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export function PrivateNotesWidget() {
    const { user } = useAuth();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [note, setNote] = useState('');
    const [existingNotes, setExistingNotes] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            const currentUrl = location.pathname + location.search;
            fetch(`/api/users/${user.id}/private-notes?url=${encodeURIComponent(currentUrl)}`)
                .then(res => res.json())
                .then(setExistingNotes)
                .catch(console.error);
        }
    }, [isOpen, user, location]);

    if (!user) return null; // Only logged-in users

    const handleSave = async () => {
        if (!note.trim()) return;
        setIsSaving(true);

        // Attempt to extract a decent title from the current page
        const h1Title = document.querySelector('h1')?.textContent;
        const fallbackTitle = document.title !== 'LexAR' ? document.title.replace(' - LexAR', '') : 'Anotación';
        const pageTitle = h1Title || fallbackTitle;

        try {
            const res = await fetch(`/api/users/${user.id}/private-notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: location.pathname + location.search,
                    page_title: pageTitle,
                    content: note.trim()
                })
            });

            if (res.ok) {
                setNote('');
                setShowSuccess(true);
                setTimeout(() => {
                    setShowSuccess(false);
                    setIsOpen(false);
                }, 1500);
            }
        } catch (error) {
            console.error('Error saving private note', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden"
                    >
                        <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2">
                                <PencilLine className="w-4 h-4" /> Mis Anotaciones
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 bg-stone-50 flex flex-col max-h-[80vh]">
                            {existingNotes.length > 0 && (
                                <div className="mb-4 space-y-2 overflow-y-auto max-h-48 custom-scrollbar pr-1">
                                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">Notas guardadas en esta página</h4>
                                    {existingNotes.map(n => (
                                        <div key={n.id} className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-sm text-stone-800 whitespace-pre-wrap">
                                            {n.content}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-stone-500 mb-2">
                                {existingNotes.length > 0 ? 'Agregar otra nota privada a esta página.' : 'Escribí una nota privada vinculada a la página actual.'}
                            </p>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Esta norma es importante para..."
                                className="w-full h-32 p-3 text-sm rounded-xl border border-stone-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-3 bg-white"
                            />
                            <button
                                onClick={handleSave}
                                disabled={!note.trim() || isSaving}
                                className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (showSuccess ? <Check className="w-4 h-4" /> : 'Guardar Nota')}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center hover:scale-105 active:scale-95 border-2 border-white/20"
            >
                <PencilLine className="w-6 h-6" />
            </button>
        </div>
    );
}
