import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import ExerciseGenerator from './components/ExerciseGenerator'; 
import Landing from './components/Landing';
import Legal from './components/Legal';
import ExtrasPage from './components/ExtrasPage'; 
import VocabularyDeck from './components/VocabularyDeck';
import Onboarding from './components/Onboarding'; // 👈 IMPORTEM L'ONBOARDING
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  
  const [publicView, setPublicView] = useState<'landing' | 'login' | 'privacy' | 'terms'>('landing');
  const [privateView, setPrivateView] = useState<'generator' | 'extras' | 'vocabulary'>('generator');
  
  // 👈 ESTAT PER CONTROLAR L'ONBOARDING
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Quan l'usuari carrega, avaluem si és totalment nou
  useEffect(() => {
    if (user && user.emailVerified) {
      // Si no té la variable o és 0, és un usuari verge.
      const completed = user.exercises_completed || 0;
      if (completed === 0) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    }
  }, [user]);

  // --- LOADING ---
  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-stone-50">
      <Loader2 className="w-10 h-10 animate-spin text-slate-900" />
    </div>
  );

  // --- 1. USUARI TOTALMENT AUTORITZAT I VERIFICAT (ZONA PRIVADA) ---
  if (user && user.emailVerified) {
    
    // 👈 INTERCEPTOR D'ONBOARDING
    if (showOnboarding) {
        return <Onboarding onComplete={() => setShowOnboarding(false)} />;
    }

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