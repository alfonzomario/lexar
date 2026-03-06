import { useEffect, useState } from 'react';
import { Briefcase, MapPin, Clock, Search, Building2 } from 'lucide-react';
import { motion } from 'motion/react';

export function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/jobs')
      .then((res) => res.json())
      .then((data) => setJobs(data));
  }, []);

  const filtered = jobs.filter((j: any) =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.firm.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-indigo-600 text-white p-8 rounded-3xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 mb-2">
            <Briefcase className="w-8 h-8 text-indigo-200" />
            Bolsa de Trabajo
          </h1>
          <p className="text-indigo-100">Oportunidades exclusivas para estudiantes y jóvenes abogados.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
          <input
            type="text"
            placeholder="Buscar puesto o estudio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-indigo-700/50 border border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all placeholder-indigo-300 text-white"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((job: any) => (
          <div
            key={job.id}
            className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col md:flex-row md:items-center gap-6"
          >
            <div className="bg-stone-50 w-16 h-16 rounded-xl flex items-center justify-center shrink-0 border border-stone-100">
              <Building2 className="w-8 h-8 text-stone-400" />
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl font-bold text-stone-900 mb-1 group-hover:text-indigo-600 transition-colors">
                {job.title}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500 mb-3">
                <span className="font-medium text-stone-700">{job.firm}</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {job.type}</span>
              </div>
              <p className="text-stone-600 text-sm line-clamp-2">{job.description}</p>
            </div>

            <div className="shrink-0 flex flex-col items-end gap-3">
              <span className="text-xs font-medium text-stone-400">Publicado: {job.date}</span>
              <button className="bg-stone-900 text-white px-6 py-2 rounded-lg font-semibold hover:bg-stone-800 transition-colors w-full md:w-auto">
                Postularse
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-200 border-dashed">
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No se encontraron ofertas para "{search}".</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
