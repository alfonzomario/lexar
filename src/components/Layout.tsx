import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { BookOpen, Scale, BookA, Calculator, LayoutDashboard, User, Briefcase, FileText, CreditCard, MessageCircle, Newspaper, GraduationCap, Film, Users, ChevronDown, Menu, X, LogOut, Check, PencilLine, Bookmark, FileQuestion } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { PrivateNotesWidget } from './PrivateNotesWidget';

export function Layout() {
  const location = useLocation();
  const { user, login, logout, isLoading, isSuperAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const profileTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const openLoginModal = () => {
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
    setLoginModalOpen(true);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmail.trim();
    const password = loginPassword;
    if (!email) {
      setLoginError('Ingresá tu email');
      return;
    }
    setLoginError('');
    setLoginSubmitting(true);
    try {
      await login(email, password);
      setLoginModalOpen(false);
      setMobileMenuOpen(false);
    } catch (err) {
      setLoginError((err as Error).message || 'Credenciales inválidas');
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navGroups = [
    {
      name: 'Aprender',
      items: [
        { name: 'Materias', path: '/subjects', icon: BookOpen, description: 'Outlines y recursos por materia' },
        { name: 'Fallos', path: '/briefs', icon: Scale, description: 'Catálogo de jurisprudencia' },
        { name: 'Apuntes', path: '/notes', icon: FileText, description: 'Resúmenes de alumnos' },
        { name: 'Universidades', path: '/universities', icon: GraduationCap, description: 'Planes de estudio' },
        { name: 'Normativa', path: '/normativa', icon: Scale, description: 'Leyes y códigos' },
        { name: 'Para leer después', path: '/saved', icon: Bookmark, description: 'Tu lista de favoritos' },
      ]
    },
    {
      name: 'Herramientas',
      items: [
        { name: 'Calculadora Plazos', path: '/calculator', icon: Calculator, description: 'Calculadora procesal' },
        { name: 'Latinismos', path: '/latinisms', icon: BookA, description: 'Diccionario de términos' },
        { name: 'Simulacro', path: '/simulacro', icon: FileQuestion, description: 'Simulacro por materia (Pro)' },
      ]
    },
    {
      name: 'Comunidad',
      items: [
        { name: 'Foro', path: '/forum', icon: Users, description: 'Discusiones y debates' },
        { name: 'Artículos', path: '/articles', icon: Newspaper, description: 'Noticias y publicaciones' },
        { name: 'Bolsa de Empleo', path: '/jobs', icon: Briefcase, description: 'Oportunidades laborales' },
        { name: 'Cine Jurídico', path: '/movies', icon: Film, description: 'Recomendaciones de películas' },
        { name: 'Chat Estudiantil', path: '/chat', icon: MessageCircle, description: 'Grupos y mensajes' },
      ]
    }
  ];

  const handleMouseEnter = (groupName: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(groupName);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const handleProfileEnter = () => {
    if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
    setProfileDropdownOpen(true);
  };

  const handleProfileLeave = () => {
    profileTimeoutRef.current = setTimeout(() => {
      setProfileDropdownOpen(false);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-indigo-100 p-1.5 rounded-lg group-hover:bg-indigo-600 transition-colors">
              <Scale className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
            </div>
            <span className="text-xl font-bold tracking-tight text-stone-900">LexARG</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 h-full">
            <Link
              to="/"
              className={clsx(
                'text-sm font-medium transition-colors hover:text-indigo-600',
                location.pathname === '/' ? 'text-indigo-600' : 'text-stone-600'
              )}
            >
              Inicio
            </Link>

            {navGroups.map((group) => (
              <div
                key={group.name}
                className="relative h-full flex items-center"
                onMouseEnter={() => handleMouseEnter(group.name)}
                onMouseLeave={handleMouseLeave}
              >
                <button className={clsx(
                  "flex items-center gap-1 text-sm font-medium transition-colors hover:text-indigo-600",
                  activeDropdown === group.name || group.items.some(item => location.pathname === item.path)
                    ? 'text-indigo-600' : 'text-stone-600'
                )}>
                  {group.name}
                  <ChevronDown className={clsx(
                    "w-4 h-4 transition-transform duration-200",
                    activeDropdown === group.name ? "rotate-180" : ""
                  )} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {activeDropdown === group.name && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10, transition: { duration: 0.1 } }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-72 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden"
                    >
                      <div className="p-2 grid gap-1">
                        {group.items
                          .filter((item) => {
                            if (item.path === '/jobs') return user?.tier === 'pro' || isSuperAdmin;
                            if (item.path === '/forum' || item.path === '/saved') return user && (user.tier === 'basic' || user.tier === 'pro' || user.tier === 'admin' || isSuperAdmin);
                            if (item.path === '/simulacro') return user?.tier === 'pro' || user?.tier === 'admin' || isSuperAdmin;
                            return true;
                          })
                          .map((item) => {
                          const isActive = location.pathname === item.path;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={clsx(
                                "flex items-start gap-3 p-3 rounded-lg transition-colors group/item",
                                isActive ? "bg-indigo-50" : "hover:bg-stone-50"
                              )}
                            >
                              <div className={clsx(
                                "mt-0.5 rounded-md p-1.5 transition-colors",
                                isActive ? "bg-indigo-100 text-indigo-600" : "bg-stone-100 text-stone-500 group-hover/item:bg-indigo-100 group-hover/item:text-indigo-600"
                              )}>
                                <item.icon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className={clsx(
                                  "text-sm font-medium transition-colors",
                                  isActive ? "text-indigo-700" : "text-stone-900 group-hover/item:text-indigo-600"
                                )}>
                                  {item.name}
                                </div>
                                <div className="text-xs text-stone-500 line-clamp-1">
                                  {item.description}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            <Link
              to="/pricing"
              className={clsx(
                'text-sm font-medium transition-colors hover:text-indigo-600 flex items-center gap-1.5',
                location.pathname === '/pricing' ? 'text-indigo-600' : 'text-stone-600'
              )}
            >
              <CreditCard className="w-4 h-4" />
              Planes
            </Link>
          </nav>

          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            {isSuperAdmin && (
              <Link to="/admin" className="p-2 text-stone-600 hover:text-indigo-600 transition-colors bg-stone-100 hover:bg-indigo-50 rounded-full" title="Admin">
                <LayoutDashboard className="w-5 h-5" />
              </Link>
            )}

            {/* User Profile / Login Simulation */}
            {!isLoading && (
              user ? (
                <div
                  className="relative hidden sm:block h-full flex items-center py-2"
                  onMouseEnter={handleProfileEnter}
                  onMouseLeave={handleProfileLeave}
                >
                  <button className="flex items-center gap-2 p-1.5 pl-3 pr-4 text-stone-600 hover:text-indigo-600 transition-colors bg-stone-100 hover:bg-indigo-50 rounded-full border border-stone-200">
                    <div className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                      {user.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium">{user.name.split(' ')[0]}</span>
                    {user.tier === 'pro' && (
                      <span className="bg-indigo-600 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ml-1">Pro</span>
                    )}
                  </button>

                  <AnimatePresence>
                    {profileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10, transition: { duration: 0.1 } }}
                        className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden"
                      >
                        <div className="p-4 border-b border-stone-100 bg-stone-50 break-words">
                          <p className="font-bold text-stone-900">{user.name}</p>
                          <p className="text-xs text-stone-500">{user.email}</p>
                        </div>
                        <div className="p-2">
                          <Link to="/profile" className="flex items-center gap-2 p-2 hover:bg-stone-50 rounded-lg text-sm text-stone-700 transition-colors">
                            <User className="w-4 h-4 text-stone-400" /> Mi Perfil
                          </Link>
                          <Link to="/my-notes" className="flex items-center gap-2 p-2 hover:bg-stone-50 rounded-lg text-sm text-stone-700 transition-colors">
                            <PencilLine className="w-4 h-4 text-stone-400" /> Mis Anotaciones
                          </Link>
                          {isSuperAdmin && (
                            <Link to="/admin" className="flex items-center gap-2 p-2 hover:bg-stone-50 rounded-lg text-sm text-stone-700 transition-colors">
                              <LayoutDashboard className="w-4 h-4 text-stone-400" /> Panel de Control
                            </Link>
                          )}
                          <button onClick={logout} className="w-full flex items-center gap-2 p-2 hover:bg-red-50 hover:text-red-700 rounded-lg text-sm text-stone-700 transition-colors">
                            <LogOut className="w-4 h-4 text-red-400" /> Cerrar Sesión
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  onClick={openLoginModal}
                  className="hidden sm:flex items-center gap-2 p-1.5 px-4 text-white bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-full font-medium text-sm shadow-sm"
                >
                  <User className="w-4 h-4" /> Iniciar Sesión
                </button>
              )
            )}

            <button className="sm:hidden p-2 text-stone-600 hover:text-indigo-600 transition-colors bg-stone-100 rounded-full" title="Perfil">
              <User className="w-5 h-5" />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden p-2 text-stone-600 hover:text-indigo-600 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-white border-b border-stone-200 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-6 max-h-[80vh] overflow-y-auto">
              <Link
                to="/"
                className={clsx(
                  'block text-base font-medium',
                  location.pathname === '/' ? 'text-indigo-600' : 'text-stone-900'
                )}
              >
                Inicio
              </Link>

              {navGroups.map((group) => (
                <div key={group.name} className="space-y-3">
                  <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    {group.name}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {group.items
                      .filter((item) => {
                            if (item.path === '/jobs') return user?.tier === 'pro' || isSuperAdmin;
                            if (item.path === '/forum' || item.path === '/saved') return user && (user.tier === 'basic' || user.tier === 'pro' || user.tier === 'admin' || isSuperAdmin);
                            if (item.path === '/simulacro') return user?.tier === 'pro' || user?.tier === 'admin' || isSuperAdmin;
                            return true;
                          })
                      .map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={clsx(
                          "flex items-center gap-3 p-2 rounded-lg transition-colors",
                          location.pathname === item.path ? "bg-indigo-50 text-indigo-700" : "hover:bg-stone-50 text-stone-700"
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium text-sm">{item.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-stone-100">
                <Link
                  to="/pricing"
                  className={clsx(
                    'flex items-center gap-3 p-2 rounded-lg text-base font-medium',
                    location.pathname === '/pricing' ? 'text-indigo-600 bg-indigo-50' : 'text-stone-900 hover:bg-stone-50'
                  )}
                >
                  <CreditCard className="w-5 h-5" />
                  Planes de Suscripción
                </Link>
              </div>

              {/* Mobile Login State */}
              <div className="pt-2">
                {user ? (
                  <div className="p-4 bg-stone-50 rounded-xl flex items-center justify-between border border-stone-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 text-indigo-700 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg uppercase">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">{user.name}</p>
                        <p className="text-xs text-stone-500">{user.tier.toUpperCase()}</p>
                      </div>
                    </div>
                    <button onClick={logout} className="p-2 text-stone-400 hover:text-red-600 transition-colors">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={openLoginModal} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                    <User className="w-5 h-5" /> Iniciar Sesión
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {loginModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !loginSubmitting && setLoginModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-stone-900">Iniciar sesión</h2>
                <button
                  type="button"
                  onClick={() => !loginSubmitting && setLoginModalOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-stone-500 mb-4">
                Ingresá el email con el que estás registrado en LexARG (demo: juan@uba.ar, admin@lexar.ar).
              </p>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }}
                    placeholder="ej. admin@lexar.ar"
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                    disabled={loginSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium text-stone-700 mb-1">Contraseña (opcional en demo)</label>
                  <input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                    placeholder="Tu contraseña"
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={loginSubmitting}
                  />
                </div>
                {loginError && <p className="text-sm text-red-600">{loginError}</p>}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => !loginSubmitting && setLoginModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loginSubmitting || !loginEmail.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loginSubmitting ? 'Entrando...' : 'Entrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-stone-200 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 text-center md:text-left">
          <div>
            <div className="flex items-center gap-2 justify-center md:justify-start mb-4">
              <Scale className="w-6 h-6 text-indigo-600" />
              <span className="text-xl font-bold tracking-tight text-stone-900">LexARG</span>
            </div>
            <p className="text-sm text-stone-500 max-w-xs mx-auto md:mx-0">
              La plataforma integral para estudiantes y profesionales del Derecho en Argentina.
            </p>
          </div>
          <div></div>
          <div className="md:text-right">
            <p className="text-sm font-semibold text-stone-900 mb-2">Legal</p>
            <div className="flex flex-col gap-2 text-sm text-stone-500">
              <Link to="#" className="hover:text-indigo-600 transition-colors">Términos y Condiciones</Link>
              <Link to="#" className="hover:text-indigo-600 transition-colors">Política de Privacidad</Link>
            </div>
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
      <PrivateNotesWidget />
    </div>
  );
}
