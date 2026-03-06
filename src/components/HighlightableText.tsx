import React, { useState, useRef, useEffect } from 'react';
import { PencilLine, X, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface Annotation {
    id: number;
    selected_text: string;
    note: string;
    color: string;
}

interface HighlightableTextProps {
    text: string;
    annotations: Annotation[];
    onAddAnnotation: (text: string, note: string) => Promise<void>;
}

export function HighlightableText({ text, annotations, onAddAnnotation }: HighlightableTextProps) {
    const [selectedText, setSelectedText] = useState('');
    const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
    const [isAnnotating, setIsAnnotating] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseUp = () => {
            if (isAnnotating) return; // Don't interrupt if they are typing a note

            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
                // Ensure the selection is within our container
                if (containerRef.current && containerRef.current.contains(selection.anchorNode)) {
                    const text = selection.toString().trim();
                    if (text.length > 5) { // Only allow somewhat meaningful selections
                        const range = selection.getRangeAt(0);
                        const rect = range.getBoundingClientRect();

                        setSelectedText(text);
                        setPopoverPos({
                            x: rect.left + rect.width / 2,
                            y: rect.top + window.scrollY - 10
                        });
                        return;
                    }
                }
            }

            // If we clicked outside or cleared selection, close the popover
            if (!isAnnotating) {
                setPopoverPos(null);
                setSelectedText('');
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [isAnnotating]);

    const handleStartAnnotating = () => {
        setIsAnnotating(true);
    };

    const handleCancel = () => {
        setIsAnnotating(false);
        setPopoverPos(null);
        setSelectedText('');
        setNoteContent('');
        window.getSelection()?.removeAllRanges();
    };

    const handleSave = async () => {
        if (!noteContent.trim() || !selectedText) return;
        setIsSaving(true);
        try {
            await onAddAnnotation(selectedText, noteContent);
            handleCancel();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const renderHighlightedText = () => {
        if (!annotations || annotations.length === 0) return text;

        let result: React.ReactNode[] = [text];

        annotations.forEach(ann => {
            const newResult: React.ReactNode[] = [];
            result.forEach((part, index) => {
                if (typeof part === 'string') {
                    const parts = part.split(ann.selected_text);
                    parts.forEach((p, i) => {
                        newResult.push(p);
                        if (i < parts.length - 1) {
                            newResult.push(
                                <span key={`${ann.id}-${index}-${i}`} className={`${ann.color} cursor-pointer group relative rounded px-1 transition-colors hover:brightness-95`}>
                                    {ann.selected_text}
                                    {ann.note && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-stone-900 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl font-sans normal-case">
                                            <div className="font-bold text-indigo-300 mb-1 text-xs uppercase tracking-wider">Anotación</div>
                                            {ann.note}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-900"></div>
                                        </div>
                                    )}
                                </span>
                            );
                        }
                    });
                } else {
                    newResult.push(part);
                }
            });
            result = newResult;
        });

        return result;
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="whitespace-pre-line">
                {renderHighlightedText()}
            </div>

            <AnimatePresence>
                {popoverPos && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed z-50 -translate-x-1/2 -translate-y-full pb-2"
                        style={{ left: popoverPos.x, top: popoverPos.y }}
                    >
                        {isAnnotating ? (
                            <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-80 overflow-hidden flex flex-col font-sans">
                                <div className="bg-stone-50 p-3 border-b border-stone-100 flex items-center justify-between">
                                    <span className="text-xs font-bold text-stone-600">Anotar Selección</span>
                                    <button onClick={handleCancel} className="text-stone-400 hover:text-stone-700"><X className="w-4 h-4" /></button>
                                </div>
                                <div className="p-3">
                                    <div className="text-xs text-stone-500 italic mb-2 line-clamp-2 border-l-2 border-indigo-200 pl-2">
                                        "{selectedText}"
                                    </div>
                                    <textarea
                                        autoFocus
                                        value={noteContent}
                                        onChange={e => setNoteContent(e.target.value)}
                                        placeholder="Escribí tu apunte o comentario sobre este texto..."
                                        className="w-full text-sm p-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none mb-3"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={handleCancel} className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg">Cancelar</button>
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving || !noteContent.trim()}
                                            className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                                        >
                                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleStartAnnotating}
                                className="bg-stone-900 text-white px-4 py-2 rounded-lg shadow-xl hover:bg-stone-800 transition-colors flex items-center gap-2 text-sm font-bold font-sans"
                            >
                                <PencilLine className="w-4 h-4" />
                                Subrayar y Anotar
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-900 pointer-events-none"></div>
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
