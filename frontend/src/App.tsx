import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import ExerciseGenerator from './components/ExerciseGenerator'; // El teu Dashboard
import Landing from './components/Landing';
import Legal from './components/Legal'; // <--- Necessari per les pàgines legals
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  
  // Gestionem quina vista es mostra quan no estem loguejats
  const [view, setView] = useState<'landing' | 'login' | 'privacy' | 'terms'>('landing');

  // 1. Pantalla de càrrega inicial (mentre Firebase comprova si estem loguejats)
  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  // 2. Si l'usuari ja està loguejat -> DASHBOARD (L'App Principal)
  if (user) {
    return <ExerciseGenerator />;
  }

  // 3. Si vol fer Login -> FORMULARI
  if (view === 'login') {
    return <Login onBack={() => setView('landing')} />;
  }

  // 4. Si vol veure pàgines legals (Requisit Stripe)
  if (view === 'privacy') return <Legal type="privacy" onBack={() => setView('landing')} />;
  if (view === 'terms') return <Legal type="terms" onBack={() => setView('landing')} />;

  // 5. Per defecte -> LANDING PAGE
  return (
    <Landing 
      onGetStarted={() => setView('login')} 
      onShowLegal={(type) => setView(type)} // Connectem el footer
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}