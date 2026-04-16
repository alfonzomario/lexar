import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Scale, FileText, Calendar, Building2, Upload } from 'lucide-react';
import { clsx } from 'clsx';

interface UploadNormaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function UploadNormaModal({ isOpen, onClose, onSuccess }: UploadNormaModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    
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
        setTipo('Ley');
        setNumero('');
        setAnio('');
        setTitulo('');
        setOrganismo('');
        setTexto('');
        setFechaPublicacion('');
        setFuenteUrl('');
        setIsSaving(false);
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

    if (!isOpen) return null;

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
                    <div className="p-6 border-b border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/50">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
                                <Scale className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-stone-900">Aportar Normativa</h2>
                                <p className="text-sm text-stone-500">Agregá leyes, decretos o resoluciones a la base pública.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
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
                    </div>

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
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
