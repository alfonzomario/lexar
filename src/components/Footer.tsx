import { Link } from 'react-router';
import { Scale, Twitter, Instagram, Linkedin, Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-stone-200 py-16 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-indigo-100 p-1.5 rounded-lg">
              <Scale className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-xl font-bold tracking-tight text-stone-900">LexARG</span>
          </div>
          <p className="text-sm text-stone-500 mb-6 leading-relaxed">
            La plataforma integral para estudiantes y profesionales del Derecho en Argentina. Simplificando el acceso a la educación jurídica.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-stone-400 hover:text-indigo-600 transition-colors"><Twitter className="w-4 h-4" /></a>
            <a href="#" className="text-stone-400 hover:text-pink-600 transition-colors"><Instagram className="w-4 h-4" /></a>
            <a href="#" className="text-stone-400 hover:text-blue-600 transition-colors"><Linkedin className="w-4 h-4" /></a>
            <a href="#" className="text-stone-400 hover:text-stone-900 transition-colors"><Github className="w-4 h-4" /></a>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-stone-900 mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Plataforma</h3>
          <ul className="space-y-3 text-sm text-stone-500">
            <li><Link to="/pricing" className="hover:text-indigo-600 transition-colors inline-block">Planes y Precios</Link></li>
            <li><Link to="/" className="hover:text-indigo-600 transition-colors inline-block">Sobre Nosotros</Link></li>
            <li><Link to="/" className="hover:text-indigo-600 transition-colors inline-block">Contacto</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-stone-900 mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recursos</h3>
          <ul className="space-y-3 text-sm text-stone-500">
            <li><Link to="/subjects" className="hover:text-indigo-600 transition-colors inline-block">Materias y Outlines</Link></li>
            <li><Link to="/briefs" className="hover:text-indigo-600 transition-colors inline-block">Jurisprudencia con IA</Link></li>
            <li><Link to="/normativa" className="hover:text-indigo-600 transition-colors inline-block">Leyes Argentinas</Link></li>
            <li><Link to="/forum" className="hover:text-indigo-600 transition-colors inline-block">Comunidad</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-stone-900 mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Legal</h3>
          <ul className="space-y-3 text-sm text-stone-500">
            <li><Link to="/terms" className="hover:text-indigo-600 transition-colors inline-block">Términos y Condiciones</Link></li>
            <li><Link to="/privacy" className="hover:text-indigo-600 transition-colors inline-block">Política de Privacidad</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 border-t border-stone-100">
        <p className="text-sm text-stone-500 mb-2">
          &copy; {new Date().getFullYear()} LexARG. Todos los derechos reservados.
        </p>
        <p className="text-xs text-stone-400 max-w-2xl mx-auto">
          Esta plataforma tiene fines informativos y educativos. No constituye asesoramiento legal, ni reemplaza el consejo de un profesional matriculado.
        </p>
      </div>
    </footer>
  );
}
