import { motion } from 'motion/react';
import { ShieldCheck, ChevronRight, Lock, Eye, FileDigit, Globe } from 'lucide-react';
import { Link } from 'react-router';

export function Privacy() {
  const lastUpdated = "16 de Abril, 2026";

  const sections = [
    {
      id: 'responsable',
      title: 'Responsable del Tratamiento',
      icon: ShieldCheck,
      content: 'El responsable de la base de datos es [Tu Nombre/Empresa], con domicilio en [Tu Domicilio, Ciudad, Argentina]. Para cualquier consulta sobre sus datos, el Usuario puede contactarse al correo electrónico: [Email de Soporte/Privacidad].'
    },
    {
      id: 'consentimiento',
      title: 'Consentimiento Informado',
      icon: Eye,
      content: 'Al utilizar la Plataforma, registrarse o contratar una suscripción, el Usuario otorga su consentimiento libre, expreso e informado para que sus datos sean tratados conforme a lo aquí expuesto (Art. 5, Ley 25.326). El Usuario garantiza que los datos aportados son veraces y se compromete a mantenerlos actualizados.'
    },
    {
      id: 'datos',
      title: 'Datos Recolectados',
      icon: FileDigit,
      content: 'Lexar recolecta información en tres niveles:\nA. Datos Proporcionados por el Usuario: Nombre, DNI/CUIT, email, datos de facturación y matrícula.\nB. Datos de Uso y Navegación: Dirección IP, logs de actividad, cookies y tecnologías similares.\nC. Datos Provenientes de Fuentes Públicas: Información procesada de registros públicos oficiales (PJN, SCBA, etc.), amparada por el Art. 5 de la Ley 25.326.'
    },
    {
      id: 'finalidad',
      title: 'Finalidad del Tratamiento',
      icon: Lock,
      content: 'Los datos se utilizan para:\n- Prestación del Servicio y seguimiento de causas.\n- Optimización Técnica de algoritmos y bots.\n- Facturación segura de suscripciones.\n- Comunicaciones de alertas y actualizaciones.\n- Seguridad y prevención de fraudes.'
    },
    {
      id: 'almacenamiento',
      title: 'Almacenamiento y Transferencia',
      icon: Globe,
      content: 'Los datos se almacenan en infraestructura de nube (Railway/AWS/Google Cloud). El Usuario acepta la transferencia internacional a países con niveles adecuados de protección o que adhieren a estándares internacionales de seguridad.'
    },
    {
      id: 'derechos',
      title: 'Derechos ARCO',
      icon: ShieldCheck,
      content: 'De acuerdo con la Ley 25.326, el Usuario tiene derecho de Acceso, Rectificación, Actualización y Supresión. Para ejercerlos, debe enviar un e-mail a [Email de Soporte] adjuntando copia de su DNI. Lexar responderá en los plazos legales establecidos.'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-12 text-center md:text-left">
        <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
          <div className="bg-emerald-100 p-2 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <span className="text-sm font-semibold text-emerald-600 tracking-wider uppercase">Privacidad</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4 tracking-tight">
          Política de Privacidad
        </h1>
        <p className="text-lg text-stone-500">
          Tu privacidad es nuestra prioridad. Última actualización: {lastUpdated}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-1 hidden lg:block">
          <div className="sticky top-24 space-y-1">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 ml-3">Secciones</h3>
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-stone-600 hover:text-emerald-600 hover:bg-stone-100 rounded-lg transition-all group"
              >
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="truncate">{section.title}</span>
              </a>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-12">
          <div className="prose prose-stone max-w-none">
            <p className="text-stone-600 leading-relaxed text-lg bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 mb-12">
              En LexARG, nos tomamos muy en serio la seguridad de tu información. Cumplimos estrictamente con la Ley N° 25.326 de Protección de Datos Personales en Argentina.
            </p>

            <div className="grid gap-12">
              {sections.map((section) => (
                <motion.section
                  key={section.id}
                  id={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="scroll-mt-24 p-8 rounded-3xl bg-white border border-stone-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-900 shrink-0">
                      <section.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-stone-900 mb-4">
                        {section.title}
                      </h2>
                      <div className="text-stone-600 leading-relaxed whitespace-pre-wrap">
                        {section.content}
                      </div>
                    </div>
                  </div>
                </motion.section>
              ))}
            </div>
          </div>

          <footer className="pt-12 border-t border-stone-200 mt-12 text-center md:text-left">
            <div className="bg-stone-900 rounded-3xl p-10 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="text-2xl font-bold mb-4">¿Tenés alguna denuncia o reclamo?</h4>
                <p className="text-stone-400 mb-8 max-w-md">
                  La Agencia de Acceso a la Información Pública es el órgano de control de la Ley N° 25.326.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="mailto:soporte@lexar.ar"
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-stone-900 rounded-xl font-bold hover:bg-stone-100 transition-colors"
                  >
                    Contactar Privacidad
                  </a>
                  <Link
                    to="/help"
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-stone-800 text-white rounded-xl font-bold hover:bg-stone-700 transition-colors border border-stone-700"
                  >
                    Centro de Ayuda
                  </Link>
                </div>
              </div>
              <ShieldCheck className="absolute -right-8 -bottom-8 w-64 h-64 text-stone-800/50 -rotate-12" />
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
