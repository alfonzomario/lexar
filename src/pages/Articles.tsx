import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Newspaper, PenTool, MessageSquare, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';

export function Articles() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'news' | 'articles' | 'submit'>('news');
  const [news, setNews] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);

  const canPublish = user && (user.tier === 'basic' || user.tier === 'pro' || user.tier === 'admin' || user.tier === 'super_admin');

  useEffect(() => {
    fetch('/api/news').then(res => res.json()).then(setNews);
    fetch('/api/articles').then(res => res.json()).then(setArticles);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <div className="text-center space-y-4">
        <div className="bg-amber-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Newspaper className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
          Artículos y Noticias
        </h1>
        <p className="text-lg text-stone-500 max-w-2xl mx-auto">
          Mantenete actualizado con las últimas novedades jurídicas y leé artículos de la comunidad.
        </p>
      </div>

      <div className="flex justify-center">
        <div className="bg-stone-200 p-1 rounded-xl inline-flex">
          <button
            onClick={() => setActiveTab('news')}
            className={clsx(
              'px-6 py-2.5 rounded-lg font-medium text-sm transition-all',
              activeTab === 'news' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            Noticias
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={clsx(
              'px-6 py-2.5 rounded-lg font-medium text-sm transition-all',
              activeTab === 'articles' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            Artículos de la Comunidad
          </button>
          <button
            onClick={() => setActiveTab('submit')}
            className={clsx(
              'px-6 py-2.5 rounded-lg font-medium text-sm transition-all',
              activeTab === 'submit' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            Enviá tu artículo
          </button>
        </div>
      </div>

      {activeTab === 'news' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {news.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 hover:border-amber-300 hover:shadow-md transition-all flex flex-col"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-amber-600 mb-3">
                <span className="bg-amber-50 px-2 py-1 rounded-md">{item.source}</span>
                <span className="text-stone-400">{new Date(item.date).toLocaleDateString('es-AR')}</span>
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">{item.title}</h3>
              <p className="text-stone-500 text-sm mb-4 flex-1">{item.summary}</p>
              <span className="text-sm font-medium text-amber-600 mt-auto">Leer en fuente original &rarr;</span>
            </a>
          ))}
        </div>
      )}

      {activeTab === 'articles' && (
        <div className="space-y-6">
          {articles.length === 0 ? (
            <div className="text-center py-12 text-stone-500 bg-white rounded-3xl border border-stone-200 border-dashed">
              <PenTool className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Todavía no hay artículos publicados.</p>
              <button onClick={() => setActiveTab('submit')} className="text-amber-600 font-medium mt-2">¡Sé el primero en publicar!</button>
            </div>
          ) : (
            articles.map((article) => (
              <div key={article.id} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-stone-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-stone-100 w-10 h-10 rounded-full flex items-center justify-center font-bold text-stone-500">
                    {article.author_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">{article.author_name}</p>
                    <p className="text-xs text-stone-500">{article.author_role} • {new Date(article.date).toLocaleDateString('es-AR')}</p>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-stone-900 mb-4">{article.title}</h3>
                <div className="prose prose-stone max-w-none mb-6">
                  {article.content}
                </div>
                <div className="border-t border-stone-100 pt-4 flex items-center gap-4">
                  <button className="flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-amber-600 transition-colors">
                    <MessageSquare className="w-4 h-4" />
                    Comentar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'submit' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-stone-200">
          {!user ? (
            <div className="text-center py-8">
              <p className="text-stone-600 mb-4">Iniciá sesión para publicar artículos.</p>
              <Link to="/pricing" className="text-indigo-600 font-medium hover:underline">Ver planes</Link>
            </div>
          ) : !canPublish ? (
            <div className="text-center py-8">
              <h2 className="text-xl font-bold text-stone-900 mb-2">Publicar artículos es Basic</h2>
              <p className="text-stone-600 mb-6">Para enviar artículos a la comunidad necesitás el plan Basic o superior.</p>
              <Link to="/pricing" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors">Ver planes Basic</Link>
            </div>
          ) : (
          <><h2 className="text-2xl font-bold text-stone-900 mb-6">Publicá tu artículo</h2>
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">Título del artículo</label>
              <input type="text" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Ej: Análisis del fallo..." required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-2">Contenido</label>
              <textarea rows={10} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Escribí tu artículo acá..." required></textarea>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Proceso de moderación</p>
                <p>Todos los artículos son revisados por nuestro equipo antes de ser publicados para garantizar la calidad del contenido. Al enviar tu artículo, aceptás nuestros Términos y Condiciones.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="terms" required className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500" />
              <label htmlFor="terms" className="text-sm text-stone-600">Acepto los Términos y Condiciones y declaro ser el autor original del texto.</label>
            </div>
            <button type="submit" className="w-full bg-amber-600 text-white font-bold py-4 rounded-xl hover:bg-amber-700 transition-colors">
              Enviar para revisión
            </button>
          </form>
          </>
          )}
        </div>
      )}

      <div className="text-center text-xs text-stone-400 mt-12">
        Contenido con fines educativos e informativos. No constituye asesoramiento legal.
      </div>
    </motion.div>
  );
}
