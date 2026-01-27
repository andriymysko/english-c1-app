import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft, Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';

// 1. Definim la interfície per a les Props
interface LoginProps {
  onBack?: () => void; // És opcional (?) per si el fas servir en altres llocs sense botó back
}

export default function Login({ onBack }: LoginProps) {
  const { login, signup, loginWithGoogle } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err: any) {
      setError(err.message.replace("Firebase:", "").trim());
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      setError("Failed to login with Google.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* HEADER AMB BOTÓ BACK */}
        <div className="px-8 pt-8 pb-4 relative">
            {onBack && (
                <button 
                    onClick={onBack}
                    className="absolute top-8 left-6 text-slate-400 hover:text-slate-800 transition p-2 rounded-full hover:bg-slate-50"
                    title="Back to Home"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
            )}
            <div className="text-center mt-4">
                <h2 className="text-3xl font-extrabold text-slate-900">
                    {isLogin ? "Welcome Back" : "Create Account"}
                </h2>
                <p className="text-slate-500 mt-2 text-sm">
                    {isLogin ? "Enter your credentials to access your workspace." : "Start your journey to C1 mastery today."}
                </p>
            </div>
        </div>

        {/* FORM */}
        <div className="p-8 pt-2">
            
          {/* GOOGLE BUTTON */}
          <button 
            onClick={handleGoogle}
            className="w-full py-3 px-4 border border-slate-200 rounded-xl flex items-center justify-center gap-3 text-slate-700 font-bold hover:bg-slate-50 transition mb-6"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">Or continue with email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1 ml-1">Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                        type="email" 
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1 ml-1">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                        type="password" 
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : (isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
                {isLogin ? "Log In" : "Sign Up"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button 
                    onClick={() => setIsLogin(!isLogin)} 
                    className="text-blue-600 font-bold hover:underline"
                >
                    {isLogin ? "Sign Up" : "Log In"}
                </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}