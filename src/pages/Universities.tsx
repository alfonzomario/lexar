import { useState, useEffect } from 'react';
import { GraduationCap, BookOpen, MessageSquare, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';

export function Universities() {
  const [universities, setUniversities] = useState<any[]>([]);
  const [selectedUni, setSelectedUni] = useState<any>(null);
  const [chairs, setChairs] = useState<any[]>([]);
  const [isLoadingChairs, setIsLoadingChairs] = useState(false);

  useEffect(() => {
    fetch('/api/universities')
      .then((res) => res.json())
      .then((data) => setUniversities(data));
  }, []);

  useEffect(() => {
    if (selectedUni) {
      setIsLoadingChairs(true);
      fetch(`/api/universities/${selectedUni.id}/chairs`)
        .then((res) => res.json())
        .then((data) => {
          setChairs(data);
          setIsLoadingChairs(false);
        });
    } else {
      setChairs([]);
    }
  }, [selectedUni]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <div className="text-center space-y-4">
        <div className="bg-sky-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <GraduationCap className="w-8 h-8 text-sky-600" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
          Universidades y Cátedras
        </h1>
        <p className="text-lg text-stone-500 max-w-2xl mx-auto">
          Encontrá apuntes específicos, planes de estudio y comentarios sobre las cátedras de tu facultad.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {universities.map((uni) => (
          <button
            key={uni.id}
            onClick={() => setSelectedUni(uni)}
            className={clsx(
              'p-6 rounded-2xl shadow-sm border transition-all flex flex-col items-center text-center',
              selectedUni?.id === uni.id
                ? 'bg-sky-50 border-sky-300 shadow-md ring-2 ring-sky-300 ring-offset-2'
                : 'bg-white border-stone-200 hover:border-sky-300 hover:shadow-md'
            )}
          >
            <div className={clsx(
              "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors",
              selectedUni?.id === uni.id ? "bg-sky-100 text-sky-600" : "bg-stone-100 text-stone-500"
            )}>
              <GraduationCap className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-2">{uni.name}</h3>
            <p className="text-sm text-stone-500">{uni.description}</p>
          </button>
        ))}
      </div>

      {selectedUni && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-stone-200 mt-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-stone-100 gap-4">
            <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
              <div className="bg-sky-100 p-2 rounded-xl">
                <BookOpen className="w-6 h-6 text-sky-600" />
              </div>
              Plan de Estudios - {selectedUni.name}
            </h2>
            <button className="bg-stone-100 text-stone-700 font-bold px-4 py-2 rounded-xl text-sm hover:bg-stone-200 transition-colors">
              Sugerir Cátedra Nueva
            </button>
          </div>

          <div className="space-y-6">
            {isLoadingChairs ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
              </div>
            ) : chairs.length > 0 ? (
              chairs.map((chair: any) => (
                <div key={chair.id} className="border border-stone-200 rounded-2xl p-6 hover:border-sky-300 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-stone-900 group-hover:text-sky-800 transition-colors">{chair.subject_name}</h3>
                      <p className="text-stone-500 font-medium flex items-center gap-2 mt-1">
                        Cátedra: <span className="text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">{chair.professor || 'Profesor Titular'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 border-t border-stone-100 pt-5 mt-5">
                    <button className="flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-sky-600 transition-colors bg-stone-50 px-3 py-2 rounded-lg">
                      <BookOpen className="w-4 h-4" />
                      Ver Apuntes
                    </button>
                    <button className="flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-sky-600 transition-colors bg-stone-50 px-3 py-2 rounded-lg">
                      <MessageSquare className="w-4 h-4" />
                      Foro de la Cátedra
                    </button>
                    <button className="flex items-center gap-2 text-sm font-bold text-sky-600 hover:text-white hover:bg-sky-600 transition-colors ml-auto border border-sky-200 px-4 py-2 rounded-lg">
                      <Upload className="w-4 h-4" />
                      Aportar Material
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-stone-50 rounded-2xl border border-stone-200 border-dashed">
                <GraduationCap className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-stone-700 mb-1">Aún no hay cátedras</h3>
                <p className="text-stone-500 text-sm">No tenemos registros de las cátedras asignadas para esta universidad.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
