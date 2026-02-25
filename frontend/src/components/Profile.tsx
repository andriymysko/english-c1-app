import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserStats, generateReview, getCoachAnalysis } from "../api";
import { 
  BarChart, Trophy, AlertTriangle, ArrowLeft, Sparkles, Loader2, 
  Zap, Star, Brain, AlertCircle, CheckCircle, Crown, ShieldCheck, 
  Calendar, Target
} from "lucide-react";

// Helper per formatar dates
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

  useEffect(() => {
    if (user) {
      const query = new URLSearchParams(window.location.search);
      const isJustPurchased = query.get('success') === 'true';

      getUserStats(user.uid).then(data => {
        if (isJustPurchased) {
            setStats({ ...data, is_vip: true });
            alert("Payment Successful! Welcome to VIP 🌟");
            window.history.replaceState({}, '', '/');
        } else {
            setStats(data);
        }
        setLoading(false);
      });

      getCoachAnalysis(user.uid)
        .then(data => setCoachData(data))
        .catch(err => console.error("Coach API Error:", err))
        .finally(() => setCoachLoading(false));
    }
  }, [user]);

  const handleBuyPass = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payment/create-checkout-session/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            user_id: user.uid,
            product_type: 'season' 
        }),
      });
      
      if (!response.ok) {
          const errorData = await response.json();
          alert(`Payment Error: ${errorData.detail || "Something went wrong"}`);
          return;
      }
      const data = await response.json();
      if (data.url) window.location.href = data.url; 
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
        setError("Insufficient data: You need more logged mistakes to generate a diagnostic exam.");
      } else if (err.message === "DAILY_LIMIT") {
        setError("Limit reached: Upgrade to VIP for unlimited diagnostic exams.");
      } else {
        setError("System Error: Failed to generate diagnostic exam. Try again later.");
      }
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="p-10 text-center flex justify-center h-screen items-center bg-stone-50"><Loader2 className="animate-spin w-10 h-10 text-slate-900" /></div>;

  // Agafem només els últims 5 errors (assumint que s'afegeixen al final del array)
  const recentMistakes = stats?.mistakes_pool ? [...stats.mistakes_pool].slice(-5).reverse() : [];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-stone-50 min-h-screen animate-in fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-stone-500 mb-8 hover:text-slate-900 transition font-bold uppercase tracking-widest text-sm">
        <ArrowLeft className="w-5 h-5" /> Dashboard
      </button>

      {/* --- HEADER VIP vs FREE --- */}
      {stats?.is_vip ? (
        <div className="bg-slate-900 rounded-sm shadow-md overflow-hidden mb-10 border border-slate-800 relative group flex flex-col md:flex-row items-center justify-between p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center gap-8 z-10">
                <div className="relative">
                    <div className="w-24 h-24 bg-stone-100 p-1 shadow-sm rounded-sm">
                        <div className="w-full h-full bg-white flex items-center justify-center text-4xl font-serif font-black text-slate-900">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-serif font-black text-white mb-3">{user?.email?.split('@')[0]}</h1>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <span className="bg-stone-800 text-stone-300 border border-stone-700 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5" /> VIP Member
                        </span>
                        {stats.vip_expiry && (
                            <span className="text-stone-500 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" /> Valid until: {formatDate(stats.vip_expiry)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-8 md:mt-0 bg-slate-800 border border-slate-700 rounded-sm p-5 min-w-[200px] text-center md:text-right z-10">
                <p className="text-stone-400 text-[10px] uppercase font-bold tracking-widest mb-1">Status</p>
                <p className="text-2xl font-serif font-black text-white tracking-wide">ACTIVE</p>
                <p className="text-stone-500 text-xs mt-1 uppercase tracking-wider">Unlimited Access</p>
            </div>
        </div>
      ) : (
        <div className="bg-white rounded-sm shadow-sm overflow-hidden mb-10 border border-stone-200 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between">
            <div className="flex flex-col md:flex-row items-center gap-8">
                 <div className="w-20 h-20 bg-stone-100 p-1 shadow-sm rounded-sm">
                    <div className="w-full h-full bg-stone-200 flex items-center justify-center text-3xl font-serif font-black text-stone-500">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                </div>
                <div className="text-center md:text-left mb-2 md:mb-0">
                    <h1 className="text-3xl font-serif font-black text-slate-900 mb-2">{user?.email?.split('@')[0]}</h1>
                    <p className="text-stone-500 text-sm font-bold uppercase tracking-wider flex items-center justify-center md:justify-start gap-2">
                        Starter Plan 
                        <span className="bg-stone-100 text-stone-400 px-2 py-0.5 rounded-sm border border-stone-200">Free</span>
                    </p>
                </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-4 mt-6 md:mt-0">
                <div className="flex items-center gap-4">
                    <div className="text-center md:text-right">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Current Limit</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="font-serif font-bold text-lg text-slate-900">3/day</span>
                            <span className="text-xs text-stone-500 font-medium">(Standard)</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={handleBuyPass}
                    className="bg-slate-900 text-white px-8 py-3 rounded-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                    <Crown className="w-4 h-4 text-stone-300" />
                    <span className="font-bold text-xs uppercase tracking-widest">Upgrade to VIP</span>
                </button>
            </div>
        </div>
      )}

      {/* --- KPI CARDS --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-6 rounded-sm border border-stone-200 hover:border-slate-900 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[10px] text-stone-400 uppercase tracking-widest">Completed</h3>
            <Trophy className="w-4 h-4 text-stone-300" />
          </div>
          <p className="text-4xl font-serif font-black text-slate-900">{stats?.exercises_completed || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-sm border border-stone-200 hover:border-slate-900 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[10px] text-stone-400 uppercase tracking-widest">Avg Score</h3>
            <BarChart className="w-4 h-4 text-stone-300" />
          </div>
          <p className="text-4xl font-serif font-black text-slate-900">{stats?.average_score || 0}%</p>
        </div>
        <div className="bg-white p-6 rounded-sm border border-stone-200 hover:border-slate-900 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[10px] text-stone-400 uppercase tracking-widest">Streak</h3>
            <Zap className="w-4 h-4 text-stone-300" />
          </div>
          <p className="text-4xl font-serif font-black text-slate-900">{stats?.streak || 0} <span className="text-sm font-sans font-bold text-stone-400 tracking-widest uppercase">days</span></p>
        </div>
        <div className="bg-white p-6 rounded-sm border border-stone-200 hover:border-slate-900 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[10px] text-stone-400 uppercase tracking-widest">Level</h3>
                <Star className="w-4 h-4 text-stone-300" />
            </div>
            <p className="text-4xl font-serif font-black text-slate-900">Lvl {stats?.level || 1}</p>
          </div>
          <div className="w-full bg-stone-100 h-1 mt-4 rounded-sm overflow-hidden">
             <div className="bg-slate-900 h-full transition-all duration-1000" style={{width: `${((stats?.xp || 0) % 500) / 5}%`}}></div>
          </div>
        </div>
      </div>

      {/* --- AI COACH INSIGHTS --- */}
      <div className="bg-white rounded-sm p-8 shadow-sm border border-stone-200 mb-10">
        <div className="flex items-center gap-4 mb-8 border-b border-stone-100 pb-6">
            <div className="p-3 bg-stone-50 border border-stone-200 text-slate-900 rounded-sm">
                <Brain className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-xl font-serif font-black text-slate-900">AI Coach Evaluation</h2>
                <p className="text-stone-500 text-sm mt-1">Algorithmic performance analysis</p>
            </div>
        </div>
        {coachLoading ? (
            <div className="flex flex-col items-center gap-4 text-slate-900 py-12 justify-center">
                <Loader2 className="animate-spin w-6 h-6 text-stone-300" />
                <span className="font-bold text-xs uppercase tracking-widest text-stone-400">Processing data...</span>
            </div>
        ) : coachData ? (
            <div className="space-y-6">
                <div className="p-6 bg-stone-50 border border-stone-100 rounded-sm">
                   <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5" /> Identified Weaknesses
                   </p>
                   {coachData.weaknesses && coachData.weaknesses.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {coachData.weaknesses.map((tag: string, i: number) => (
                                <span key={i} className="px-3 py-1 bg-white border border-stone-200 text-slate-900 rounded-sm text-xs font-bold uppercase tracking-wider">
                                    {tag}
                                </span>
                            ))}
                        </div>
                   ) : (
                        <div className="text-slate-900 flex items-center gap-2 font-serif text-lg">
                            <CheckCircle className="w-5 h-5 text-stone-300" /> Profiling optimal. No structural weaknesses detected.
                        </div>
                   )}
                </div>
                {coachData.advice && (
                    <div className="p-8 border-l-4 border-slate-900 bg-white shadow-sm">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <Sparkles className="w-3.5 h-3.5" /> Strategic Directive
                        </p>
                        <p className="text-slate-900 leading-relaxed font-serif text-xl italic">
                            "{coachData.advice}"
                        </p>
                    </div>
                )}
            </div>
        ) : (
            <div className="text-center py-12 text-stone-400 text-sm font-medium">
                Insufficient data. Complete diagnostic exercises to initialize the AI Coach.
            </div>
        )}
      </div>

      {/* --- MISTAKES EXAM (HERO CTA) --- */}
      <div className="bg-slate-900 rounded-sm p-8 md:p-10 shadow-md border border-slate-800 mb-10 flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-32 bg-slate-800/50 rounded-full blur-3xl pointer-events-none" />
         
         <div className="flex items-start gap-6 relative z-10">
             <div className="w-14 h-14 bg-slate-800 border border-slate-700 text-white rounded-sm flex items-center justify-center shrink-0">
                 {generating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Target className="w-6 h-6" />}
             </div>
             <div>
                 <h3 className="text-2xl font-serif font-black text-white mb-2">Targeted Diagnostic Exam</h3>
                 <p className="text-stone-400 text-sm leading-relaxed max-w-xl">
                     Our AI will generate a custom C1 simulation built exclusively around the grammatical structures and vocabulary you've failed in the past. Prove you've mastered your weak points.
                 </p>
                 {error && <p className="text-red-400 text-xs mt-3 font-bold uppercase tracking-widest border border-red-900/50 bg-red-900/20 px-3 py-1.5 rounded-sm inline-block">{error}</p>}
             </div>
         </div>

         <button 
             onClick={handleCreateReview}
             disabled={generating || !stats?.mistakes_pool || stats?.mistakes_pool.length === 0}
             className="w-full lg:w-auto px-8 py-4 bg-white text-slate-900 font-black uppercase tracking-widest text-xs rounded-sm hover:bg-stone-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shrink-0 relative z-10 shadow-sm"
         >
             {generating ? "Generating Exam..." : "Start Diagnostic"}
         </button>
      </div>

      {/* --- RECENT MISTAKES LOG (ONLY LAST 5) --- */}
      <div className="bg-white border border-stone-200 rounded-sm shadow-sm overflow-hidden mb-12">
        <div className="bg-stone-50 p-6 border-b border-stone-200 flex justify-between items-center">
          <h3 className="font-serif font-black text-lg text-slate-900 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-stone-400" />
            Recent Error Activity
          </h3>
          <span className="bg-white px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest text-stone-500 border border-stone-200 shadow-sm">
            Showing last {recentMistakes.length} entries
          </span>
        </div>
        
        <div className="divide-y divide-stone-100 max-h-[500px] overflow-y-auto bg-white">
          {recentMistakes.length === 0 ? (
            <div className="py-16 text-center text-stone-400 flex flex-col items-center gap-4">
              <CheckCircle className="w-8 h-8 text-stone-300" />
              <p className="font-medium text-sm">Repository clean. No errors logged yet.</p>
            </div>
          ) : (
            recentMistakes.map((m: any, idx: number) => (
              <div key={idx} className="p-6 hover:bg-stone-50 transition-colors group">
                <div className="flex justify-between mb-3">
                  <span className="text-[9px] font-bold uppercase text-stone-400 tracking-widest border border-stone-200 px-2 py-1 rounded-sm bg-white">{m.type}</span>
                </div>
                <p className="font-serif text-lg text-slate-900 mb-4 leading-relaxed">
                    {m.stem || m.question}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white border border-stone-200 p-4 rounded-sm flex flex-col shadow-sm">
                    <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-2">Input Submitted</span>
                    <strong className="text-slate-900 font-serif text-lg break-words">{m.user_answer}</strong>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-sm flex flex-col shadow-sm">
                    <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-2">Correct Output</span>
                    <strong className="text-white font-serif text-lg break-words">{m.correct_answer}</strong>
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