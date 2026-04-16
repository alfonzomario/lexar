import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, Scale, BookA, Calculator, ArrowRight, Newspaper, Users, GraduationCap, Film, Briefcase, CreditCard, FileText, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

const tools = [
  {
    to: '/subjects', icon: BookOpen, title: 'Materias', desc: 'Outlines y recursos por materia.',
    iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', hoverBg: 'group-hover:bg-indigo-600', hoverGradient: 'from-indigo-50',
  },
  {
    to: '/briefs', icon: Scale, title: 'Fallos', desc: 'Catálogo de jurisprudencia con IA.',
    iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', hoverBg: 'group-hover:bg-emerald-600', hoverGradient: 'from-emerald-50',
  },
  {
    to: '/notes', icon: FileText, title: 'Apuntes', desc: 'Resúmenes y apuntes de alumnos.',
    iconBg: 'bg-sky-100', iconColor: 'text-sky-600', hoverBg: 'group-hover:bg-sky-600', hoverGradient: 'from-sky-50',
  },
  {
    to: '/universities', icon: GraduationCap, title: 'Universidades', desc: 'Planes de estudio y cátedras.',
    iconBg: 'bg-amber-100', iconColor: 'text-amber-600', hoverBg: 'group-hover:bg-amber-600', hoverGradient: 'from-amber-50',
  },
  {
    to: '/normativa', icon: Scale, title: 'Normativa', desc: 'Leyes, decretos y códigos.',
    iconBg: 'bg-violet-100', iconColor: 'text-violet-600', hoverBg: 'group-hover:bg-violet-600', hoverGradient: 'from-violet-50',
  },
  {
    to: '/calculator', icon: Calculator, title: 'Calculadora Plazos', desc: 'Calculadora de plazos procesales.',
    iconBg: 'bg-orange-100', iconColor: 'text-orange-600', hoverBg: 'group-hover:bg-orange-600', hoverGradient: 'from-orange-50',
  },
  {
    to: '/latinisms', icon: BookA, title: 'Latinismos', desc: 'Diccionario de términos latinos.',
    iconBg: 'bg-teal-100', iconColor: 'text-teal-600', hoverBg: 'group-hover:bg-teal-600', hoverGradient: 'from-teal-50',
  },
  {
    to: '/forum', icon: Users, title: 'Foro', desc: 'Discusiones y debates académicos.',
    iconBg: 'bg-rose-100', iconColor: 'text-rose-600', hoverBg: 'group-hover:bg-rose-600', hoverGradient: 'from-rose-50',
  },
  {
    to: '/articles', icon: Newspaper, title: 'Artículos', desc: 'Noticias y publicaciones jurídicas.',
    iconBg: 'bg-fuchsia-100', iconColor: 'text-fuchsia-600', hoverBg: 'group-hover:bg-fuchsia-600', hoverGradient: 'from-fuchsia-50',
  },
  {
    to: '/jobs', icon: Briefcase, title: 'Bolsa de Empleo', desc: 'Oportunidades laborales.',
    iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', hoverBg: 'group-hover:bg-cyan-600', hoverGradient: 'from-cyan-50',
  },
  {
    to: '/movies', icon: Film, title: 'Cine Jurídico', desc: 'Recomendaciones de películas.',
    iconBg: 'bg-pink-100', iconColor: 'text-pink-600', hoverBg: 'group-hover:bg-pink-600', hoverGradient: 'from-pink-50',
  },
  {
    to: '/chat', icon: MessageCircle, title: 'Chat Estudiantil', desc: 'Salas y mensajes directos.',
    iconBg: 'bg-lime-100', iconColor: 'text-lime-600', hoverBg: 'group-hover:bg-lime-600', hoverGradient: 'from-lime-50',
  },
];

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
      transition: { staggerChildren: 0.06 }
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
        <div className="flex items-center justify-between mb-2 px-2">
          <h2 className="text-3xl font-bold text-stone-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Herramientas Principales</h2>
        </div>
        <p className="text-stone-500 text-base mb-8 px-2">Todo lo que necesitás para tu carrera en un solo lugar.</p>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {tools.map((item, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Link
                to={item.to}
                className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group relative overflow-hidden"
              >
                {/* Hover gradient background effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.hoverGradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

                <div className="relative z-10">
                  <div className={`${item.iconBg} w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 ${item.hoverBg} transition-all duration-300 shadow-sm`}>
                    <item.icon className={`w-6 h-6 ${item.iconColor} group-hover:text-white transition-colors`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-stone-900 group-hover:text-stone-800 transition-colors" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {item.title}
                  </h3>
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
