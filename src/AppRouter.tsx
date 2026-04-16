import { BrowserRouter, Routes, Route } from 'react-router';
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
import { AuthProvider } from './contexts/AuthContext';

export function AppRouter() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="subjects/:id" element={<SubjectDetail />} />
            <Route path="briefs" element={<Briefs />} />
            <Route path="briefs/:id" element={<BriefDetail />} />
            <Route path="latinisms" element={<Latinisms />} />
            <Route path="calculator" element={<Calculator />} />
            <Route path="admin" element={<Admin />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="notes" element={<Notes />} />
            <Route path="chat" element={<Chat />} />
            <Route path="articles" element={<Articles />} />
            <Route path="universities" element={<Universities />} />
            <Route path="universities/:uniId" element={<UniversityDetail />} />
            <Route path="movies" element={<Movies />} />
            <Route path="normativa" element={<Normativa />} />
            <Route path="normativa/:id" element={<NormaDetail />} />
            <Route path="forum" element={<Forum />} />
            <Route path="saved" element={<SavedForLater />} />
            <Route path="simulacro" element={<Simulacro />} />
            <Route path="simulacro/:subjectId" element={<Simulacro />} />
            <Route path="my-notes" element={<MyNotes />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
