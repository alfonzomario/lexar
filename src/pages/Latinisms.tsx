import { useEffect, useState } from 'react';
import { BookA, Search, Bookmark } from 'lucide-react';
import { motion } from 'motion/react';

export function Latinisms() {
  const [latinisms, setLatinisms] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/latinisms')
      .then((res) => res.json())
      .then((data) => setLatinisms(data));
  }, []);

  const filtered = latinisms.filter((l: any) =>
    l.term.toLowerCase().includes(search.toLowerCase()) ||
    l.translation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 flex items-center gap-3">
            <BookA className="w-8 h-8 text-emerald-600" />
            Diccionario de Latinismos
          </h1>
          <p className="text-stone-500 mt-1">Términos latinos frecuentes en el derecho argentino.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar término o traducción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((item: any) => (
          <div
            key={item.id}
            className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 hover:border-emerald-200 hover:shadow-md transition-all group flex flex-col h-full relative"
          >
            <button className="absolute top-4 right-4 p-2 text-stone-300 hover:text-emerald-600 transition-colors">
              <Bookmark className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold font-serif text-stone-900 mb-1 pr-8">{item.term}</h2>
            <p className="text-emerald-600 font-medium text-sm mb-4">{item.translation}</p>
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Significado</h3>
                <p className="text-stone-700 text-sm leading-relaxed">{item.meaning}</p>
              </div>
              {item.example && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Ejemplo</h3>
                  <p className="text-stone-600 text-sm italic border-l-2 border-emerald-200 pl-3 py-1 bg-stone-50 rounded-r-md">
                    "{item.example}"
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-100 border-dashed">
            <p>No se encontraron resultados para "{search}".</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
