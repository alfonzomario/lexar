import React, { useState, useRef, useEffect } from 'react';
import { PencilLine, X, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { clsx } from 'clsx';

interface Annotation {
    id: number;
    selected_text: string;
    note: string;
    color: string;
    created_at?: string;
}

interface HighlightableTextProps {
    text: string;
    annotations: Annotation[];
    onAddAnnotation: (text: string, note: string, color: string) => Promise<void>;
    activeAnnotationId?: number | null;
    setActiveAnnotationId?: (id: number | null) => void;
    hoveredAnnotationId?: number | null;
    setHoveredAnnotationId?: (id: number | null) => void;
}

export const highlightColors = [
    { id: 'bg-yellow-100', name: 'Amarillo', colorClass: 'bg-yellow-100 text-stone-900 border-b border-yellow-400 hover:bg-yellow-200', activeClass: 'bg-yellow-300 text-stone-900 border-b border-yellow-500', hex: '#FEF08A' },
    { id: 'bg-emerald-100', name: 'Verde', colorClass: 'bg-emerald-100 text-stone-900 border-b border-emerald-400 hover:bg-emerald-200', activeClass: 'bg-emerald-300 text-stone-900 border-b border-emerald-500', hex: '#A7F3D0' },
    { id: 'bg-sky-100', name: 'Azul', colorClass: 'bg-sky-100 text-stone-900 border-b border-sky-400 hover:bg-sky-200', activeClass: 'bg-sky-300 text-stone-900 border-b border-sky-500', hex: '#BAE6FD' },
    { id: 'bg-pink-100', name: 'Rosa', colorClass: 'bg-pink-100 text-stone-900 border-b border-pink-400 hover:bg-pink-200', activeClass: 'bg-pink-300 text-stone-900 border-b border-pink-500', hex: '#FBCFE8' },
    { id: 'bg-purple-100', name: 'Púrpura', colorClass: 'bg-purple-100 text-stone-900 border-b border-purple-400 hover:bg-purple-200', activeClass: 'bg-purple-300 text-stone-900 border-b border-purple-500', hex: '#E9D5FF' }
];

export const getColorClasses = (colorStr: string, isHighlighted: boolean) => {
    const baseColor = colorStr ? colorStr.split(' ')[0] : 'bg-yellow-100';
    const found = highlightColors.find(c => c.id === baseColor);
    if (found) {
        return isHighlighted ? found.activeClass : found.colorClass;
    }
    return isHighlighted ? 'bg-yellow-300 text-stone-900 border-b border-yellow-500' : 'bg-yellow-100 text-stone-900 border-b border-yellow-400 hover:bg-yellow-200';
};

function cleanOcrText(rawText: string): string {
    if (!rawText) return '';
    
    // Normalize newlines
    let cleaned = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

    // 1. Join hyphenated words (e.g. conside- / rando or conside-\nrando)
    cleaned = cleaned.replace(/([a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]+)-\s*(?:\/)?\s*\n?\s*([a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]+)/g, '$1$2');

    // 2. Protect paragraph breaks (double newlines or more) with a placeholder
    cleaned = cleaned.replace(/\n\s*\n+/g, '___PARAGRAPH___');

    // 3. Replace single newlines within paragraphs with a space
    cleaned = cleaned.replace(/\n/g, ' ');

    // 4. Restore paragraph breaks
    cleaned = cleaned.replace(/___PARAGRAPH___/g, '\n\n');

    // 5. Clean up duplicate spaces
    cleaned = cleaned.replace(/\t/g, ' ')
        .replace(/[ ]{2,}/g, ' ');

    return cleaned.trim();
}

export function HighlightableText({
    text,
    annotations,
    onAddAnnotation,
    activeAnnotationId = null,
    setActiveAnnotationId = () => {},
    hoveredAnnotationId = null,
    setHoveredAnnotationId = () => {}
}: HighlightableTextProps) {
    const [selectedText, setSelectedText] = useState('');
    const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
    const [isAnnotating, setIsAnnotating] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [selectedColor, setSelectedColor] = useState('bg-yellow-100');
    const [isSaving, setIsSaving] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseUp = (e: MouseEvent) => {
            if (isAnnotating) return; // Don't interrupt if they are typing a note

            // If right clicked, handleContextMenu will take care of it
            if (e.button === 2) return;

            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
                // Ensure the selection is within our container
                if (containerRef.current && containerRef.current.contains(selection.anchorNode)) {
                    const selected = selection.toString().trim();
                    if (selected.length > 5) {
                        const range = selection.getRangeAt(0);
                        const rect = range.getBoundingClientRect();

                        setSelectedText(selected);
                        setPopoverPos({
                            x: rect.left + rect.width / 2,
                            y: rect.top + window.scrollY - 10
                        });
                        return;
                    }
                }
            }

            // Clicked outside or cleared selection
            const target = e.target as HTMLElement;
            if (!target.closest('.annotation-popover')) {
                setPopoverPos(null);
                setSelectedText('');
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [isAnnotating]);

    const handleContextMenu = (e: React.MouseEvent) => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
            if (containerRef.current && containerRef.current.contains(selection.anchorNode)) {
                const selected = selection.toString().trim();
                if (selected.length > 5) {
                    e.preventDefault(); // Prevent standard browser context menu
                    setSelectedText(selected);
                    setPopoverPos({
                        x: e.clientX,
                        y: e.clientY + window.scrollY
                    });
                    setIsAnnotating(true); // Open note entry field directly
                }
            }
        }
    };

    const handleStartAnnotating = () => {
        setIsAnnotating(true);
    };

    const handleCancel = () => {
        setIsAnnotating(false);
        setPopoverPos(null);
        setSelectedText('');
        setNoteContent('');
        setSelectedColor('bg-yellow-100');
        window.getSelection()?.removeAllRanges();
    };

    const handleSave = async () => {
        if (!noteContent.trim() || !selectedText) return;
        setIsSaving(true);
        try {
            await onAddAnnotation(selectedText, noteContent, selectedColor);
            handleCancel();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const renderTextWithHighlights = (pText: string, pIndex: number) => {
        if (!annotations || annotations.length === 0) return pText;

        let result: React.ReactNode[] = [pText];

        annotations.forEach(ann => {
            const newResult: React.ReactNode[] = [];
            result.forEach((part, index) => {
                if (typeof part === 'string') {
                    const escaped = ann.selected_text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    let regex = new RegExp(`(${escaped})`, 'gi');
                    if (ann.id === -999) {
                        const match = ann.selected_text.match(/Art(?:\.|ículo)?\s*(\d+)/i);
                        if (match) {
                            const artNum = match[1];
                            regex = new RegExp(`(Art(?:\\.|ículo)?\\s*${artNum}\\b)`, 'gi');
                        }
                    }
                    const parts = part.split(regex);
                    parts.forEach((p, i) => {
                        if (i % 2 === 0) {
                            newResult.push(p);
                        } else {
                            const isHighlighted = ann.id === activeAnnotationId || ann.id === hoveredAnnotationId;
                            newResult.push(
                                <span
                                    key={`${ann.id}-${pIndex}-${index}-${i}`}
                                    id={`annotation-span-${ann.id}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveAnnotationId(ann.id);
                                    }}
                                    onMouseEnter={() => setHoveredAnnotationId(ann.id)}
                                    onMouseLeave={() => setHoveredAnnotationId(null)}
                                    className={clsx(
                                        "cursor-pointer rounded px-1 transition-all duration-200 select-all",
                                        isHighlighted && "ring-2 ring-indigo-500/50 shadow-sm scale-[1.01]",
                                        getColorClasses(ann.color, isHighlighted)
                                    )}
                                >
                                    {p}
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

    const paragraphs = cleanOcrText(text).split('\n\n');

    return (
        <div 
            ref={containerRef} 
            className="relative select-text" 
            onContextMenu={handleContextMenu}
        >
            <div className="space-y-6">
                {paragraphs.map((p, idx) => (
                    <p
                        key={idx}
                        className="text-base text-stone-850 text-justify my-4 first:mt-0 font-sans"
                        style={{
                            fontFamily: "'Inter', 'Roboto', sans-serif",
                            lineHeight: '1.6'
                        }}
                    >
                        {renderTextWithHighlights(p, idx)}
                    </p>
                ))}
            </div>

            <AnimatePresence>
                {popoverPos && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed z-50 -translate-x-1/2 -translate-y-full pb-2 annotation-popover"
                        style={{ left: popoverPos.x, top: popoverPos.y }}
                    >
                        {isAnnotating ? (
                            <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-80 overflow-hidden flex flex-col font-sans text-left">
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
                                        placeholder="Escribí tu comentario aquí..."
                                        className="w-full text-sm p-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none mb-3 bg-white"
                                    />
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500 mr-1">Color:</span>
                                        {highlightColors.map((color) => (
                                            <button
                                                key={color.id}
                                                type="button"
                                                onClick={() => setSelectedColor(color.id)}
                                                className={clsx(
                                                    "w-5 h-5 rounded-full border transition-all duration-150 scale-100 hover:scale-110",
                                                    selectedColor === color.id ? "ring-2 ring-indigo-500 border-transparent scale-110" : "border-stone-300"
                                                )}
                                                style={{ backgroundColor: color.hex }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={handleCancel} className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg">Cancelar</button>
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving || !noteContent.trim()}
                                            className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                                        >
                                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Comentar'}
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
                                Comentar Selección
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-900 pointer-events-none"></div>
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
