import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Search, Scale, FileText, ArrowRight, Filter, Calendar, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';

export function Normativa() {
  const [normas, setNormas] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNormas();
  }, []);

  const fetchNormas = (query = '') => {
    setLoading(true);
    fetch(`/api/normas?q=${query}`)
      .then(res => res.json())
      .then(data => {
        setNormas(data);
        setLoading(false);
      });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNormas(search);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="bg-stone-900 text-white p-8 md:p-12 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
            <Scale className="w-3 h-3" />
            LexAR Normativa
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Consulta Inteligente de Normas
          </h1>
          <p className="text-stone-400 text-lg">
            Buscá leyes, decretos y resoluciones oficiales con análisis de IA y mapas de relaciones.
          </p>
          
          <form onSubmit={handleSearch} className="relative pt-4">
            <Search className="absolute left-4 top-[calc(1rem+1.25rem)] -translate-y-1/2 w-5 h-5 text-stone-500" />
            <input
              type="text"
              placeholder="Ej: Ley 27541, Alquileres, Defensa del Consumidor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-stone-500 text-white"
            />
            <button 
              type="submit"
              className="absolute right-2 top-[calc(1rem+0.5rem)] bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Buscar
            </button>
          </form>
        </div>
        <Scale className="absolute -right-12 -bottom-12 w-96 h-96 text-white opacity-5" />
      </div>

      {/* Results */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            {loading ? 'Buscando...' : `${normas.length} resultados encontrados`}
          </h2>
          <button className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-indigo-600 transition-colors">
            <Filter className="w-4 h-4" />
            Filtros Avanzados
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {normas.map((norma) => (
            <Link
              key={norma.id}
              to={`/normativa/${norma.id}`}
              className="bg-white p-6 rounded-2xl border border-stone-200 hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col md:flex-row md:items-center gap-6"
            >
              <div className="bg-stone-50 w-16 h-16 rounded-xl flex items-center justify-center shrink-0 border border-stone-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                <Scale className="w-8 h-8 text-stone-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider border border-stone-200">
                    {norma.tipo} {norma.numero}/{norma.anio}
                  </span>
                  <span className={clsx(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                    norma.estado === 'Vigente' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                  )}>
                    {norma.estado}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-stone-900 group-hover:text-indigo-600 transition-colors leading-tight">
                  {norma.titulo}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
                  <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {norma.organismo}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Publicado: {norma.fecha_publicacion}</span>
                </div>
              </div>

              <div className="shrink-0 flex items-center text-indigo-600 font-bold text-sm">
                Ver Texto <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}

          {!loading && normas.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 border-dashed">
              <Scale className="w-16 h-16 text-stone-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-stone-900">No encontramos esa norma</h3>
              <p className="text-stone-500 max-w-sm mx-auto">
                Probá buscando por número de ley o palabras clave más generales.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
