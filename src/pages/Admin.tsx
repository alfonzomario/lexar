import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { LayoutDashboard, Users, FileText, Settings, Database, ShieldAlert, FileQuestion, BookOpen, Check, XCircle, BookMarked } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';

export function Admin() {
  const { user, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingExams, setPendingExams] = useState<any[]>([]);
  const [pendingNotes, setPendingNotes] = useState<any[]>([]);

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'content', name: 'Contenido', icon: FileText },
    { id: 'exams', name: 'Exámenes pendientes', icon: FileQuestion },
    { id: 'notes', name: 'Apuntes pendientes', icon: BookMarked },
    { id: 'users', name: 'Usuarios', icon: Users },
    { id: 'moderation', name: 'Moderación', icon: ShieldAlert },
    { id: 'settings', name: 'Configuración', icon: Settings },
  ];

  useEffect(() => {
    if (isSuperAdmin && activeTab === 'exams') {
      fetch('/api/exams/pending', { headers: user ? { 'X-User-Id': String(user.id) } : {} })
        .then((r) => r.json())
        .then(setPendingExams)
        .catch(() => setPendingExams([]));
    }
  }, [isSuperAdmin, activeTab, user]);

  useEffect(() => {
    if (isSuperAdmin && activeTab === 'notes') {
      fetch('/api/notes/pending', { headers: user ? { 'X-User-Id': String(user.id) } : {} })
        .then((r) => r.json())
        .then(setPendingNotes)
        .catch(() => setPendingNotes([]));
    }
  }, [isSuperAdmin, activeTab, user]);

  const handleApprove = async (examId: number) => {
    if (!user) return;
    try {
      await fetch(`/api/exams/${examId}/approve`, { method: 'PATCH', headers: { 'X-User-Id': String(user.id) } });
      setPendingExams((prev) => prev.filter((e) => e.id !== examId));
    } catch (e) {
      alert('Error al aprobar');
    }
  };
  const handleReject = async (examId: number) => {
    if (!user) return;
    try {
      await fetch(`/api/exams/${examId}/reject`, { method: 'PATCH', headers: { 'X-User-Id': String(user.id) } });
      setPendingExams((prev) => prev.filter((e) => e.id !== examId));
    } catch (e) {
      alert('Error al rechazar');
    }
  };

  const handleApproveNote = async (noteId: number) => {
    if (!user) return;
    try {
      await fetch(`/api/notes/${noteId}/approve`, { method: 'PATCH', headers: { 'X-User-Id': String(user.id) } });
      setPendingNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (e) {
      alert('Error al aprobar');
    }
  };
  const handleRejectNote = async (noteId: number) => {
    if (!user) return;
    try {
      await fetch(`/api/notes/${noteId}/reject`, { method: 'PATCH', headers: { 'X-User-Id': String(user.id) } });
      setPendingNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (e) {
      alert('Error al rechazar');
    }
  };

  if (!user || !isSuperAdmin) {
    return (
      <div className="text-center py-24 bg-white rounded-3xl border border-stone-200">
        <ShieldAlert className="w-16 h-16 mx-auto text-stone-300 mb-4" />
        <h2 className="text-xl font-bold text-stone-900 mb-2">Sin acceso</h2>
        <p className="text-stone-500">Solo los super administradores pueden acceder a este panel.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 flex items-center gap-3">
          <Database className="w-8 h-8 text-indigo-600" />
          Panel de Administración
        </h1>
        <div className="flex gap-2 items-center">
          <Link to="/subjects" className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium hover:bg-indigo-200">
            <BookOpen className="w-4 h-4" /> Materias
          </Link>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold uppercase tracking-wider">
            Super Admin
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-stone-600 hover:bg-stone-100'
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white p-8 rounded-3xl shadow-sm border border-stone-200 min-h-[500px]">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-stone-900 mb-6">Resumen General</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                  <div className="text-stone-500 text-sm font-semibold uppercase tracking-wider mb-2">Usuarios Totales</div>
                  <div className="text-3xl font-bold text-stone-900">1,245</div>
                  <div className="text-emerald-600 text-sm mt-2 font-medium">+12% este mes</div>
                </div>
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                  <div className="text-stone-500 text-sm font-semibold uppercase tracking-wider mb-2">Suscripciones Premium</div>
                  <div className="text-3xl font-bold text-stone-900">342</div>
                  <div className="text-emerald-600 text-sm mt-2 font-medium">+5% este mes</div>
                </div>
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                  <div className="text-stone-500 text-sm font-semibold uppercase tracking-wider mb-2">Fallos Publicados</div>
                  <div className="text-3xl font-bold text-stone-900">85</div>
                  <div className="text-stone-400 text-sm mt-2 font-medium">En 12 materias</div>
                </div>
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                  <div className="text-stone-500 text-sm font-semibold uppercase tracking-wider mb-2">Reportes Pendientes</div>
                  <div className="text-3xl font-bold text-rose-600">4</div>
                  <div className="text-rose-600 text-sm mt-2 font-medium">Requieren atención</div>
                </div>
              </div>

              <div className="mt-12 bg-stone-50 p-8 rounded-2xl border border-stone-200 border-dashed text-center text-stone-500">
                <LayoutDashboard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Gráficos y métricas detalladas en desarrollo para la versión MVP.</p>
              </div>
            </div>
          )}

          {activeTab === 'exams' && (
            <div>
              <h2 className="text-2xl font-bold text-stone-900 mb-6">Exámenes pendientes de aprobación</h2>
              {pendingExams.length === 0 ? (
                <div className="text-center py-12 text-stone-500 bg-stone-50 rounded-2xl border border-stone-200 border-dashed">
                  <FileQuestion className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay exámenes pendientes.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500 text-sm uppercase tracking-wider">
                        <th className="py-3 px-4 font-semibold">Título</th>
                        <th className="py-3 px-4 font-semibold">Materia</th>
                        <th className="py-3 px-4 font-semibold">Subido por</th>
                        <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {pendingExams.map((ex) => (
                        <tr key={ex.id} className="border-b border-stone-100 hover:bg-stone-50">
                          <td className="py-4 px-4 font-medium text-stone-900">{ex.title}</td>
                          <td className="py-4 px-4 text-stone-500">
                            <Link to={`/subjects/${ex.subject_id}`} className="text-indigo-600 hover:underline">{ex.subject_name}</Link>
                          </td>
                          <td className="py-4 px-4 text-stone-500">{ex.uploaded_by_name}</td>
                          <td className="py-4 px-4 text-right">
                            <button onClick={() => handleApprove(ex.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg mr-1" title="Aprobar"><Check className="w-5 h-5" /></button>
                            <button onClick={() => handleReject(ex.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Rechazar"><XCircle className="w-5 h-5" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              <h2 className="text-2xl font-bold text-stone-900 mb-6">Apuntes pendientes de aprobación</h2>
              <p className="text-sm text-stone-500 mb-4">Al aprobar un apunte, se publica. Las vistas (1 punto) y votaciones &quot;Me resultó útil&quot; (2 puntos) que reciba suman para que el autor suba de tier: 500 puntos = Basic, 1000 = Pro.</p>
              {pendingNotes.length === 0 ? (
                <div className="text-center py-12 text-stone-500 bg-stone-50 rounded-2xl border border-stone-200 border-dashed">
                  <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay apuntes pendientes.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500 text-sm uppercase tracking-wider">
                        <th className="py-3 px-4 font-semibold">Título</th>
                        <th className="py-3 px-4 font-semibold">Materia</th>
                        <th className="py-3 px-4 font-semibold">Autor</th>
                        <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {pendingNotes.map((n) => (
                        <tr key={n.id} className="border-b border-stone-100 hover:bg-stone-50">
                          <td className="py-4 px-4 font-medium text-stone-900">{n.title}</td>
                          <td className="py-4 px-4 text-stone-500">
                            <Link to={`/subjects/${n.subject_id}`} className="text-indigo-600 hover:underline">{n.subject_name}</Link>
                          </td>
                          <td className="py-4 px-4 text-stone-500">{n.author_name}</td>
                          <td className="py-4 px-4 text-right">
                            <button onClick={() => handleApproveNote(n.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg mr-1" title="Aprobar"><Check className="w-5 h-5" /></button>
                            <button onClick={() => handleRejectNote(n.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Rechazar"><XCircle className="w-5 h-5" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'content' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-stone-900">Gestión de Contenido</h2>
                <Link to="/subjects" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Ir a Materias
                </Link>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 text-sm uppercase tracking-wider">
                      <th className="py-4 px-4 font-semibold">Título</th>
                      <th className="py-4 px-4 font-semibold">Tipo</th>
                      <th className="py-4 px-4 font-semibold">Materia</th>
                      <th className="py-4 px-4 font-semibold">Estado</th>
                      <th className="py-4 px-4 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                      <td className="py-4 px-4 font-medium text-stone-900">Siri, Ángel s/ recurso de hábeas corpus</td>
                      <td className="py-4 px-4 text-stone-500">Fallo</td>
                      <td className="py-4 px-4 text-stone-500">Constitucional</td>
                      <td className="py-4 px-4">
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-semibold">Publicado</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button className="text-indigo-600 hover:text-indigo-800 font-medium">Editar</button>
                      </td>
                    </tr>
                    <tr className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                      <td className="py-4 px-4 font-medium text-stone-900">Kot, Samuel s/ recurso de hábeas corpus</td>
                      <td className="py-4 px-4 text-stone-500">Fallo</td>
                      <td className="py-4 px-4 text-stone-500">Constitucional</td>
                      <td className="py-4 px-4">
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-semibold">Publicado</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button className="text-indigo-600 hover:text-indigo-800 font-medium">Editar</button>
                      </td>
                    </tr>
                    <tr className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                      <td className="py-4 px-4 font-medium text-stone-900">Nueva acordada de la CSJN</td>
                      <td className="py-4 px-4 text-stone-500">Noticia</td>
                      <td className="py-4 px-4 text-stone-500">-</td>
                      <td className="py-4 px-4">
                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs font-semibold">Borrador</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button className="text-indigo-600 hover:text-indigo-800 font-medium">Editar</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activeTab === 'users' || activeTab === 'moderation' || activeTab === 'settings') && (
            <div className="text-center py-24 text-stone-500 bg-stone-50 rounded-2xl border border-stone-200 border-dashed h-full flex flex-col items-center justify-center">
              <Settings className="w-12 h-12 mb-4 opacity-50" />
              <p>Módulo en desarrollo para la versión MVP.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
