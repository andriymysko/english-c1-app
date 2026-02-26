import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen'; // 👈 NOU COMPONENT D'AUTENTICACIÓ
import ExerciseGenerator from './components/ExerciseGenerator'; 
import Landing from './components/Landing';
import Legal from './components/Legal';
import ExtrasPage from './components/ExtrasPage'; 
import { Loader2 } from 'lucide-react';
import VocabularyDeck from './components/VocabularyDeck';

function AppContent() {
  const { user, loading } = useAuth();
  
  const [publicView, setPublicView] = useState<'landing' | 'login' | 'privacy' | 'terms'>('landing');
  const [privateView, setPrivateView] = useState<'generator' | 'extras' | 'vocabulary'>('generator');

  // --- LOADING (Actualitzat amb la paleta Ethernals) ---
  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-stone-50">
      <Loader2 className="w-10 h-10 animate-spin text-slate-900" />
    </div>
  );

  // --- 1. USUARI TOTALMENT AUTORITZAT I VERIFICAT (ZONA PRIVADA) ---
  if (user && user.emailVerified) {
    if (privateView === 'extras') {
      return <ExtrasPage onBack={() => setPrivateView('generator')} />;
    }

    if (privateView === 'vocabulary') {
      return <VocabularyDeck onBack={() => setPrivateView('generator')} />;
    }

    return (
        <ExerciseGenerator 
            onOpenExtras={() => setPrivateView('extras')} 
            onOpenVocabulary={() => setPrivateView('vocabulary')}
        />
    );
  }

  // --- 2. GESTIÓ D'AUTENTICACIÓ I VERIFICACIÓ ---
  // Si volen fer login OR si tenen compte però NO l'han verificat
  if (publicView === 'login' || (user && !user.emailVerified)) {
    return (
        <AuthScreen 
            onBack={() => setPublicView('landing')} 
            onShowLegal={(type) => setPublicView(type)}
        />
    );
  }

  // --- 3. USUARI NO LOGUEJAT (ZONA PÚBLICA) ---
  if (publicView === 'privacy') return <Legal type="privacy" onBack={() => setPublicView('landing')} />;
  if (publicView === 'terms') return <Legal type="terms" onBack={() => setPublicView('landing')} />;

  // Per defecte -> LANDING PAGE
  return (
    <Landing 
      onGetStarted={() => setPublicView('login')} 
      onShowLegal={(type) => setPublicView(type)} 
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}