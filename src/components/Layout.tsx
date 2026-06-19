import { Outlet } from 'react-router';
import { Header } from './Header';
import { Footer } from './Footer';
import { PrivateNotesWidget } from './PrivateNotesWidget';

export function Layout() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col">
        <Outlet />
      </main>
      <Footer />
      <PrivateNotesWidget />
    </div>
  );
}
