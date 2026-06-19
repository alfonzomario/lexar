import { BrowserRouter, Routes, Route, Link } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Subjects } from './pages/Subjects';
import { SubjectDetail } from './pages/SubjectDetail';
import { Briefs } from './pages/Briefs';
import { BriefDetail } from './pages/BriefDetail';
import { Latinisms } from './pages/Latinisms';
import { Calculator } from './pages/Calculator';
import { Admin } from './pages/Admin';
import { Pricing } from './pages/Pricing';
import { Jobs } from './pages/Jobs';
import { Notes } from './pages/Notes';
import { MyNotes } from './pages/MyNotes';
import { Chat } from './pages/Chat';
import { Articles } from './pages/Articles';
import { Universities } from './pages/Universities';
import { UniversityDetail } from './pages/UniversityDetail';
import { Movies } from './pages/Movies';
import { Forum } from './pages/Forum';
import { SavedForLater } from './pages/SavedForLater';
import { Simulacro } from './pages/Simulacro';
import { Normativa } from './pages/Normativa';
import { NormaDetail } from './pages/NormaDetail';
import { Profile } from './pages/Profile';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { AuthProvider } from './contexts/AuthContext';
import { ScrollToTop } from './components/ScrollToTop';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AlertOctagon } from 'lucide-react';

function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 font-sans text-center">
      <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-8 shadow-lg">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-100">
          <AlertOctagon className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Página no encontrada</h2>
        <p className="text-stone-500 text-sm mb-6 leading-relaxed">
          Lo sentimos, la página que estás buscando no existe o ha sido movida.
        </p>
        <Link
          to="/"
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors shadow-md cursor-pointer"
        >
          Ir al Inicio
        </Link>
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="subjects/:id" element={<SubjectDetail />} />
            <Route path="briefs" element={<Briefs />} />
            <Route path="briefs/:id" element={<BriefDetail />} />
            <Route path="latinisms" element={<Latinisms />} />
            <Route path="calculator" element={<Calculator />} />
            <Route path="admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="notes" element={<Notes />} />
            <Route path="chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="articles" element={<Articles />} />
            <Route path="universities" element={<Universities />} />
            <Route path="universities/:uniId" element={<UniversityDetail />} />
            <Route path="movies" element={<Movies />} />
            <Route path="normativa" element={<Normativa />} />
            <Route path="normativa/:id" element={<NormaDetail />} />
            <Route path="forum" element={<Forum />} />
            <Route path="saved" element={<ProtectedRoute><SavedForLater /></ProtectedRoute>} />
            <Route path="simulacro" element={<Simulacro />} />
            <Route path="simulacro/:subjectId" element={<Simulacro />} />
            <Route path="my-notes" element={<ProtectedRoute><MyNotes /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="terms" element={<Terms />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
