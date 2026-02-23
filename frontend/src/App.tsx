import { useState } from 'react';
// 👇 1. IMPORTA BrowserRouter
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import ExerciseGenerator from './components/ExerciseGenerator'; 
import Landing from './components/Landing';
import Legal from './components/Legal';
import ExtrasPage from './components/ExtrasPage'; 
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  
  // Estat per a la navegació PÚBLICA (No loguejat)
  const [publicView, setPublicView] = useState<'landing' | 'login' | 'privacy' | 'terms'>('landing');

  // LÒGICA ACTUALITZADA: Afegim 'vocabulary' a les vistes permeses
  const [privateView, setPrivateView] = useState<'generator' | 'extras' | 'vocabulary'>('generator');

  // --- LOADING ---
  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  // --- USUARI LOGUEJAT (ZONA PRIVADA) ---
  if (user) {
    if (privateView === 'extras') {
      return <ExtrasPage onBack={() => setPrivateView('generator')} />;
    }

    // LÒGICA ACTUALITZADA: Renderitzem la baralla de vocabulari si l'estat coincideix
    if (privateView === 'vocabulary') {
      return <VocabularyDeck onBack={() => setPrivateView('generator')} />;
    }

    // LÒGICA ACTUALITZADA: Passem una nova prop 'onOpenVocabulary' al generador
    return (
        <ExerciseGenerator 
            onOpenExtras={() => setPrivateView('extras')} 
            onOpenVocabulary={() => setPrivateView('vocabulary')}
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
    // 👇 2. AFEGEIX AQUEST EMBOLCALL (Router)
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}