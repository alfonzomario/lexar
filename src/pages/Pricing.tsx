import { Check, MessageCircle, Briefcase, FileText, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { clsx } from 'clsx';

export function Pricing() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      description: 'Para estudiantes que recién empiezan.',
      features: [
        '5 resúmenes de fallos por mes',
        '2 quizzes por semana',
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
        'Quizzes ilimitados',
        'Outlines por materia',
        'Hasta 10 apuntes y exámenes por mes para ver',
        'Acceso a Bolsa de Trabajo',
        'Foro de debates',
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
        'Chat privado entre usuarios',
        'Simulacros de examen',
        'Modo offline (próximamente)',
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
      // In a real app, this would open a Stripe/MercadoPago modal
      alert(`Flujo de pago simulado para mejorar al plan ${planId.toUpperCase()}`);
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

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-stone-200">
        <div className="text-center space-y-3">
          <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6 text-indigo-600" />
          </div>
          <h4 className="font-bold text-stone-900">Bolsa de Trabajo</h4>
          <p className="text-sm text-stone-500">Accedé a ofertas exclusivas para pasantías y puestos junior en estudios jurídicos (Plan Basic+).</p>
        </div>
        <div className="text-center space-y-3">
          <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6 text-indigo-600" />
          </div>
          <h4 className="font-bold text-stone-900">Apuntes Colaborativos</h4>
          <p className="text-sm text-stone-500">Descargá los mejores resúmenes de otros alumnos verificados (Plan Pro).</p>
        </div>
        <div className="text-center space-y-3">
          <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
            <MessageCircle className="w-6 h-6 text-indigo-600" />
          </div>
          <h4 className="font-bold text-stone-900">Chat Privado</h4>
          <p className="text-sm text-stone-500">Conectá directamente con otros estudiantes y armá grupos de estudio (Plan Pro).</p>
        </div>
      </div>
    </motion.div>
  );
}
