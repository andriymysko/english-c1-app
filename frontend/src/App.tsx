import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import ExerciseGenerator from './components/ExerciseGenerator'; 
import Landing from './components/Landing';
import Legal from './components/Legal';
import ExtrasPage from './components/ExtrasPage'; // <--- 1. IMPORTA EL NOU COMPONENT
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  
  // Estat per a la navegació PÚBLICA (No loguejat)
  const [publicView, setPublicView] = useState<'landing' | 'login' | 'privacy' | 'terms'>('landing');

  // 2. Estat per a la navegació PRIVADA (Loguejat)
  const [privateView, setPrivateView] = useState<'generator' | 'extras'>('generator');

  // --- LOADING ---
  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  // --- USUARI LOGUEJAT (ZONA PRIVADA) ---
  if (user) {
    // Si l'usuari ha triat anar a Extras, mostrem la pàgina d'Extras
    if (privateView === 'extras') {
      return <ExtrasPage onBack={() => setPrivateView('generator')} />;
    }

    // Si no, mostrem el Generador (Dashboard)
    // Passem la funció 'onOpenExtras' perquè puguis posar el botó al menú
    return (
        <ExerciseGenerator 
            onOpenExtras={() => setPrivateView('extras')} 
        />
    );
  }

  // --- USUARI NO LOGUEJAT (ZONA PÚBLICA) ---

  if (publicView === 'login') {
    return <Login onBack={() => setPublicView('landing')} />;
  }

  if (publicView === 'privacy') return <Legal type="privacy" onBack={() => setPublicView('landing')} />;
  if (publicView === 'terms') return <Legal type="terms" onBack={() => setPublicView('landing')} />;

  // Per defecte -> LANDING
  return (
    <Landing 
      onGetStarted={() => setPublicView('login')} 
      onShowLegal={(type) => setPublicView(type)} 
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