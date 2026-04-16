import { motion } from 'motion/react';
import { Scale, ChevronRight, Download, Printer } from 'lucide-react';
import { Link } from 'react-router';

export function Terms() {
  const lastUpdated = "16 de Abril, 2026";

  const clauses = [
    { id: 'clausula-1', title: 'Objeto y Aceptación', content: 'Los presentes Términos y Condiciones regulan el acceso y uso de la plataforma LEXARG (en adelante, la "Plataforma"), de titularidad de [Tus Nombres/Razón Social].\n\nAl hacer clic en el botón de registro, completar un formulario de suscripción o navegar en el sitio, el Usuario manifiesta su consentimiento libre, expreso e informado a los presentes TyC en los términos de los Artículos 1105, 1107 y concordantes del Código Civil y Comercial de la Nación (CCCN). Si no está de acuerdo, deberá abstenerse de utilizar la Plataforma.' },
    { id: 'clausula-2', title: 'Naturaleza del Servicio', content: 'LEXARG es una solución tecnológica de tipo Software as a Service (SaaS) diseñada para la optimización de procesos legales, gestión de documentos y acceso a información pública judicial.\n\nIMPORTANTE: El Usuario reconoce y acepta que:\n- No es un estudio jurídico: Lexar no presta asesoramiento legal, no es un sustituto de la consulta profesional ni ejerce la abogacía.\n- No existe relación profesional: El uso de las herramientas de la Plataforma no genera una relación abogado-cliente entre el Usuario y los desarrolladores o titulares de Lexar.\n- Responsabilidad del Usuario: La interpretación de los datos obtenidos y el uso de los modelos de documentos generados son responsabilidad exclusiva del Usuario o de su profesional de confianza.' },
    { id: 'clausula-3', title: 'Capacidad y Registro', content: 'Para ser Usuario de Lexar se requiere ser una persona humana con capacidad legal para contratar (Art. 22 y ss. CCCN). En el caso de representar a una persona jurídica, el firmante declara poseer facultades suficientes para obligar a la entidad.\n\nEl Usuario se compromete a:\n- Proveer información veraz y actualizada en el registro.\n- Mantener la confidencialidad de su contraseña.\n- Notificar inmediatamente a Lexar ante cualquier uso no autorizado de su cuenta.' },
    { id: 'clausula-4', title: 'Propiedad Intelectual', content: 'Todo el contenido de la Plataforma, incluyendo de manera enunciativa pero no limitativa: el código fuente, algoritmos de procesamiento, interfaces de usuario (UI/UX), diseños, bases de datos estructuradas, logos y nombres comerciales, son propiedad exclusiva de LEXARG y están protegidos por la Ley de Propiedad Intelectual N° 11.723 y tratados internacionales.\n\nQueda estrictamente prohibido realizar ingeniería inversa, utilizar "spiders" o "bots" de scraping sin autorización.' },
    { id: 'clausula-5', title: 'Limitación de Responsabilidad', content: 'LEXARG utiliza procesos de automatización y recolección de datos provenientes de fuentes públicas oficiales (PJN, SCBA, Boletines Oficiales, etc.).\n\n- Disponibilidad de Terceros: Lexar no garantiza la integridad de los datos de portales gubernamentales.\n- Verificación Obligatoria: La información es referencial. Es obligación del Usuario verificar plazos directamente en fuentes oficiales.\n- Daños Indirectos: Lexar no será responsable por lucro cesante o pérdida de plazos judiciales.' },
    { id: 'clausula-6', title: 'Usos Prohibidos', content: 'El Usuario se obliga a utilizar la Plataforma de buena fe (Art. 9 CCCN). Queda prohibido cargar información falsa, utilizarla para actividades ilícitas o intentar vulnerar las medidas de seguridad de la infraestructura.' },
    { id: 'clausula-7', title: 'Condiciones Económicas', content: 'El acceso a determinadas funcionalidades está sujeto al pago de una suscripción. Los precios incluyen IVA y pueden ser modificados con 30 días de antelación. La falta de pago faculta a Lexar a suspender el acceso, permitiendo la exportación de datos por un plazo determinado.' },
    { id: 'clausula-8', title: 'Botón de Arrepentimiento', content: 'El Usuario tiene derecho a revocar la aceptación del servicio dentro de los diez (10) días corridos contados a partir de la fecha de suscripción, sin responsabilidad ni costo alguno. Lexar pondrá a disposición un "Botón de Arrepentimiento" visible.' },
    { id: 'clausula-9', title: 'Rescisión y "Baja Fácil"', content: 'El Usuario podrá cancelar su suscripción en cualquier momento. Lexar garantiza que el procedimiento para darse de baja será tan sencillo como lo fue el de alta.' },
    { id: 'clausula-10', title: 'Protección de Datos', content: 'LEXARG cumple con la Ley 25.326. Los datos se utilizan para la prestación del servicio y soporte técnico. El Usuario tiene derecho de acceso, rectificación y supresión de sus datos.' },
    { id: 'clausula-11', title: 'Modificaciones', content: 'LEXARG se reserva el derecho de modificar estos TyC. Todo cambio sustancial será notificado con quince (15) días de antelación. El uso continuo implica la aceptación de los nuevos términos.' },
    { id: 'clausula-12', title: 'Divisibilidad', content: 'Si alguna cláusula fuera declarada nula, dicha nulidad no afectará la validez del resto de las disposiciones.' },
    { id: 'clausula-13', title: 'Notificaciones', content: 'Se consideran válidas las notificaciones enviadas al correo electrónico vinculado a la cuenta del Usuario, conforme a la validez del domicilio constituido electrónico.' },
    { id: 'clausula-14', title: 'Ley Aplicable y Jurisdicción', content: 'Estos TyC se rigen por las leyes de la República Argentina. Ante controversias, las partes se someten a la jurisdicción de los Tribunales Ordinarios en lo Comercial de CABA, salvo en casos de protección al consumidor.' }
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-12 text-center md:text-left">
        <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
          <div className="bg-indigo-100 p-2 rounded-xl">
            <Scale className="w-6 h-6 text-indigo-600" />
          </div>
          <span className="text-sm font-semibold text-indigo-600 tracking-wider uppercase">Legal</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4 tracking-tight">
          Términos y Condiciones
        </h1>
        <p className="text-lg text-stone-500">
          Última actualización: {lastUpdated}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-1 hidden lg:block">
          <div className="sticky top-24 space-y-1">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 ml-3">Contenido</h3>
            {clauses.map((clause) => (
              <a
                key={clause.id}
                href={`#${clause.id}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-stone-600 hover:text-indigo-600 hover:bg-stone-100 rounded-lg transition-all group"
              >
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="truncate">{clause.title}</span>
              </a>
            ))}
            
            <div className="mt-8 pt-8 border-t border-stone-200">
              <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-stone-600 hover:text-indigo-600 hover:bg-stone-100 rounded-lg transition-all group">
                <span>Descargar PDF</span>
                <Download className="w-4 h-4" />
              </button>
              <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-stone-600 hover:text-indigo-600 hover:bg-stone-100 rounded-lg transition-all group">
                <span>Imprimir</span>
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-16">
          <div className="prose prose-stone max-w-none">
            <p className="text-stone-600 leading-relaxed text-lg italic bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 mb-12">
              Le rogamos que lea detenidamente estos términos y condiciones antes de utilizar nuestra plataforma. El acceso y uso de LexARG implica su aceptación incondicional.
            </p>

            {clauses.map((clause, index) => (
              <motion.section
                key={clause.id}
                id={clause.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="scroll-mt-24"
              >
                <div className="flex items-center gap-4 mb-6">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <h2 className="text-2xl font-bold text-stone-900 m-0">
                    CLÁUSULA {index + 1}: {clause.title.toUpperCase()}
                  </h2>
                </div>
                <div className="pl-12">
                  <div className="text-stone-600 leading-relaxed whitespace-pre-wrap text-lg">
                    {clause.content}
                  </div>
                </div>
                {index < clauses.length - 1 && (
                  <div className="mt-16 h-px bg-gradient-to-r from-stone-200 via-stone-100 to-transparent w-full" />
                )}
              </motion.section>
            ))}
          </div>

          <footer className="pt-12 border-t border-stone-200 mt-12">
            <div className="bg-stone-50 rounded-2xl p-8 border border-stone-200">
              <h4 className="text-lg font-bold text-stone-900 mb-2">¿Tiene dudas sobre estos términos?</h4>
              <p className="text-stone-600 mb-4">
                Nuestro equipo legal está a su disposición para aclarar cualquier punto de este acuerdo.
              </p>
              <Link
                to="/chat"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-stone-200 rounded-xl font-semibold text-stone-900 hover:bg-stone-100 transition-colors shadow-sm"
              >
                Contactar a soporte
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
