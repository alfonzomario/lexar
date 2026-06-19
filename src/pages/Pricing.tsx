import { useState } from 'react';
import { Check, MessageCircle, Briefcase, FileText, ArrowRight, X, CreditCard, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { clsx } from 'clsx';

export function Pricing() {
  const { user, login, fetchCurrentUser } = useAuth();
  const navigate = useNavigate();

  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [cardNumber, setCardNumber] = useState('4517 8400 0000 0000');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('12/29');
  const [cardCvv, setCardCvv] = useState('123');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      description: 'Para estudiantes que recién empiezan.',
      features: [
        '5 resúmenes de fallos por mes',
        'Hasta 1 apunte y 1 examen por mes para ver',
        'Diccionario de latinismos',
        'Calculadora de plazos',
        'Noticias jurídicas',
      ]
    },
    {
      id: 'basic',
      name: 'Basic',
      price: '$4.500',
      period: '/mes',
      description: 'Ideal para preparar parciales.',
      features: [
        'Resúmenes de fallos ilimitados',
        'Outlines por materia',
        'Hasta 10 apuntes y exámenes por mes para ver',
        'Foro de debates',
        "Lista 'Para leer después' (favoritos)",
        'Notas privadas sobre fallos y apuntes',
      ],
      popular: true,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$8.000',
      period: '/mes',
      description: 'La experiencia completa para el final.',
      features: [
        'Todo lo del plan Basic',
        'Vistas ilimitadas de apuntes y exámenes',
        'Descarga de apuntes y exámenes en PDF',
        'Resumen de fallos con IA',
        'Simulacro por materia',
        'Acceso a Bolsa de Trabajo',
        'Chat privado entre usuarios',
      ]
    },
  ];

  const handlePlanAction = (planId: string) => {
    if (!user) {
      // Demo: login as free user
      login('juan@uba.ar');
      return;
    }

    if (user.tier === planId) {
      // Already on this plan, go to dashboard
      navigate('/');
    } else {
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        setSelectedPlan(plan);
        setCardName(user.name || '');
        setPaymentSuccess(false);
        setPaymentError('');
      }
    }
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !user) return;
    setIsPaying(true);
    setPaymentError('');
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tier: selectedPlan.id })
      });
      if (res.ok) {
        setPaymentSuccess(true);
        await fetchCurrentUser();
      } else {
        const errData = await res.json();
        setPaymentError(errData.error || 'Error al procesar el pago simulado.');
      }
    } catch (err) {
      setPaymentError('Error de red al conectar con el servidor.');
    } finally {
      setIsPaying(false);
    }
  };

  const getButtonState = (planId: string) => {
    if (!user) {
      return { text: 'Seleccionar Plan', className: 'bg-indigo-600 text-white hover:bg-indigo-700' };
    }

    // Tier Hierarchy: free < basic < pro
    const tiers = ['free', 'basic', 'pro'];
    const userTierIndex = tiers.indexOf(user.tier);
    const planTierIndex = tiers.indexOf(planId);

    if (userTierIndex === planTierIndex) {
      return { text: 'Tu Plan Actual', className: 'bg-emerald-100 text-emerald-700 cursor-default' };
    } else if (userTierIndex > planTierIndex) {
      return { text: 'Incluido en tu Plan', className: 'bg-stone-100 text-stone-500 cursor-default' };
    } else {
      return {
        text: `Mejorar a ${planId.charAt(0).toUpperCase() + planId.slice(1)}`,
        className: planId === 'pro' ? 'bg-stone-900 text-white hover:bg-stone-800' : 'bg-indigo-600 text-white hover:bg-indigo-700'
      };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-16 max-w-6xl mx-auto"
    >
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-stone-900">
          Elegí tu plan de estudio
        </h1>
        <p className="text-lg text-stone-500 max-w-2xl mx-auto">
          Desbloqueá herramientas avanzadas, bolsa de trabajo y apuntes colaborativos.
        </p>
      </div>

      {/* Incentive Banner - simple y claro */}
      <div className="rounded-3xl bg-stone-900 text-white p-8 md:p-10 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Subí apuntes y exámenes
            </h2>
            <p className="text-stone-300 text-lg max-w-lg">
              Si un admin los aprueba, las vistas y votos que reciban suman puntos para vos. Con 500 pasás a Basic y con 1000 a Pro, sin pagar.
            </p>
          </div>
          <button
            onClick={() => navigate('/subjects')}
            className="shrink-0 self-start md:self-center bg-white text-stone-900 px-6 py-3 rounded-xl font-semibold hover:bg-stone-100 transition-colors inline-flex items-center gap-2 group"
          >
            Ir a Materias
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const btnState = getButtonState(plan.id);

          return (
            <div
              key={plan.name}
              className={`bg-white rounded-3xl p-8 shadow-sm border relative flex flex-col ${plan.popular ? 'border-indigo-600 ring-2 ring-indigo-600 shadow-xl scale-105 z-10' : 'border-stone-200'
                }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Más elegido
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-stone-900 mb-2">{plan.name}</h3>
                <p className="text-stone-500 text-sm h-10">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-stone-900">{plan.price}</span>
                  {plan.period && <span className="text-stone-500 font-medium">{plan.period}</span>}
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-indigo-600 shrink-0" />
                    <span className="text-stone-700 text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanAction(plan.id)}
                className={clsx(
                  "w-full py-4 rounded-xl font-bold transition-all",
                  btnState.className
                )}
              >
                {btnState.text}
              </button>
            </div>
          );
        })}
      </div>

      {/* Qué incluye Pro — un solo bloque, claro */}
      <div className="pt-8 border-t border-stone-200">
        <p className="text-center text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-6">
          Incluido en el plan Pro
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-4 p-4 rounded-2xl bg-stone-50/80 border border-stone-100">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="font-bold text-stone-900 mb-0.5">Bolsa de Trabajo</h4>
              <p className="text-sm text-stone-500">Ofertas de pasantías y puestos junior en estudios jurídicos, exclusivas para la comunidad LexARG.</p>
            </div>
          </div>
          <div className="flex gap-4 p-4 rounded-2xl bg-stone-50/80 border border-stone-100">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="font-bold text-stone-900 mb-0.5">Apuntes sin límite</h4>
              <p className="text-sm text-stone-500">Vistas ilimitadas de apuntes y exámenes, y podés subir los tuyos para que otros los vean.</p>
            </div>
          </div>
          <div className="flex gap-4 p-4 rounded-2xl bg-stone-50/80 border border-stone-100">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="font-bold text-stone-900 mb-0.5">Chat entre estudiantes</h4>
              <p className="text-sm text-stone-500">Conectá con otros alumnos y armá grupos de estudio en tiempo real.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Payment Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-200"
          >
            {/* Header */}
            <div className="bg-stone-900 text-white p-6 relative">
              <button
                onClick={() => setSelectedPlan(null)}
                className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-lg font-sans">Pasarela de Pago</h3>
                  <p className="text-xs text-stone-400">Modo Sandbox de Simulación</p>
                </div>
              </div>
            </div>

            {/* Content */}
            {!paymentSuccess ? (
              <form onSubmit={handleConfirmPayment} className="p-6 space-y-6">
                <div>
                  <div className="flex justify-between items-center bg-stone-50 p-4 rounded-2xl border border-stone-100 mb-4">
                    <div>
                      <p className="text-xs text-stone-500 font-semibold uppercase tracking-wider">Plan Seleccionado</p>
                      <p className="font-bold text-stone-900 text-lg">LexAR {selectedPlan.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-indigo-600 text-xl">{selectedPlan.price}</p>
                      <p className="text-[10px] text-stone-500 font-semibold">{selectedPlan.period || '/único'}</p>
                    </div>
                  </div>
                </div>

                {paymentError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-semibold">
                    {paymentError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Número de Tarjeta</label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Nombre del Titular</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Vencimiento</label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">CVC / CVV</label>
                      <input
                        type="text"
                        required
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-center font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPaying}
                  className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm shadow-lg shadow-indigo-600/10"
                >
                  {isPaying ? 'Procesando simulación...' : 'Confirmar Pago Simulado'}
                </button>

                <p className="text-[10px] text-stone-400 text-center leading-relaxed">
                  Esta es una simulación de pasarela de pago para propósitos académicos y de demostración. No se realizará ningún cargo real.
                </p>
              </form>
            ) : (
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-extrabold text-stone-900 text-xl font-sans">¡Transacción Exitosa!</h4>
                  <p className="text-sm text-stone-550 leading-relaxed font-sans">
                    Tu cuenta ha sido mejorada al plan <span className="font-bold text-stone-850">{selectedPlan.name}</span> de forma real en la base de datos de LexAR.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedPlan(null);
                    navigate('/');
                  }}
                  className="w-full bg-stone-900 text-white font-bold py-3 rounded-xl hover:bg-stone-800 transition-colors text-sm"
                >
                  Volver al Inicio
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
