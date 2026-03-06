import { useState, useEffect } from 'react';
import { Film, PlayCircle, Search, Filter } from 'lucide-react';
import { motion } from 'motion/react';

export function Movies() {
  const [movies, setMovies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/movies')
      .then((res) => res.json())
      .then((data) => setMovies(data));
  }, []);

  const filteredMovies = movies.filter(
    (movie) =>
      movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movie.legal_themes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Film className="w-8 h-8 text-indigo-600" />
            Cine Jurídico
          </h1>
          <p className="text-stone-500 mt-2">
            Películas y documentales recomendados para estudiantes de derecho.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título o tema..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-stone-200 rounded-xl w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button className="p-2 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors text-stone-600">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMovies.map((movie) => (
          <a
            key={movie.id}
            href={movie.link}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 hover:border-indigo-300 transition-all hover:shadow-md flex flex-col h-full group"
          >
            <div className="bg-stone-100 w-full h-48 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
              <Film className="w-12 h-12 text-stone-300" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <PlayCircle className="w-16 h-16 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-1">{movie.title}</h3>
            <p className="text-sm text-stone-500 mb-3">{movie.year} • {movie.country}</p>
            <p className="text-stone-600 text-sm line-clamp-3 mb-4 flex-1">
              {movie.synopsis}
            </p>
            <div className="flex flex-wrap gap-2 mt-auto">
              {movie.legal_themes?.split(',').map((theme: string, idx: number) => (
                <span key={idx} className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {theme.trim()}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </motion.div>
  );
}
