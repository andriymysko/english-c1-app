import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft, Mail, Lock, AlertCircle, CheckCircle, Chrome } from 'lucide-react';

interface Props {
  onBack: () => void;
  onShowLegal: (type: 'privacy' | 'terms') => void;
}

export default function AuthScreen({ onBack, onShowLegal }: Props) {
  const { user, login, signup, loginWithGoogle, resetPassword, verifyEmail, logout } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Si l'usuari ja existeix a Firebase però no ha verificat el correu, forcem la pantalla de verificació
  useEffect(() => {
      if (user && !user.emailVerified) {
          setMode('verify');
      }
  }, [user]);

  const handleGoogleAuth = async () => {
    if (mode === 'signup' && !termsAccepted) {
        setError('You must accept the terms to create an account.');
        return;
    }
    setLoading(true); setError('');
    try {
      await loginWithGoogle();
      // Google ja verifica els emails automàticament, així que entrarà directe
    } catch (err: any) {
      setError(err.message.replace("Firebase:", "").trim());
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);

    try {
      if (mode === 'signup') {
        if (!termsAccepted) throw new Error("Please accept the Terms of Service.");
        const credential = await signup(email, password);
        await verifyEmail(credential.user);
        setMode('verify');
      } 
      else if (mode === 'login') {
        const credential = await login(email, password);
        if (!credential.user.emailVerified) {
            await verifyEmail(credential.user);
            setMode('verify');
        }
      } 
      else if (mode === 'reset') {
        await resetPassword(email);
        setMessage('Password reset link sent! Check your inbox.');
        setTimeout(() => setMode('login'), 4000);
      }
    } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') setError('This email is already registered.');
        else if (err.code === 'auth/weak-password') setError('Password must be at least 6 characters.');
        else if (err.code === 'auth/invalid-credential') setError('Invalid email or password.');
        else setError(err.message.replace("Firebase:", "").trim());
    } finally {
        setLoading(false);
    }
  };

  const handleSignOut = async () => {
      await logout();
      setMode('login');
      setEmail('');
      setPassword('');
  };

  // --- PANTALLA DE VERIFICACIÓ ---
  if (mode === 'verify') {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 selection:bg-stone-200">
            <div className="bg-white p-10 md:p-14 rounded-sm shadow-sm border border-stone-200 max-w-lg w-full text-center animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 bg-stone-100 rounded-sm flex items-center justify-center mx-auto mb-8"><Mail className="w-10 h-10 text-slate-900" /></div>
                <h2 className="text-3xl font-serif font-black text-slate-900 mb-4">Verify your email</h2>
                <p className="text-stone-500 font-medium leading-relaxed mb-8">
                    We've sent a secure verification link to <strong>{user?.email || email}</strong>. Check your inbox and click the link to activate your access.
                </p>
                <div className="flex flex-col gap-4">
                    <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-sm hover:bg-slate-800 transition-colors shadow-md">
                        I have verified my email
                    </button>
                    <button onClick={handleSignOut} className="w-full py-4 bg-white text-slate-900 border border-stone-200 font-bold uppercase tracking-widest text-xs rounded-sm hover:bg-stone-50 transition-colors">
                        Use a different account
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- PANTALLA DE LOGIN/SIGNUP/RESET ---
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 selection:bg-stone-200 relative">
      <button onClick={onBack} className="absolute top-8 left-8 flex items-center gap-2 text-stone-500 hover:text-slate-900 transition-colors font-bold uppercase tracking-widest text-xs z-10">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="w-full max-w-md bg-white p-8 md:p-12 rounded-sm shadow-xl border border-stone-200 animate-in fade-in slide-in-from-bottom-4 relative z-10">
        <div className="text-center mb-10">
            <div className="w-12 h-12 bg-slate-900 rounded-sm flex items-center justify-center text-white shadow-sm mx-auto mb-6"><span className="font-serif font-black text-xl">C1</span></div>
            <h2 className="text-3xl font-serif font-black text-slate-900 mb-2">{mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Establish Baseline' : 'Reset Password'}</h2>
            <p className="text-stone-500 text-sm font-medium">{mode === 'login' ? 'Enter your credentials to access the simulator.' : mode === 'signup' ? 'Create your profile to start tracking weaknesses.' : 'We will send you a secure reset link.'}</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm flex items-start gap-3 text-red-800 animate-in fade-in"><AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /><p className="text-sm font-medium">{error}</p></div>}
        {message && <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-sm flex items-start gap-3 text-green-800 animate-in fade-in"><CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /><p className="text-sm font-medium">{message}</p></div>}

        <form onSubmit={handleAuthSubmit} className="space-y-6">
            <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-sm outline-none focus:border-slate-900 focus:bg-white transition-colors text-slate-900 font-medium" placeholder="candidate@example.com" />
                </div>
            </div>

            {mode !== 'reset' && (
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest">Password</label>
                        {mode === 'login' && <button type="button" onClick={() => {setMode('reset'); setError('');}} className="text-[10px] font-bold text-stone-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Forgot?</button>}
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-sm outline-none focus:border-slate-900 focus:bg-white transition-colors text-slate-900 font-medium" placeholder="••••••••" />
                    </div>
                </div>
            )}

            {mode === 'signup' && (
                <div className="flex items-start gap-3 bg-stone-50 p-4 border border-stone-200 rounded-sm">
                    <input type="checkbox" id="terms" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 w-4 h-4 accent-slate-900 cursor-pointer" />
                    <label htmlFor="terms" className="text-xs text-stone-500 font-medium leading-relaxed">
                        I consent to the collection of my diagnostic data and accept the <button type="button" onClick={() => onShowLegal('terms')} className="text-slate-900 font-bold hover:underline">Terms of Service</button> and <button type="button" onClick={() => onShowLegal('privacy')} className="text-slate-900 font-bold hover:underline">Privacy Policy</button>.
                    </label>
                </div>
            )}

            <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-sm hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? 'Access Console' : mode === 'signup' ? 'Initialize Profile' : 'Send Reset Link'}
            </button>
        </form>

        {mode !== 'reset' && (
            <>
                <div className="flex items-center gap-4 my-8">
                    <div className="h-px bg-stone-200 flex-1"></div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Or strictly via</span>
                    <div className="h-px bg-stone-200 flex-1"></div>
                </div>
                <button onClick={handleGoogleAuth} type="button" className="w-full py-4 bg-white border border-stone-200 text-slate-900 font-bold uppercase tracking-widest text-xs rounded-sm hover:bg-stone-50 transition-colors flex items-center justify-center gap-3 shadow-sm">
                    <Chrome className="w-4 h-4" /> Continue with Google
                </button>
            </>
        )}

        <div className="mt-10 text-center">
            <p className="text-xs text-stone-500 font-medium">
                {mode === 'login' ? "Don't have clearance yet?" : mode === 'signup' ? "Already have a profile?" : "Remembered your credentials?"}{' '}
                <button onClick={() => {setMode(mode === 'login' ? 'signup' : 'login'); setError('');}} className="text-slate-900 font-black uppercase tracking-widest ml-1 hover:underline">
                    {mode === 'login' ? 'Create Account' : 'Log In'}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
}