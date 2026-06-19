import { useState } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login } = useAuth();
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDni, setRegDni] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<'Estudiante' | 'Abogado' | 'Profesor' | 'Profesor y Abogado' | 'Juez'>('Estudiante');
  const [regUniversity, setRegUniversity] = useState('');
  const [regLawFirm, setRegLawFirm] = useState('');
  const [regCourtSpecialty, setRegCourtSpecialty] = useState('');
  const [regError, setRegError] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [simulatedCard, setSimulatedCard] = useState('');

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
      onClose();
    } catch (err) {
      setLoginError((err as Error).message || 'Credenciales inválidas');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setRegError('Por favor completa los campos obligatorios.');
      return;
    }
    if ((regRole === 'Estudiante' || regRole === 'Profesor' || regRole === 'Profesor y Abogado') && !regUniversity.trim()) {
      setRegError('La universidad es obligatoria para tu rol.');
      return;
    }
    if (regRole === 'Juez' && !regCourtSpecialty.trim()) {
      setRegError('El fuero es obligatorio para jueces.');
      return;
    }
    
    setRegError('');
    setRegSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          profile_role: regRole,
          university: regUniversity.trim() || undefined,
          law_firm: regLawFirm.trim() || undefined,
          court_specialty: regCourtSpecialty.trim() || undefined,
          dni: regDni.trim() || undefined,
          phone: regPhone.trim() || undefined,
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrarse');
      }
      
      await login(regEmail.trim(), regPassword);
      onClose();
    } catch (err) {
      setRegError((err as Error).message);
    } finally {
      setRegSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
          onClick={() => !loginSubmitting && !regSubmitting && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className={clsx(
                    "pb-2 font-bold text-lg border-b-2 transition-all",
                    authTab === 'login' ? "border-indigo-600 text-stone-900" : "border-transparent text-stone-400 hover:text-stone-600"
                  )}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('register')}
                  className={clsx(
                    "pb-2 font-bold text-lg border-b-2 transition-all",
                    authTab === 'register' ? "border-indigo-600 text-stone-900" : "border-transparent text-stone-400 hover:text-stone-600"
                  )}
                >
                  Crear cuenta
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {authTab === 'login' ? (
              <>
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
                      className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none"
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
                      className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none"
                      disabled={loginSubmitting}
                    />
                  </div>
                  {loginError && <p className="text-sm text-red-600">{loginError}</p>}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => !loginSubmitting && onClose()}
                      className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loginSubmitting || !loginEmail.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {loginSubmitting ? 'Entrando...' : 'Entrar'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-name" className="block text-sm font-medium text-stone-700 mb-1">Nombre completo <span className="text-red-500">*</span></label>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Ej. Martín García"
                      className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm"
                      disabled={regSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-dni" className="block text-sm font-medium text-stone-700 mb-1">DNI</label>
                    <input
                      id="reg-dni"
                      type="text"
                      value={regDni}
                      onChange={(e) => setRegDni(e.target.value)}
                      placeholder="Ej. 12.345.678"
                      className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm"
                      disabled={regSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-email" className="block text-sm font-medium text-stone-700 mb-1">Email <span className="text-red-500">*</span></label>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="Ej. martin@correo.com"
                      className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm"
                      disabled={regSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-phone" className="block text-sm font-medium text-stone-700 mb-1">Teléfono</label>
                    <input
                      id="reg-phone"
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="Ej. 11 2345-6789"
                      className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm"
                      disabled={regSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-password" className="block text-sm font-medium text-stone-700 mb-1">Contraseña <span className="text-red-500">*</span></label>
                  <input
                    id="reg-password"
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Creá tu contraseña"
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm"
                    disabled={regSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="reg-role" className="block text-sm font-medium text-stone-700 mb-1">Trabajo o Posición <span className="text-red-500">*</span></label>
                  <select
                    id="reg-role"
                    value={regRole}
                    onChange={(e: any) => { setRegRole(e.target.value); setRegError(''); }}
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm"
                    disabled={regSubmitting}
                  >
                    <option value="Estudiante">Estudiante</option>
                    <option value="Abogado">Abogado</option>
                    <option value="Profesor">Profesor</option>
                    <option value="Profesor y Abogado">Profesor y Abogado</option>
                    <option value="Juez">Juez</option>
                  </select>
                </div>

                {(regRole === 'Estudiante' || regRole === 'Profesor' || regRole === 'Profesor y Abogado') && (
                  <div>
                    <label htmlFor="reg-university" className="block text-sm font-medium text-stone-700 mb-1">Universidad <span className="text-red-500">*</span></label>
                    <input
                      id="reg-university"
                      type="text"
                      required
                      value={regUniversity}
                      onChange={(e) => setRegUniversity(e.target.value)}
                      placeholder="Ej. Universidad de Buenos Aires"
                      className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm"
                      disabled={regSubmitting}
                    />
                  </div>
                )}

                {(regRole === 'Abogado' || regRole === 'Profesor y Abogado') && (
                  <div>
                    <label htmlFor="reg-law-firm" className="block text-sm font-medium text-stone-700 mb-1">Estudio jurídico <span className="text-stone-400 font-normal">(opcional)</span></label>
                    <input
                      id="reg-law-firm"
                      type="text"
                      value={regLawFirm}
                      onChange={(e) => setRegLawFirm(e.target.value)}
                      placeholder="Ej. Marval, O'Farrell & Mairal"
                      className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm"
                      disabled={regSubmitting}
                    />
                  </div>
                )}

                {regRole === 'Juez' && (
                  <div className="space-y-1">
                    <label htmlFor="reg-court-specialty" className="block text-sm font-medium text-stone-700 mb-1">Fuero <span className="text-red-500">*</span></label>
                    <input
                      id="reg-court-specialty"
                      type="text"
                      required
                      value={regCourtSpecialty}
                      onChange={(e) => setRegCourtSpecialty(e.target.value)}
                      placeholder="Ej. Fuero Civil y Comercial"
                      className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm"
                      disabled={regSubmitting}
                    />
                    <p className="text-stone-400 text-xs italic">Nota: La selección de este rol será posteriormente verificada por el equipo de desarrolladores</p>
                  </div>
                )}

                <div>
                  <label htmlFor="reg-card" className="block text-sm font-medium text-stone-700 mb-1">Datos de pago <span className="text-stone-400 font-normal">(opcional para prueba)</span></label>
                  <input
                    id="reg-card"
                    type="text"
                    value={simulatedCard}
                    onChange={(e) => setSimulatedCard(e.target.value)}
                    placeholder="Número de tarjeta (simulado)"
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none text-sm"
                    disabled={regSubmitting}
                  />
                </div>

                {regError && <p className="text-sm text-red-600">{regError}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => !regSubmitting && onClose()}
                    className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={regSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {regSubmitting ? 'Registrando...' : 'Crear cuenta'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
