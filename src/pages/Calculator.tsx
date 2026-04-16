import React, { useState, useEffect } from 'react';
import { Calculator as CalcIcon, Calendar as CalendarIcon, AlertCircle, Info, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';

export function Calculator() {
  const [acts, setActs] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [jurisdiction, setJurisdiction] = useState('Nacion');
  const [fuero, setFuero] = useState('Civil');
  const [selectedActId, setSelectedActId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch('/api/acts')
      .then((res) => res.json())
      .then((data) => setActs(data));
    fetch('/api/holidays')
      .then((res) => res.json())
      .then((data) => setHolidays(data.map((h: any) => h.date)))
      .catch(() => setHolidays([]));
  }, []);

  const filteredActs = acts.filter(
    (act) => act.jurisdiction === jurisdiction && act.fuero === fuero
  );

  const isHoliday = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    return holidays.includes(dateStr);
  };

  const isNonWorkingDay = (date: Date): boolean => {
    return date.getDay() === 0 || date.getDay() === 6 || isHoliday(date);
  };

  const calculateDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !selectedActId) return;

    const act = acts.find((a) => a.id.toString() === selectedActId);
    if (!act) return;

    const start = new Date(startDate);
    // Add timezone offset to prevent day shifting
    start.setMinutes(start.getMinutes() + start.getTimezoneOffset());

    // 1. Fecha de inicio del cómputo (día siguiente a la notificación)
    const computeStart = new Date(start);
    computeStart.setDate(computeStart.getDate() + 1);
    // Skip non-working days for start date if hábiles
    if (act.type === 'hábiles') {
      while (isNonWorkingDay(computeStart)) {
        computeStart.setDate(computeStart.getDate() + 1);
      }
    }

    // 2. Calcular vencimiento
    let current = new Date(computeStart);
    let daysAdded = 0;
    
    // Track skipped holidays for display
    const skippedHolidays: string[] = [];

    if (act.days > 0) {
      daysAdded = 1; // computeStart is day 1
      while (daysAdded < act.days) {
        current.setDate(current.getDate() + 1);
        if (act.type === 'hábiles') {
          if (isHoliday(current)) {
            const holidayData = holidays.find(h => h === current.toISOString().split('T')[0]);
            if (holidayData) skippedHolidays.push(current.toISOString().split('T')[0]);
          }
          if (!isNonWorkingDay(current)) {
            daysAdded++;
          }
        } else {
          daysAdded++;
        }
      }
    }

    // Si el vencimiento cae inhábil, pasa al primer día hábil siguiente
    if (isNonWorkingDay(current)) {
      while (isNonWorkingDay(current)) {
        current.setDate(current.getDate() + 1);
      }
    }

    // 3. Fecha crítica límite (Plazo de gracia / 2 primeras horas)
    const gracePeriod = new Date(current);
    gracePeriod.setDate(gracePeriod.getDate() + 1);
    while (isNonWorkingDay(gracePeriod)) {
      gracePeriod.setDate(gracePeriod.getDate() + 1);
    }

    setResult({
      act,
      notificationDate: start,
      computeStart,
      dueDate: current,
      gracePeriod,
      days: act.days,
      type: act.type,
      normativeBase: act.normative_base,
      skippedHolidays,
      holidaysUsed: holidays.length > 0,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="text-center space-y-4">
        <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CalcIcon className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
          Calculadora de Plazos Procesales
        </h1>
        <p className="text-lg text-stone-500 max-w-2xl mx-auto">
          Calculá vencimientos de forma rápida y segura. Seleccioná el fuero, el acto procesal y la fecha de notificación.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Formulario */}
        <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-stone-200">
          <form onSubmit={calculateDeadline} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">
                  Jurisdicción
                </label>
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="Nacion">Nación / Federal</option>
                  <option value="PBA">Provincia de Buenos Aires</option>
                  <option value="CABA">CABA</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">
                  Fuero
                </label>
                <select
                  value={fuero}
                  onChange={(e) => {
                    setFuero(e.target.value);
                    setSelectedActId('');
                  }}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="Civil">Civil y Comercial</option>
                  <option value="Laboral">Laboral</option>
                  <option value="Penal">Penal</option>
                  <option value="Contencioso">Contencioso Administrativo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">
                  Tipo de Acto Procesal
                </label>
                <select
                  value={selectedActId}
                  onChange={(e) => setSelectedActId(e.target.value)}
                  required
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="" disabled>Seleccioná un acto...</option>
                  {filteredActs.map((act) => (
                    <option key={act.id} value={act.id}>
                      {act.name} ({act.days} días {act.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">
                  Fecha de Notificación
                </label>
                <div className="relative">
                  <CalendarIcon className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedActId || !startDate}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Calcular Vencimiento
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Resultados */}
        <div className="lg:col-span-7">
          {result ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden"
            >
              <div className="bg-indigo-600 p-6 md:p-8 text-white text-center">
                <h2 className="text-indigo-100 font-medium mb-2 uppercase tracking-wider text-sm">
                  Fecha Crítica Límite (Plazo de Gracia)
                </h2>
                <p className="text-3xl md:text-4xl font-bold capitalize">
                  {formatDate(result.gracePeriod)}
                </p>
                <p className="text-indigo-200 mt-2 text-sm">
                  Hasta las 09:30 hs (Nación) / 12:00 hs (PBA)
                </p>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-start gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <Info className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-stone-900">Detalle del Cómputo</h3>
                    <p className="text-stone-600 text-sm mt-1">
                      Acto: <span className="font-semibold">{result.act.name}</span>
                    </p>
                    <p className="text-stone-600 text-sm">
                      Plazo: <span className="font-semibold">{result.days} días {result.type}</span>
                    </p>
                    {result.normativeBase && (
                      <p className="text-stone-500 text-xs mt-2 italic">
                        Base normativa: {result.normativeBase}
                      </p>
                    )}
                  </div>
                </div>

                {/* Holiday notice */}
                {result.holidaysUsed && (
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <CalendarIcon className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-emerald-800">
                      <p className="font-semibold">✓ Feriados nacionales considerados</p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        El cálculo excluye {holidays.length} feriados nacionales del calendario oficial 2026.
                        {result.skippedHolidays.length > 0 && (
                          <span> Se omitieron {result.skippedHolidays.length} feriado(s) en el rango de este plazo.</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                <div className="relative pl-6 border-l-2 border-stone-200 space-y-8">
                  <div className="relative">
                    <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-stone-200 border-4 border-white" />
                    <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Notificación</p>
                    <p className="font-medium text-stone-900 capitalize">{formatDate(result.notificationDate)}</p>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-indigo-200 border-4 border-white" />
                    <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Inicio del Cómputo</p>
                    <p className="font-medium text-stone-900 capitalize">{formatDate(result.computeStart)}</p>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-rose-200 border-4 border-white" />
                    <p className="text-sm font-semibold text-rose-600 uppercase tracking-wider">Vencimiento Ordinario</p>
                    <p className="font-medium text-stone-900 capitalize">{formatDate(result.dueDate)}</p>
                    <p className="text-xs text-stone-500 mt-1">Fin del horario judicial.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full bg-stone-50 rounded-3xl border border-stone-200 border-dashed flex flex-col items-center justify-center p-12 text-center text-stone-400">
              <CalendarIcon className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-stone-500">Completá el formulario para ver el cálculo</p>
              <p className="text-sm mt-2 max-w-sm">
                El sistema calculará automáticamente los días hábiles, excluyendo fines de semana y feriados nacionales.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex gap-4 items-start">
        <CalendarIcon className="w-6 h-6 text-emerald-600 shrink-0" />
        <div className="text-sm text-emerald-800 space-y-1">
          <p className="font-bold">Feriados incluidos en el cálculo</p>
          <p>
            Este calculador ahora incluye el calendario oficial de feriados nacionales 2026.
            Los días feriados se excluyen del cómputo de plazos en días hábiles.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4 items-start">
        <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
        <div className="text-sm text-amber-800 space-y-2">
          <p className="font-bold">Aviso Legal Importante</p>
          <p>
            Esta herramienta tiene fines estrictamente educativos e informativos. No constituye asesoramiento legal.
          </p>
          <p>
            El cálculo incluye feriados nacionales pero <strong>no incluye asuetos judiciales específicos</strong> (ferias, días del trabajador judicial, etc.). Es responsabilidad exclusiva del profesional verificar los plazos aplicables según los códigos procesales y acordadas vigentes.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
