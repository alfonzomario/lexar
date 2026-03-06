import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { FileQuestion, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

type Flashcard = { id: number; front: string; back: string };

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function Simulacro() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
  const [subject, setSubject] = useState<{ id: number; name: string } | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [loading, setLoading] = useState(false);

  const isPro = user?.tier === 'pro' || user?.tier === 'admin' || user?.tier === 'super_admin';

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((data) => setSubjects(Array.isArray(data) ? data : []))
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);
    fetch(`/api/subjects/${subjectId}`)
      .then((r) => r.json())
      .then((data) => setSubject(data))
      .catch(() => setSubject(null))
      .finally(() => setLoading(false));
    fetch(`/api/subjects/${subjectId}/flashcards`)
      .then((r) => r.json())
      .then((list: Flashcard[]) => setCards(shuffle(list)))
      .catch(() => setCards([]));
    setIndex(0);
    setShowBack(false);
  }, [subjectId]);

  if (!user) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto text-center py-16 px-6">
        <div className="bg-stone-100 rounded-2xl p-10">
          <FileQuestion className="w-14 h-14 text-stone-400 mx-auto mb-4" />
          <p className="text-stone-600 mb-4">Iniciá sesión y contratá el plan Pro para usar simulacros.</p>
          <Link to="/pricing" className="text-indigo-600 font-medium hover:underline">Ver planes</Link>
        </div>
      </motion.div>
    );
  }

  if (!isPro) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto text-center py-16 px-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10">
          <Sparkles className="w-14 h-14 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 mb-2">Simulacro Pro</h2>
          <p className="text-stone-600 mb-6">Los simulacros por materia son exclusivos del plan Pro.</p>
          <Link to="/pricing" className="inline-flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-stone-800">Ver planes Pro</Link>
        </div>
      </motion.div>
    );
  }

  if (!subjectId) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 w-12 h-12 rounded-xl flex items-center justify-center">
            <FileQuestion className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Simulacro por materia</h1>
            <p className="text-stone-500 text-sm">Elegí una materia y practicá con preguntas tipo examen.</p>
          </div>
        </div>
        <ul className="grid gap-2">
          {subjects.map((s) => (
            <li key={s.id}>
              <Link
                to={`/simulacro/${s.id}`}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-stone-200 hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <span className="font-medium text-stone-900">{s.name}</span>
                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-indigo-600" />
              </Link>
            </li>
          ))}
        </ul>
      </motion.div>
    );
  }

  if (loading || !subject) {
    return <div className="max-w-2xl mx-auto py-16 text-center text-stone-500">Cargando...</div>;
  }

  if (cards.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto text-center py-16">
        <p className="text-stone-600 mb-4">Esta materia todavía no tiene tarjetas para practicar.</p>
        <button type="button" onClick={() => navigate('/simulacro')} className="text-indigo-600 font-medium hover:underline">
          Volver a materias
        </button>
      </motion.div>
    );
  }

  const current = cards[index];
  const progress = ((index + 1) / cards.length) * 100;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => navigate('/simulacro')} className="text-sm text-stone-500 hover:text-indigo-600">
          ← {subject.name}
        </button>
        <span className="text-sm font-medium text-stone-600">
          {index + 1} / {cards.length}
        </span>
      </div>
      <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
        <motion.div className="h-full bg-indigo-600 rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>
      <div
        className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm min-h-[200px] flex flex-col justify-center cursor-pointer"
        onClick={() => setShowBack((b) => !b)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setShowBack((b) => !b)}
      >
        {!showBack ? (
          <p className="text-lg text-stone-800 font-medium leading-relaxed">{current.front}</p>
        ) : (
          <p className="text-lg text-stone-700 leading-relaxed whitespace-pre-line">{current.back}</p>
        )}
        <p className="text-xs text-stone-400 mt-4">{showBack ? 'Tocá de nuevo para ocultar respuesta' : 'Tocá para ver la respuesta'}</p>
      </div>
      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={() => { setShowBack(false); setIndex((i) => (i > 0 ? i - 1 : cards.length - 1)); }}
          className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => { setShowBack(false); setIndex((i) => (i < cards.length - 1 ? i + 1 : 0)); }}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          Siguiente
        </button>
      </div>
      <div className="text-center">
        <button type="button" onClick={() => { setCards(shuffle(cards)); setIndex(0); setShowBack(false); }} className="text-sm text-stone-500 hover:text-indigo-600 flex items-center gap-1 mx-auto">
          <RotateCcw className="w-4 h-4" /> Mezclar y reiniciar
        </button>
      </div>
    </motion.div>
  );
}
