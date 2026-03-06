import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Bookmark, FileText, Scale, ClipboardList, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

type SavedItem = { resource_type: string; resource_id: number; created_at: string; title: string; url: string };

export function SavedForLater() {
  const { user } = useAuth();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isBasicOrAbove = user && ['basic', 'pro', 'admin', 'super_admin'].includes(user.tier);

  const fetchList = () => {
    if (!user || !isBasicOrAbove) return;
    const headers = { 'X-User-Id': String(user.id) };
    fetch('/api/saved-for-later', { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, [user?.id, isBasicOrAbove]);

  const remove = (resourceType: string, resourceId: number) => {
    if (!user) return;
    fetch(`/api/saved-for-later?resource_type=${resourceType}&resource_id=${resourceId}`, {
      method: 'DELETE',
      headers: { 'X-User-Id': String(user.id) },
    }).then(() => fetchList());
  };

  const icon = (type: string) => {
    if (type === 'brief') return <Scale className="w-5 h-5 text-indigo-600" />;
    if (type === 'exam') return <ClipboardList className="w-5 h-5 text-amber-600" />;
    return <FileText className="w-5 h-5 text-sky-600" />;
  };

  if (!user) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto text-center py-16 px-6">
        <div className="bg-stone-100 rounded-2xl p-10">
          <Bookmark className="w-14 h-14 text-stone-400 mx-auto mb-4" />
          <p className="text-stone-600 mb-4">Iniciá sesión y contratá el plan Basic o superior para usar "Para leer después".</p>
          <Link to="/pricing" className="text-indigo-600 font-medium hover:underline">Ver planes</Link>
        </div>
      </motion.div>
    );
  }

  if (!isBasicOrAbove) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto text-center py-16 px-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10">
          <Bookmark className="w-14 h-14 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 mb-2">Para leer después (Basic)</h2>
          <p className="text-stone-600 mb-6">Esta función es exclusiva del plan Basic o superior.</p>
          <Link to="/pricing" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700">Ver planes Basic</Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-100 w-12 h-12 rounded-xl flex items-center justify-center">
          <Bookmark className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Para leer después</h1>
          <p className="text-stone-500 text-sm">Todo lo que guardaste para ver más tarde.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-500">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 border-dashed p-12 text-center text-stone-500">
          <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p>No tenés nada guardado todavía.</p>
          <p className="text-sm mt-2">En fallos, apuntes y exámenes podés usar "Guardar para después".</p>
          <Link to="/briefs" className="inline-block mt-4 text-indigo-600 font-medium hover:underline">Explorar fallos</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={`${item.resource_type}-${item.resource_id}`} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-4 hover:border-indigo-200 transition-colors">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">{icon(item.resource_type)}</div>
              <Link to={item.url} className="flex-1 min-w-0">
                <p className="font-medium text-stone-900 truncate">{item.title}</p>
                <p className="text-xs text-stone-500">
                  {item.resource_type === 'brief' && 'Fallos'}
                  {item.resource_type === 'note' && 'Apunte'}
                  {item.resource_type === 'exam' && 'Examen'}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => remove(item.resource_type, item.resource_id)}
                className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Quitar de la lista"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
