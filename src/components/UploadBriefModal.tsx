import React, { useState, useEffect } from 'react';
import { X, Sparkles, Upload, FileUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BalanzaLoader } from './BalanzaLoader';

interface UploadBriefModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

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
    const [relevance, setRelevance] = useState('');
    const [keywords, setKeywords] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [court, setCourt] = useState('');
    const [year, setYear] = useState('');
    const [parties, setParties] = useState('');
    const [timeline, setTimeline] = useState<any[]>([]);
    const [citations, setCitations] = useState<any[]>([]);

    const [subjects, setSubjects] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetch('/api/subjects').then(res => res.json()).then(setSubjects);
            setStep('input');
            setRawText('');
            setTitle(''); setFacts(''); setIssue(''); setRule('');
            setReasoning(''); setHolding(''); setRelevance(''); setKeywords('');
            setSubjectId(''); setCourt(''); setYear(''); setParties('');
            setTimeline([]); setCitations([]);
        }
    }, [isOpen]);

    const handleAnalyze = async () => {
        if (!rawText.trim()) return;
        setStep('analyzing');

        try {
            const res = await fetch('/api/briefs/ai-parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: rawText })
            });
            const data = await res.json();

            // AI now extracts the title too
            setTitle(data.title || 'Nuevo Fallo Analizado');
            // The full original text is ALWAYS stored verbatim - never replaced by AI summary
            setFacts(rawText);
            setIssue(data.issue || '');
            setRule(data.rule || '');
            setReasoning(data.reasoning || '');
            setHolding(data.holding || '');
            setRelevance(data.relevance || '');
            setKeywords(data.keywords || '');
            setCourt(data.court || '');
            setYear(data.year ? String(data.year) : '');
            setParties(data.parties || '');
            setTimeline(Array.isArray(data.timeline) ? data.timeline : []);
            setCitations(Array.isArray(data.citations) ? data.citations : []);

            setStep('review');
        } catch (error) {
            console.error('Error parsing text', error);
            setStep('input');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            alert('Solo se aceptan archivos PDF.');
            return;
        }

        setStep('analyzing');

        try {
            // Step 1: Extract raw text from PDF
            const formData = new FormData();
            formData.append('pdf', file);
            const pdfRes = await fetch('/api/briefs/parse-pdf', {
                method: 'POST',
                body: formData,
            });
            if (!pdfRes.ok) {
                const err = await pdfRes.json();
                alert(err.error || 'No se pudo leer el PDF.');
                setStep('input');
                return;
            }
            const { text } = await pdfRes.json();
            setRawText(text);

            // Step 2: Send extracted text to AI for structured analysis
            const aiRes = await fetch('/api/briefs/ai-parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            if (!aiRes.ok) {
                alert('Error al analizar el fallo con IA.');
                setStep('input');
                return;
            }
            const data = await aiRes.json();

            // AI now extracts the title. Full verbatim text always stored as facts.
            setTitle(data.title || file.name.replace('.pdf', ''));
            setFacts(text);
            setIssue(data.issue || '');
            setRule(data.rule || '');
            setReasoning(data.reasoning || '');
            setHolding(data.holding || '');
            setRelevance(data.relevance || '');
            setKeywords(data.keywords || '');
            setCourt(data.court || '');
            setYear(data.year ? String(data.year) : '');
            setParties(data.parties || '');
            setTimeline(Array.isArray(data.timeline) ? data.timeline : []);
            setCitations(Array.isArray(data.citations) ? data.citations : []);
            setStep('review');
        } catch (err) {
            console.error('File upload error:', err);
            alert('Ocurrió un error inesperado al procesar el PDF.');
            setStep('input');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !subjectId) return;
        setIsSaving(true);

        try {
            const res = await fetch('/api/briefs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title, facts, issue, rule, reasoning, holding, relevance, keywords, subject_id: subjectId,
                    court, year, parties, timeline, citations
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
                        {step === 'input' && (
                            <motion.div key="input" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-stone-600 text-sm flex-1">
                                            Pegá el texto bruto de la sentencia aquí o subí un archivo PDF. LexARG estructurará el fallo automáticamente.
                                        </p>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="ml-4 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl flex items-center gap-2 text-sm transition-colors whitespace-nowrap"
                                        >
                                            <FileUp className="w-4 h-4" />
                                            Subir Archivo
                                        </button>
                                    </div>
                                    <textarea
                                        value={rawText}
                                        onChange={(e) => setRawText(e.target.value)}
                                        placeholder="Pegá el contenido de la sentencia aquí..."
                                        className="w-full h-64 p-4 rounded-xl border border-stone-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none resize-none bg-stone-50"
                                    />
                                    <div className="flex justify-end pt-4">
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

                        {step === 'analyzing' && (
                            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-64 items-center justify-center">
                                <BalanzaLoader size="lg" text="La IA está analizando los argumentos..." />
                            </motion.div>
                        )}

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
