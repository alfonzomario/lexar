import React, { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, Upload, FileUp, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BalanzaLoader } from './BalanzaLoader';

interface UploadBriefModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ACCEPTED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'image/webp',
];
const ACCEPT_STRING = '.pdf,.docx,.doc,.jpg,.jpeg,.png,.webp';

const PROGRESS_STEPS = [
    { text: 'Leyendo documento...', delay: 0 },
    { text: 'Analizando con IA...', delay: 2000 },
    { text: 'Estructurando información...', delay: 5000 },
];

export function UploadBriefModal({ isOpen, onClose, onSuccess }: UploadBriefModalProps) {
    const [step, setStep] = useState<'input' | 'analyzing' | 'review'>('input');
    const [rawText, setRawText] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState('');
    const [facts, setFacts] = useState('');
    const [issue, setIssue] = useState('');
    const [rule, setRule] = useState('');
    const [reasoning, setReasoning] = useState('');
    const [holding, setHolding] = useState('');
    const [dissents, setDissents] = useState('');
    const [relevance, setRelevance] = useState('');
    const [keywords, setKeywords] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [court, setCourt] = useState('');
    const [year, setYear] = useState('');
    const [parties, setParties] = useState('');
    const [timeline, setTimeline] = useState<any[]>([]);
    const [citations, setCitations] = useState<any[]>([]);
    const [fullText, setFullText] = useState('');

    const [subjects, setSubjects] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [progressIndex, setProgressIndex] = useState(0);

    // Reset everything when opened
    useEffect(() => {
        if (isOpen) {
            fetch('/api/subjects').then(res => res.json()).then(setSubjects);
            setStep('input');
            setRawText('');
            setTitle(''); setFacts(''); setIssue(''); setRule('');
            setReasoning(''); setHolding(''); setDissents(''); setRelevance(''); setKeywords('');
            setSubjectId(''); setCourt(''); setYear(''); setParties('');
            setTimeline([]); setCitations([]); setFullText('');
            setProgressIndex(0);
        }
    }, [isOpen]);

    // Animated progress text
    useEffect(() => {
        if (step !== 'analyzing') {
            setProgressIndex(0);
            return;
        }

        const timers: ReturnType<typeof setTimeout>[] = [];
        PROGRESS_STEPS.forEach((s, i) => {
            if (i === 0) return; // index 0 is shown immediately
            timers.push(setTimeout(() => setProgressIndex(i), s.delay));
        });

        return () => timers.forEach(clearTimeout);
    }, [step]);

    /** Populate all fields from the AI response and auto-select subject */
    const populateFromAI = useCallback((data: any, fallbackTitle?: string) => {
        setTitle(data.title || fallbackTitle || 'Nuevo Fallo Analizado');
        setFullText(data._extractedText || '');
        setFacts(data.facts || '');
        setIssue(data.issue || '');
        setRule(data.rule || '');
        setReasoning(data.reasoning || '');
        setHolding(data.holding || '');
        setDissents(data.dissents || '');
        setRelevance(data.relevance || '');
        setKeywords(data.keywords || '');
        setCourt(data.court || '');
        setYear(data.year ? String(data.year) : '');
        setParties(data.parties || '');
        setTimeline(Array.isArray(data.timeline) ? data.timeline : []);
        setCitations(Array.isArray(data.citations) ? data.citations : []);

        // Auto-select subject from AI suggestion
        if (data.suggested_subject && subjects.length > 0) {
            const suggested = data.suggested_subject.toLowerCase().trim();
            const match = subjects.find(
                (s: any) => s.name.toLowerCase().trim() === suggested
            );
            if (match) setSubjectId(match.id);
        }
    }, [subjects]);

    /** Unified analysis: sends file OR text to /api/documents/ai-analyze */
    const analyzeWithAI = async (payload: { file?: File; text?: string }) => {
        setStep('analyzing');

        try {
            const formData = new FormData();
            if (payload.file) {
                formData.append('file', payload.file);
            } else if (payload.text) {
                formData.append('text', payload.text);
            }

            const res = await fetch('/api/documents/ai-analyze', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ error: 'Error desconocido' }));
                alert(errData.error || 'Error al analizar el documento con IA.');
                setStep('input');
                return;
            }

            const data = await res.json();
            const fallbackTitle = payload.file
                ? payload.file.name.replace(/\.[^.]+$/, '')
                : undefined;
            populateFromAI(data, fallbackTitle);
            setStep('review');
        } catch (error) {
            console.error('Analysis error:', error);
            alert('Error al conectar con el servicio de IA. Verificá tu conexión e intentá de nuevo.');
            setStep('input');
        }
    };

    const handleAnalyze = () => {
        if (!rawText.trim()) return;
        analyzeWithAI({ text: rawText });
    };

    const processFile = (file: File) => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            alert('Formato no soportado. Aceptamos PDF, DOCX, JPG, PNG y WEBP.');
            return;
        }
        analyzeWithAI({ file });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processFile(file);
    };

    // Drag & Drop handlers
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
        if (file) processFile(file);
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !subjectId) return;
        setIsSaving(true);

        try {
            const res = await fetch('/api/briefs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title, facts, issue, rule, reasoning, holding, dissents,
                    relevance, keywords, subject_id: subjectId,
                    court, year, parties, timeline, citations,
                    full_text: fullText || facts,
                })
            });
            if (res.ok) {
                onSuccess();
                onClose();
            }
        } catch (error) {
            console.error('Error saving brief', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                    <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        Aportar Jurisprudencia con IA
                    </h2>
                    <button onClick={onClose} className="p-2 text-stone-400 hover:bg-white rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {/* ─── INPUT STEP ─── */}
                        {step === 'input' && (
                            <motion.div key="input" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                <div className="space-y-4">
                                    <p className="text-stone-600 text-sm">
                                        Arrastrá un archivo o pegá el texto de la sentencia. LexARG lo estructurará automáticamente con IA.
                                    </p>

                                    {/* Drag & Drop Zone */}
                                    <input
                                        type="file"
                                        accept={ACCEPT_STRING}
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                    />
                                    <motion.div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        whileHover={{ scale: 1.005 }}
                                        whileTap={{ scale: 0.995 }}
                                        className={`
                                            relative cursor-pointer rounded-2xl border-2 border-dashed p-8
                                            flex flex-col items-center justify-center gap-3
                                            transition-all duration-200 group
                                            ${isDragOver
                                                ? 'border-indigo-500 bg-indigo-50/80'
                                                : 'border-stone-300 bg-stone-50/50 hover:border-indigo-400 hover:bg-gradient-to-b hover:from-indigo-50/60 hover:to-stone-50/30'
                                            }
                                        `}
                                    >
                                        <div className={`
                                            w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200
                                            ${isDragOver
                                                ? 'bg-indigo-100 text-indigo-600'
                                                : 'bg-stone-100 text-stone-400 group-hover:bg-indigo-100 group-hover:text-indigo-500'
                                            }
                                        `}>
                                            <ImageIcon className="w-6 h-6" />
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-sm font-semibold transition-colors ${isDragOver ? 'text-indigo-700' : 'text-stone-700'}`}>
                                                {isDragOver ? 'Soltá el archivo aquí' : 'Arrastrá un archivo aquí'}
                                            </p>
                                            <p className="text-xs text-stone-400 mt-1">
                                                PDF, DOCX, JPG, PNG o WEBP
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                            className="mt-1 px-4 py-2 bg-white border border-stone-200 hover:border-indigo-300 text-stone-700 font-medium rounded-xl flex items-center gap-2 text-sm transition-colors shadow-sm"
                                        >
                                            <FileUp className="w-4 h-4" />
                                            Seleccionar archivo
                                        </button>
                                    </motion.div>

                                    {/* Divider */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-px bg-stone-200" />
                                        <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">o</span>
                                        <div className="flex-1 h-px bg-stone-200" />
                                    </div>

                                    {/* Text area */}
                                    <textarea
                                        value={rawText}
                                        onChange={(e) => setRawText(e.target.value)}
                                        placeholder="Pegá el contenido de la sentencia aquí..."
                                        className="w-full h-48 p-4 rounded-xl border border-stone-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none resize-none bg-stone-50"
                                    />
                                    <div className="flex justify-end pt-2">
                                        <button
                                            onClick={handleAnalyze}
                                            disabled={!rawText.trim()}
                                            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Analizar Texto con IA
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ─── ANALYZING STEP ─── */}
                        {step === 'analyzing' && (
                            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-64 items-center justify-center gap-6">
                                <BalanzaLoader size="lg" text="" />
                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={progressIndex}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.35 }}
                                        className="text-sm font-medium text-stone-500"
                                    >
                                        {PROGRESS_STEPS[progressIndex].text}
                                    </motion.p>
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* ─── REVIEW STEP ─── */}
                        {step === 'review' && (
                            <motion.form key="review" onSubmit={handleSave} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-medium border border-emerald-100 flex items-start gap-2">
                                    <Sparkles className="w-5 h-5 shrink-0" />
                                    <div>
                                        La IA ha extraído y estructurado la información. Revisá los campos, seleccioná la materia correspondiente y guardá el fallo.
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-stone-700 mb-1">Título / Carátula</label>
                                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-3 rounded-xl border border-stone-200 focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-stone-700 mb-1">Materia Asociada</label>
                                        <select value={subjectId} onChange={e => setSubjectId(e.target.value)} required className="w-full p-3 rounded-xl border border-stone-200 focus:border-indigo-500 outline-none bg-white">
                                            <option value="">Seleccioná una materia...</option>
                                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-stone-700 mb-1">Texto Completo (Hechos / Original)</label>
                                        <textarea value={facts} onChange={e => setFacts(e.target.value)} className="w-full h-48 p-3 rounded-xl border border-stone-200 outline-none resize-y text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-stone-700 mb-1">Cuestión Jurídica (Issue)</label>
                                        <textarea value={issue} onChange={e => setIssue(e.target.value)} className="w-full h-20 p-3 rounded-xl border border-stone-200 outline-none resize-y" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-stone-700 mb-1">Doctrina Central (Regla)</label>
                                        <textarea value={rule} onChange={e => setRule(e.target.value)} className="w-full h-20 p-3 rounded-xl border border-stone-200 outline-none resize-y" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-stone-700 mb-1">Decisión (Holding)</label>
                                        <textarea value={holding} onChange={e => setHolding(e.target.value)} className="w-full h-20 p-3 rounded-xl border border-stone-200 outline-none resize-y" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-stone-700 mb-1">Votos en Disidencia</label>
                                        <textarea value={dissents} onChange={e => setDissents(e.target.value)} className="w-full h-20 p-3 rounded-xl border border-stone-200 outline-none resize-y" placeholder="Disidencias o votos particulares..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-stone-700 mb-1">Argumentos (Reasoning)</label>
                                        <textarea value={reasoning} onChange={e => setReasoning(e.target.value)} className="w-full h-24 p-3 rounded-xl border border-stone-200 outline-none resize-y" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-stone-700 mb-1">Relevancia</label>
                                        <input type="text" value={relevance} onChange={e => setRelevance(e.target.value)} className="w-full p-3 rounded-xl border border-stone-200 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-stone-700 mb-1">Keywords (separadas por coma)</label>
                                        <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} className="w-full p-3 rounded-xl border border-stone-200 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-stone-700 mb-1">Tribunal</label>
                                            <input type="text" value={court} onChange={e => setCourt(e.target.value)} className="w-full p-3 rounded-xl border border-stone-200 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-stone-700 mb-1">Año</label>
                                            <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full p-3 rounded-xl border border-stone-200 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-stone-700 mb-1">Partes</label>
                                            <input type="text" value={parties} onChange={e => setParties(e.target.value)} className="w-full p-3 rounded-xl border border-stone-200 outline-none" />
                                        </div>
                                    </div>
                                    {timeline.length > 0 && (
                                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                                            <label className="block text-sm font-bold text-stone-700 mb-2">Hitos Procesales Extraídos</label>
                                            <ul className="list-disc pl-5 text-sm text-stone-600 space-y-1">
                                                {timeline.map((item, idx) => (
                                                    <li key={idx}><span className="font-semibold">{item.date}</span>: {item.description}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {citations.length > 0 && (
                                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                                            <label className="block text-sm font-bold text-stone-700 mb-2">Normativa Citada Extraída</label>
                                            <ul className="list-disc pl-5 text-sm text-stone-600 space-y-1">
                                                {citations.map((item, idx) => (
                                                    <li key={idx}><span className="font-semibold">{item.norm_name}</span> ({item.considerando_ref})</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                                    <button type="button" onClick={() => setStep('input')} className="px-5 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-medium transition-colors">Volver</button>
                                    <button type="submit" disabled={isSaving || !title || !subjectId} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                                        <Upload className="w-4 h-4" />
                                        {isSaving ? 'Guardando...' : 'Guardar Jurisprudencia'}
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
