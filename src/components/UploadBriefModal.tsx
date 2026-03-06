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

    const [subjects, setSubjects] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetch('/api/subjects').then(res => res.json()).then(setSubjects);
            setStep('input');
            setRawText('');
            setTitle(''); setFacts(''); setIssue(''); setRule('');
            setReasoning(''); setHolding(''); setRelevance(''); setKeywords('');
            setSubjectId('');
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

            // Keep the user's title if they already typed one, or use a default
            setTitle(prev => prev || 'Nuevo Documento Analizado');
            setFacts(rawText); // The user requested the full text they pasted to go here
            setIssue(data.issue || '');
            setRule(data.rule || '');
            setReasoning(data.reasoning || '');
            setHolding(data.holding || '');
            setRelevance(data.relevance || '');
            setKeywords(data.keywords || '');

            setStep('review');
        } catch (error) {
            console.error('Error parsing text', error);
            setStep('input'); // fallback
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Simulate PDF text extraction
        setStep('analyzing');
        setTimeout(() => {
            // Fake extracted text that will then be sent to handleAnalyze
            const fakeExtractedText = "TEXTO EXTRAÍDO DEL ARCHIVO PDF:\nEl actor interpuso demanda solicitando la inconstitucionalidad de la norma. El demandado opuso excepciones alegando falta de legitimación. Los derechos consagrados en la Constitución no son absolutos, pero su reglamentación mediante leyes no puede alterar su sustancia (Art. 28 CN). El tribunal consideró que los hechos probados demuestran una afectación directa e irrazonable al núcleo del derecho de propiedad del actor, sin que exista una justificación o interés estatal superior válido en este caso. Se hace lugar a la demanda, revocando la sentencia de cámara, y se declara la inconstitucionalidad de la norma para este caso concreto.";
            setRawText(fakeExtractedText);

            // We need to trigger the analysis immediately after fake extraction
            // Since handleAnalyze uses state, we pass the text directly
            fetch('/api/briefs/ai-parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: fakeExtractedText })
            }).then(res => res.json()).then(data => {
                setTitle(prev => prev || 'Fallo Extraído de PDF');
                setFacts(fakeExtractedText);
                setIssue(data.issue || '');
                setRule(data.rule || '');
                setReasoning(data.reasoning || '');
                setHolding(data.holding || '');
                setRelevance(data.relevance || '');
                setKeywords(data.keywords || '');
                setStep('review');
            }).catch(() => {
                setStep('input');
            });

        }, 1500);
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
                    title, facts, issue, rule, reasoning, holding, relevance, keywords, subject_id: subjectId
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
                                            Pegá el texto bruto de la sentencia aquí o subí un archivo PDF. LexAR estructurará el fallo automáticamente.
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
