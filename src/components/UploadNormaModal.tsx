import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Scale, FileText, Calendar, Building2, Upload, Sparkles, FileUp, Type, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { BalanzaLoader } from './BalanzaLoader';

type Step = 'input' | 'analyzing' | 'form';

interface UploadNormaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function UploadNormaModal({ isOpen, onClose, onSuccess }: UploadNormaModalProps) {
    const [step, setStep] = useState<Step>('input');
    const [isSaving, setIsSaving] = useState(false);
    const [aiPrefilled, setAiPrefilled] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Input step state
    const [inputText, setInputText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form fields
    const [tipo, setTipo] = useState('Ley');
    const [numero, setNumero] = useState('');
    const [anio, setAnio] = useState('');
    const [titulo, setTitulo] = useState('');
    const [organismo, setOrganismo] = useState('');
    const [texto, setTexto] = useState('');
    const [fechaPublicacion, setFechaPublicacion] = useState('');
    const [fuenteUrl, setFuenteUrl] = useState('');

    const resetForm = () => {
        setStep('input');
        setTipo('Ley');
        setNumero('');
        setAnio('');
        setTitulo('');
        setOrganismo('');
        setTexto('');
        setFechaPublicacion('');
        setFuenteUrl('');
        setIsSaving(false);
        setAiPrefilled(false);
        setInputText('');
        setSelectedFile(null);
        setIsDragging(false);
    };

    const applyAiResult = (data: Record<string, unknown>) => {
        if (data.tipo) setTipo(String(data.tipo));
        if (data.numero) setNumero(String(data.numero));
        if (data.anio) setAnio(String(data.anio));
        if (data.titulo) setTitulo(String(data.titulo));
        if (data.organismo) setOrganismo(String(data.organismo));
        if (data.fecha_publicacion) setFechaPublicacion(String(data.fecha_publicacion));

        const extractedText = data._extractedText ? String(data._extractedText) : '';
        const resumido = data.texto_resumido ? String(data.texto_resumido) : '';
        setTexto(extractedText || resumido);
    };

    const handleAiAnalyze = async () => {
        if (!selectedFile && !inputText.trim()) return;

        setStep('analyzing');

        try {
            const formData = new FormData();
            if (selectedFile) {
                formData.append('file', selectedFile);
            } else {
                formData.append('text', inputText.trim());
            }

            const res = await fetch('/api/normas/ai-parse', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                applyAiResult(data);
                setAiPrefilled(true);
                setStep('form');
            } else {
                alert('Error al analizar con IA. Completá los campos manualmente.');
                setAiPrefilled(false);
                setStep('form');
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión con la IA. Completá los campos manualmente.');
            setAiPrefilled(false);
            setStep('form');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titulo || !texto) return;
        setIsSaving(true);

        try {
            const res = await fetch('/api/normas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo,
                    numero,
                    anio: parseInt(anio) || null,
                    titulo,
                    texto,
                    organismo,
                    fecha_publicacion: fechaPublicacion,
                    fuente_url: fuenteUrl
                })
            });

            if (res.ok) {
                onSuccess();
                onClose();
                resetForm();
            } else {
                alert('Error al guardar la norma.');
                setIsSaving(false);
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión.');
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleFileSelect = (file: File) => {
        setSelectedFile(file);
        setInputText('');
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    if (!isOpen) return null;

    const stepVariants = {
        initial: { opacity: 0, x: 40 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -40 },
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
                    onClick={handleClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/50">
                        <div className="flex items-center gap-3">
                            {step === 'form' && aiPrefilled && (
                                <button
                                    onClick={() => { setStep('input'); setAiPrefilled(false); }}
                                    className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors mr-1"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                            )}
                            <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
                                <Scale className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-stone-900">Aportar Normativa</h2>
                                <p className="text-sm text-stone-500">
                                    {step === 'input' && 'Subí un archivo o pegá el texto para analizar con IA.'}
                                    {step === 'analyzing' && 'Procesando con inteligencia artificial...'}
                                    {step === 'form' && 'Agregá leyes, decretos o resoluciones a la base pública.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                        <AnimatePresence mode="wait">
                            {/* ─── Step 1: Input ─── */}
                            {step === 'input' && (
                                <motion.div
                                    key="input"
                                    variants={stepVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    className="space-y-6"
                                >
                                    {/* File upload / drag & drop */}
                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={clsx(
                                            "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
                                            isDragging
                                                ? "border-indigo-400 bg-indigo-50/60"
                                                : selectedFile
                                                    ? "border-emerald-300 bg-emerald-50/40"
                                                    : "border-stone-200 bg-stone-50 hover:border-indigo-300 hover:bg-indigo-50/30"
                                        )}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFileSelect(file);
                                            }}
                                        />
                                        <div className={clsx(
                                            "p-3 rounded-xl",
                                            selectedFile ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"
                                        )}>
                                            <FileUp className="w-7 h-7" />
                                        </div>
                                        {selectedFile ? (
                                            <>
                                                <p className="text-sm font-bold text-emerald-700">{selectedFile.name}</p>
                                                <p className="text-xs text-emerald-600/70">
                                                    {(selectedFile.size / 1024).toFixed(1)} KB · Hacé clic para cambiar
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm font-bold text-stone-700">
                                                    Arrastrá un archivo o hacé clic para seleccionar
                                                </p>
                                                <p className="text-xs text-stone-400">
                                                    PDF, DOCX, o imagen (JPG, PNG, WEBP)
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {/* Separator */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-px bg-stone-200" />
                                        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">o pegá el texto</span>
                                        <div className="flex-1 h-px bg-stone-200" />
                                    </div>

                                    {/* Paste text */}
                                    <div>
                                        <div className="relative">
                                            <Type className="w-4 h-4 text-stone-400 absolute left-4 top-4" />
                                            <textarea
                                                value={inputText}
                                                onChange={(e) => {
                                                    setInputText(e.target.value);
                                                    if (e.target.value) setSelectedFile(null);
                                                }}
                                                placeholder="Pegá el texto de la norma acá para que la IA lo analice..."
                                                className="w-full border border-stone-200 rounded-xl pl-11 pr-4 py-3 h-40 resize-none bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-sm leading-relaxed"
                                            />
                                        </div>
                                    </div>

                                    {/* Analyze button */}
                                    <button
                                        onClick={handleAiAnalyze}
                                        disabled={!selectedFile && !inputText.trim()}
                                        className={clsx(
                                            "w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all shadow-sm text-sm",
                                            !selectedFile && !inputText.trim()
                                                ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                                                : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5"
                                        )}
                                    >
                                        <Sparkles className="w-4.5 h-4.5" />
                                        Analizar con IA
                                    </button>

                                    {/* Skip to manual */}
                                    <div className="text-center">
                                        <button
                                            onClick={() => setStep('form')}
                                            className="text-sm text-stone-400 hover:text-indigo-600 transition-colors underline underline-offset-2 decoration-stone-300 hover:decoration-indigo-400"
                                        >
                                            Completar manualmente
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── Step 2: Analyzing ─── */}
                            {step === 'analyzing' && (
                                <motion.div
                                    key="analyzing"
                                    variants={stepVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    className="flex items-center justify-center py-16"
                                >
                                    <BalanzaLoader
                                        size="lg"
                                        text="La IA está analizando la normativa..."
                                    />
                                </motion.div>
                            )}

                            {/* ─── Step 3: Form ─── */}
                            {step === 'form' && (
                                <motion.div
                                    key="form"
                                    variants={stepVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                >
                                    {/* AI success banner */}
                                    {aiPrefilled && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mb-6 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3"
                                        >
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                            <p className="text-sm font-medium">
                                                La IA ha analizado el documento. Revisá los campos y guardá.
                                            </p>
                                        </motion.div>
                                    )}

                                    <form id="norma-form" onSubmit={handleSave} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-bold text-stone-700 mb-2">Tipo de Norma</label>
                                                <select
                                                    value={tipo}
                                                    onChange={(e) => setTipo(e.target.value)}
                                                    className="w-full border border-stone-200 rounded-xl px-4 py-3 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                                >
                                                    <option value="Ley">Ley</option>
                                                    <option value="Decreto">Decreto</option>
                                                    <option value="Resolución">Resolución</option>
                                                    <option value="Acordada">Acordada</option>
                                                    <option value="Constitución">Constitución</option>
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-stone-700 mb-2">Número</label>
                                                    <input
                                                        type="text"
                                                        value={numero}
                                                        onChange={(e) => setNumero(e.target.value)}
                                                        placeholder="Ej: 27541"
                                                        className="w-full border border-stone-200 rounded-xl px-4 py-3 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-stone-700 mb-2">Año</label>
                                                    <input
                                                        type="number"
                                                        value={anio}
                                                        onChange={(e) => setAnio(e.target.value)}
                                                        placeholder="2019"
                                                        className="w-full border border-stone-200 rounded-xl px-4 py-3 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-stone-700 mb-2">Título de la Norma</label>
                                            <input
                                                required
                                                type="text"
                                                value={titulo}
                                                onChange={(e) => setTitulo(e.target.value)}
                                                placeholder="Ej: Ley de Solidaridad Social y Reactivación Productiva"
                                                className="w-full border border-stone-200 rounded-xl px-4 py-3 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-bold text-stone-700 mb-2">Organismo Emisor</label>
                                                <div className="relative">
                                                    <Building2 className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                                    <input
                                                        type="text"
                                                        value={organismo}
                                                        onChange={(e) => setOrganismo(e.target.value)}
                                                        placeholder="Ej: Congreso de la Nación"
                                                        className="w-full border border-stone-200 rounded-xl pl-10 pr-4 py-3 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-stone-700 mb-2">Fecha de Publicación</label>
                                                <div className="relative">
                                                    <Calendar className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                                    <input
                                                        type="date"
                                                        value={fechaPublicacion}
                                                        onChange={(e) => setFechaPublicacion(e.target.value)}
                                                        className="w-full border border-stone-200 rounded-xl pl-10 pr-4 py-3 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                                                Texto Completo de la Norma
                                            </label>
                                            <textarea
                                                required
                                                value={texto}
                                                onChange={(e) => setTexto(e.target.value)}
                                                placeholder="Pegá el texto articulado aquí..."
                                                className="w-full border border-stone-200 rounded-xl px-4 py-3 h-64 resize-none bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-sm leading-relaxed"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-stone-700 mb-2">URL Fuente Oficial (Opcional)</label>
                                            <input
                                                type="url"
                                                value={fuenteUrl}
                                                onChange={(e) => setFuenteUrl(e.target.value)}
                                                placeholder="https://servicios.infoleg.gob.ar/..."
                                                className="w-full border border-stone-200 rounded-xl px-4 py-3 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                            />
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    {step === 'form' && (
                        <div className="p-6 border-t border-stone-100 bg-stone-50 shrink-0 flex items-center justify-end gap-3 rounded-b-3xl">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-6 py-2.5 rounded-xl font-bold text-stone-600 hover:text-stone-900 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="norma-form"
                                disabled={isSaving || !titulo || !texto}
                                className={clsx(
                                    "px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm",
                                    isSaving || !titulo || !texto
                                        ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                                        : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5"
                                )}
                            >
                                <Upload className="w-4 h-4" />
                                {isSaving ? 'Guardando...' : 'Publicar Norma'}
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
