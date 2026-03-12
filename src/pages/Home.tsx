import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, Scale, BookA, Calculator, ArrowRight, Newspaper, Users, GraduationCap, Film, Briefcase, CreditCard, FileText, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function Home() {
  const [news, setNews] = useState([]);

  useEffect(() => {
    fetch('/api/news')
      .then((res) => res.json())
      .then((data) => setNews(data.slice(0, 3)));
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-16"
    >
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-600 text-white rounded-3xl p-8 md:p-16 shadow-2xl">
        {/* Subtle background grid */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xNSkiLz48L3N2Zz4=')] opacity-30"></div>

        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl mix-blend-overlay"></div>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/30 rounded-full blur-2xl mix-blend-overlay"></div>

        <div className="relative z-10 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-indigo-100 text-sm font-medium mb-6 backdrop-blur-sm"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            LexARG 2.0 ya está disponible
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight"
          >
            Estudiá Derecho de forma <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white">inteligente.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-xl text-indigo-100/90 mb-10 max-w-2xl leading-relaxed"
          >
            La plataforma integral para estudiantes y profesionales en Argentina. Resúmenes de fallos, outlines por materia, foro de debate y herramientas jurídicas en un solo lugar.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              to="/subjects"
              className="bg-white text-indigo-900 px-8 py-4 rounded-xl font-bold hover:bg-stone-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-center flex items-center justify-center gap-2"
            >
              Explorar Materias <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/pricing"
              className="bg-indigo-700/50 backdrop-blur-md border border-indigo-500/50 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-600/60 transition-all text-center"
            >
              Ver Planes Premium
            </Link>
          </motion.div>
        </div>
        <Scale className="absolute -right-8 -bottom-16 w-[400px] h-[400px] text-white opacity-5 rotate-12 pointer-events-none" />
      </section>

      {/* Quick Access */}
      <section>
        <div className="flex items-center justify-between mb-8 px-2">
          <h2 className="text-2xl font-bold text-stone-900">Herramientas Principales</h2>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            { to: '/subjects', icon: BookOpen, title: 'Materias', desc: 'Outlines y recursos por materia.', color: 'indigo' },
            { to: '/briefs', icon: Scale, title: 'Fallos', desc: 'Catálogo de jurisprudencia.', color: 'emerald' },
            { to: '/notes', icon: FileText, title: 'Apuntes', desc: 'Resúmenes de alumnos.', color: 'sky' },
            { to: '/universities', icon: GraduationCap, title: 'Universidades', desc: 'Planes de estudio y cátedras.', color: 'amber' },
            { to: '/normativa', icon: Scale, title: 'Normativa', desc: 'Leyes y códigos de fondo.', color: 'blue' },
            { to: '/calculator', icon: Calculator, title: 'Calculadora Plazos', desc: 'Calculadora procesal.', color: 'orange' },
            { to: '/latinisms', icon: BookA, title: 'Latinismos', desc: 'Diccionario de términos.', color: 'teal' },
            { to: '/forum', icon: Users, title: 'Foro', desc: 'Discusiones y debates.', color: 'rose' },
            { to: '/articles', icon: Newspaper, title: 'Artículos', desc: 'Noticias y publicaciones.', color: 'fuchsia' },
            { to: '/jobs', icon: Briefcase, title: 'Bolsa de Empleo', desc: 'Oportunidades laborales.', color: 'violet' },
            { to: '/movies', icon: Film, title: 'Cine Jurídico', desc: 'Recomendaciones de películas.', color: 'cyan' },
            { to: '/chat', icon: MessageCircle, title: 'Chat Estudiantil', desc: 'Grupos y mensajes.', color: 'pink' },
          ].map((item, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Link
                to={item.to}
                className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 hover:shadow-lg transition-all flex flex-col h-full group relative overflow-hidden"
              >
                {/* Hover gradient background effect */}
                <div className={`absolute inset-0 bg-gradient-to-br from-${item.color}-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

                <div className="relative z-10">
                  <div className={`bg-${item.color}-100 w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-${item.color}-600 transition-all duration-300 shadow-sm`}>
                    <item.icon className={`w-6 h-6 text-${item.color}-600 group-hover:text-white transition-colors`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-stone-900 group-hover:text-indigo-900 transition-colors">{item.title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Pricing Section Preview */}
      <section className="bg-stone-900 text-white rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="space-y-4 max-w-xl">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <div className="bg-indigo-500/20 p-2 rounded-xl">
                <CreditCard className="w-8 h-8 text-indigo-400" />
              </div>
              Potenciá tu carrera
            </h2>
            <p className="text-stone-400 text-lg leading-relaxed">
              Registrate gratis o desbloqueá el acceso ilimitado a funcionalidades Premium: bolsa de trabajo exclusiva, apuntes validados y chat privado con otros estudiantes.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              {['Plan Free', 'Bolsa de Trabajo', 'Descarga de Apuntes', 'Chat Privado'].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm font-medium text-stone-300 bg-white/5 py-1 px-3 rounded-full border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
          <Link
            to="/pricing"
            className="bg-white text-stone-900 px-8 py-4 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            Ver Planes y Precios
          </Link>
        </div>
      </section>

      {/* News Section */}
      <section>
        <div className="flex items-center justify-between mb-8 px-2">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-stone-900">
            <div className="bg-stone-100 p-2 rounded-xl">
              <Newspaper className="w-6 h-6 text-indigo-600" />
            </div>
            Actualidad Jurídica
          </h2>
          <Link to="/articles" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            Ver todas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((item: any, i) => (
            <motion.a
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 hover:border-indigo-200 hover:shadow-lg transition-all flex flex-col h-full group"
            >
              <div className="text-xs font-bold tracking-wider uppercase text-indigo-600 mb-3 flex items-center gap-2">
                {item.source} <span className="w-1 h-1 rounded-full bg-stone-300"></span> {item.date}
              </div>
              <h3 className="text-xl font-bold mb-3 leading-snug group-hover:text-indigo-900 transition-colors">{item.title}</h3>
              <p className="text-stone-500 text-sm flex-1 leading-relaxed">{item.summary}</p>
              <div className="mt-6 flex items-center text-sm font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                Leer artículo completo <ArrowRight className="w-4 h-4 ml-1.5" />
              </div>
            </motion.a>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
