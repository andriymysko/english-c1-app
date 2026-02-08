import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserStats, generateReview, getCoachAnalysis } from "../api";
import { 
  BarChart, Trophy, AlertTriangle, ArrowLeft, Sparkles, Loader2, 
  Zap, Star, Brain, AlertCircle, CheckCircle, Crown, ShieldCheck, 
  User, Calendar, Clock 
} from "lucide-react";
import Flashcards from "./Flashcards"; 

// Helper per formatar dates (si tens data de caducitat a stats)
const formatDate = (dateString: any) => {
    if (!dateString) return 'Lifetime';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function Profile({ onBack, onStartReview }: { onBack: () => void, onStartReview: (data: any) => void }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // AI Coach State
  const [coachData, setCoachData] = useState<any>(null);
  const [coachLoading, setCoachLoading] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  
  const [view, setView] = useState<"stats" | "flashcards">("stats");

  useEffect(() => {
    if (user) {
      // 1. Mirem si acabem de comprar (llegim la URL)
      const query = new URLSearchParams(window.location.search);
      const isJustPurchased = query.get('success') === 'true';

      // 2. Carreguem les dades reals de la base de dades
      getUserStats(user.uid).then(data => {
        if (isJustPurchased) {
            setStats({ ...data, is_vip: true });
            window.history.replaceState({}, '', '/');
        } else {
            setStats(data);
        }
        setLoading(false);
      });

      // 3. Carreguem el Coach normalment
      getCoachAnalysis(user.uid)
        .then(data => setCoachData(data))
        .catch(err => console.error("Coach API Error:", err))
        .finally(() => setCoachLoading(false));
    }
  }, [user]);

  // --- FUNCIÓ DE PAGAMENT (STRIPE) ---
  const handleBuyPass = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/create-checkout-session/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 👇 AFEGIM 'product_type' AQUÍ
        body: JSON.stringify({ 
            user_id: user.uid,
            product_type: 'season' // O 'weekly', 'pack5' segons correspongui
        }),
      });
      
      if (!response.ok) {
          // Si el servidor ens torna un error (ex: 400), el mostrem
          const errorData = await response.json();
          alert(`Payment Error: ${errorData.detail || "Something went wrong"}`);
          return;
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url; 
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Error starting payment. Please try again.");
    }
  };

  const handleCreateReview = async () => {
    if (!user) return;
    setGenerating(true);
    setError("");
    try {
      const exercise = await generateReview(user.uid);
      onStartReview(exercise);
    } catch (err: any) {
      if (err.message === "NO_MISTAKES") {
        setError("You don't have enough mistakes yet to generate a review! Do some exercises first.");
      } else if (err.message === "DAILY_LIMIT") {
        setError("🚫 Daily limit reached for reviews.");
      } else {
        setError("Failed to generate review. Try again later.");
      }
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="p-10 text-center flex justify-center h-screen items-center"><Loader2 className="animate-spin w-10 h-10 text-blue-600" /></div>;

  if (view === "flashcards") {
    return <Flashcards onBack={() => setView("stats")} />;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-white min-h-screen animate-in fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-900 transition font-medium">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </button>

      {/* =========================================================================
          NOU HEADER: TARGETA D'ESTAT (VIP vs FREE)
         ========================================================================= */}
      
      {stats?.is_vip ? (
        // 🌟 DISSENY VIP (GOLD)
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-10 border border-gray-100 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-purple-900 to-violet-900 opacity-95"></div>
            {/* Decoració de fons */}
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Crown className="w-64 h-64 text-white -rotate-12 translate-x-20 -translate-y-20" />
            </div>
            
            <div className="relative z-10 p-8 flex flex-col md:flex-row items-center gap-8">
                {/* Avatar VIP */}
                <div className="relative">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 p-1 shadow-lg shadow-amber-500/20">
                        <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center text-4xl font-bold text-yellow-500">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-gray-900 text-yellow-400 p-2 rounded-full border-4 border-gray-800 shadow-sm">
                        <Crown className="w-5 h-5 fill-current" />
                    </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-white mb-2">{user?.email?.split('@')[0]}</h1>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <span className="bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> VIP Member
                        </span>
                        {stats.vip_expiry && (
                            <span className="text-gray-400 text-sm flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Valid until: {formatDate(stats.vip_expiry)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Status Card dins del header */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 min-w-[200px] text-center md:text-right">
                    <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">Status</p>
                    <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-400">
                        ACTIVE
                    </p>
                    <p className="text-white/60 text-xs mt-1">Unlimited Access</p>
                </div>
            </div>
        </div>
      ) : (
        // ⚪ DISSENY FREE (SILVER)
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-10 border border-slate-200 relative">
            <div className="h-32 bg-gradient-to-r from-slate-100 to-slate-200 w-full absolute top-0 left-0"></div>
            
            <div className="relative z-10 px-8 pb-8 pt-16 flex flex-col md:flex-row items-end md:items-center gap-6">
                 {/* Avatar Free */}
                 <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-md relative">
                    <div className="w-full h-full bg-slate-50 rounded-xl flex items-center justify-center text-4xl font-bold text-slate-300">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                </div>

                <div className="flex-1 mb-2">
                    <h1 className="text-3xl font-bold text-slate-800">{user?.email?.split('@')[0]}</h1>
                    <p className="text-slate-500 font-medium flex items-center gap-2">
                        Starter Plan 
                        <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full border border-slate-200">Free</span>
                    </p>
                </div>

                {/* Call to Action Upgrade */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0 shadow-sm">
                    <div className="bg-white p-3 rounded-full text-slate-400 shadow-sm border border-slate-100">
                        <User className="w-6 h-6" />
                    </div>
                    <div className="flex-1 md:mr-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Limit</p>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">3/day</span>
                            <span className="text-xs text-red-400 font-medium">(Almost full)</span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleBuyPass}
                        className="bg-gray-900 text-white px-5 py-3 rounded-xl hover:bg-black transition shadow-lg hover:shadow-xl flex flex-col items-center justify-center gap-0.5 group"
                    >
                        <div className="flex items-center gap-1">
                             <Zap className="w-4 h-4 text-yellow-400 fill-current group-hover:animate-pulse" />
                             <span className="font-bold text-sm">UPGRADE</span>
                        </div>
                        <span className="text-[9px] text-gray-400">Get Unlimited</span>
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* =========================================================================
          KPI CARDS (Estadístiques)
         ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-2 text-blue-600">
            <div className="p-2 bg-blue-100 rounded-lg"><Trophy className="w-4 h-4" /></div>
            <h3 className="font-bold text-xs uppercase tracking-wide opacity-70">Completed</h3>
          </div>
          <p className="text-3xl font-black text-blue-900">{stats?.exercises_completed || 0}</p>
        </div>
        
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-2 text-emerald-600">
             <div className="p-2 bg-emerald-100 rounded-lg"><BarChart className="w-4 h-4" /></div>
            <h3 className="font-bold text-xs uppercase tracking-wide opacity-70">Avg Score</h3>
          </div>
          <p className="text-3xl font-black text-emerald-900">{stats?.average_score || 0}%</p>
        </div>

        <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-2 text-orange-600">
            <div className="p-2 bg-orange-100 rounded-lg"><Zap className="w-4 h-4 fill-current" /></div>
            <h3 className="font-bold text-xs uppercase tracking-wide opacity-70">Streak</h3>
          </div>
          <p className="text-3xl font-black text-orange-900">{stats?.streak || 0} <span className="text-lg">days</span></p>
        </div>

        <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-2 text-indigo-600">
            <div className="p-2 bg-indigo-100 rounded-lg"><Star className="w-4 h-4 fill-current" /></div>
            <h3 className="font-bold text-xs uppercase tracking-wide opacity-70">Level</h3>
          </div>
          <p className="text-3xl font-black text-indigo-900">Lvl {stats?.level || 1}</p>
          <div className="w-full bg-indigo-200 h-1.5 mt-2 rounded-full overflow-hidden">
             <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000" style={{width: `${((stats?.xp || 0) % 500) / 5}%`}}></div>
          </div>
        </div>
      </div>

      {/* AI COACH INSIGHTS */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-purple-100 relative overflow-hidden mb-10">
        <div className="absolute top-0 right-0 p-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
            
        <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl shadow-sm">
                <Brain className="w-8 h-8" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-900">AI Coach Insights</h2>
                <p className="text-slate-500">Personalized analysis based on your performance</p>
            </div>
        </div>

        {coachLoading ? (
            <div className="flex flex-col items-center gap-4 text-purple-600 p-12 justify-center bg-purple-50/30 rounded-xl">
                <Loader2 className="animate-spin w-8 h-8" />
                <span className="font-medium animate-pulse">Analyzing your learning patterns...</span>
            </div>
        ) : coachData ? (
            <div className="space-y-8 relative z-10">
                
                {/* WEAKNESSES */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Areas for Improvement
                   </p>
                   {coachData.weaknesses && coachData.weaknesses.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                            {coachData.weaknesses.map((tag: string, i: number) => (
                                <span key={i} className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-bold flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span> {tag}
                                </span>
                            ))}
                        </div>
                   ) : (
                        <div className="text-green-600 flex items-center gap-2 font-medium">
                            <CheckCircle className="w-5 h-5" /> Great job! No major weaknesses detected yet.
                        </div>
                   )}
                </div>

                {/* ADVICE */}
                {coachData.advice && (
                    <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                           <Sparkles className="w-4 h-4" /> Strategic Advice
                        </p>
                        <p className="text-slate-700 leading-relaxed font-serif text-lg italic">
                            "{coachData.advice}"
                        </p>
                    </div>
                )}
            </div>
        ) : (
            <div className="text-center p-8 text-slate-400">
                No data available yet. Complete some exercises to activate the AI Coach.
            </div>
        )}
      </div>

      {/* TOOLS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
         {/* FLASHCARDS CARD */}
         <button 
             onClick={() => setView("flashcards")}
             className="group relative overflow-hidden bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all text-left"
         >
             <div className="absolute top-0 right-0 p-16 bg-blue-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
             <div className="relative z-10">
                 <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                     <Brain className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800 mb-1">Flashcards</h3>
                 <p className="text-slate-500 text-sm">Review your vocabulary mistakes with spaced repetition.</p>
             </div>
         </button>

         {/* EXAM GENERATOR CARD */}
         <button 
             onClick={handleCreateReview}
             disabled={generating || stats?.mistakes_pool?.length === 0}
             className="group relative overflow-hidden bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
         >
             <div className="absolute top-0 right-0 p-16 bg-purple-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
             <div className="relative z-10">
                 <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                     {generating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Clock className="w-6 h-6" />}
                 </div>
                 <h3 className="text-xl font-bold text-slate-800 mb-1">Mistakes Exam</h3>
                 <p className="text-slate-500 text-sm">Generate a custom exam based ONLY on your past errors.</p>
                 {error && <p className="text-red-500 text-xs mt-2 font-bold">{error}</p>}
             </div>
         </button>
      </div>

      {/* MISTAKES LOG */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gray-50/80 p-5 border-b border-gray-200 flex justify-between items-center backdrop-blur-sm">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Recent Mistakes Log
          </h3>
          <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-500 border border-gray-200 shadow-sm">
            {stats?.mistakes_pool?.length || 0} items
          </span>
        </div>
        
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto bg-white">
          {!stats?.mistakes_pool || stats.mistakes_pool.length === 0 ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-3">
              <CheckCircle className="w-12 h-12 opacity-20" />
              <p>Clean sheet! No mistakes recorded yet.</p>
            </div>
          ) : (
            stats.mistakes_pool.map((m: any, idx: number) => (
              <div key={idx} className="p-5 hover:bg-slate-50 transition group">
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider border border-slate-100 px-2 py-0.5 rounded bg-slate-50">{m.type}</span>
                </div>
                <p className="font-medium text-slate-800 mb-3 leading-relaxed">
                    {m.stem || m.question}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex flex-col">
                    <span className="text-[10px] uppercase text-red-400 font-bold mb-1">Your Answer</span>
                    <strong className="text-red-700 break-words">{m.user_answer}</strong>
                  </div>
                  <div className="bg-green-50 border border-green-100 p-3 rounded-lg flex flex-col">
                    <span className="text-[10px] uppercase text-green-400 font-bold mb-1">Correct Answer</span>
                    <strong className="text-green-700 break-words">{m.correct_answer}</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}