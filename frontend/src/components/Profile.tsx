import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserStats, generateReview, getCoachAnalysis } from "../api"; // Added getCoachAnalysis
import { BarChart, Trophy, AlertTriangle, ArrowLeft, Sparkles, Loader2, Zap, Star, Brain, AlertCircle } from "lucide-react";
import Flashcards from "./Flashcards"; 

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
      // 1. Load Stats
      getUserStats(user.uid).then(data => {
        setStats(data);
        setLoading(false);
      });

      // 2. Load AI Coach Analysis
      getCoachAnalysis(user.uid)
        .then(data => setCoachData(data))
        .catch(err => console.error("Coach API Error:", err))
        .finally(() => setCoachLoading(false));
    }
  }, [user]);

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

  if (loading) return <div className="p-10 text-center flex justify-center"><Loader2 className="animate-spin" /></div>;

  if (view === "flashcards") {
    return <Flashcards onBack={() => setView("stats")} />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen animate-in fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 mb-6 hover:text-gray-900 transition">
        <ArrowLeft className="w-5 h-5" /> Back to Exercises
      </button>

      <h1 className="text-3xl font-bold mb-2">Your Progress</h1>
      <p className="text-gray-500 mb-8">Keep track of your performance and learn from mistakes.</p>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
          <div className="flex items-center gap-2 mb-1 text-blue-600">
            <Trophy className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase">Done</h3>
          </div>
          <p className="text-2xl font-extrabold text-blue-900">{stats.exercises_completed}</p>
        </div>
        
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
          <div className="flex items-center gap-2 mb-1 text-emerald-600">
            <BarChart className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase">Avg Score</h3>
          </div>
          <p className="text-2xl font-extrabold text-emerald-900">{stats.average_score}%</p>
        </div>

        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
          <div className="flex items-center gap-2 mb-1 text-orange-600">
            <Zap className="w-5 h-5 fill-current" />
            <h3 className="font-bold text-sm uppercase">Day Streak</h3>
          </div>
          <p className="text-2xl font-extrabold text-orange-900">{stats.streak || 0} 🔥</p>
        </div>

        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
          <div className="flex items-center gap-2 mb-1 text-indigo-600">
            <Star className="w-5 h-5 fill-current" />
            <h3 className="font-bold text-sm uppercase">Level</h3>
          </div>
          <p className="text-2xl font-extrabold text-indigo-900">Lvl {stats.level || 1}</p>
          <div className="w-full bg-indigo-200 h-1 mt-2 rounded-full overflow-hidden">
             <div className="bg-indigo-600 h-1 rounded-full" style={{width: `${((stats.xp || 0) % 500) / 5}%`}}></div>
          </div>
        </div>
      </div>

      {/* AI COACH INSIGHTS (NEW SECTION) */}
      <div className="bg-white rounded-2xl p-6 shadow-xl border border-purple-100 relative overflow-hidden mb-10">
        <div className="absolute top-0 right-0 p-20 bg-purple-500/5 rounded-full blur-3xl" />
            
        <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                <Brain className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800">AI Coach Insights</h2>
                <p className="text-sm text-slate-500">Based on your recent mistakes</p>
            </div>
        </div>

        {coachLoading ? (
            <div className="flex items-center gap-3 text-purple-600 p-8 justify-center">
                <Loader2 className="animate-spin w-5 h-5" />
                <span className="font-medium">Analyzing your weak points...</span>
            </div>
        ) : coachData ? (
            <div className="space-y-6 relative z-10">
                
                {/* WEAKNESSES TAGS */}
                {coachData.weaknesses && coachData.weaknesses.length > 0 ? (
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Top Weaknesses</p>
                        <div className="flex flex-wrap gap-2">
                            {coachData.weaknesses.map((tag: string, i: number) => (
                                <span key={i} className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full text-sm font-bold">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-3">
                        <Trophy className="w-5 h-5" />
                        <p>Not enough mistakes yet! Keep practicing to unlock AI analysis.</p>
                    </div>
                )}

                {/* ADVICE TEXT */}
                {coachData.advice && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">My Advice</p>
                        <p className="text-slate-700 leading-relaxed italic">
                            "{coachData.advice}"
                        </p>
                    </div>
                )}
            </div>
        ) : (
            <div className="text-red-400 flex gap-2 items-center">
                <AlertCircle className="w-5 h-5"/> Failed to load analysis.
            </div>
        )}
      </div>

      {/* TOOLS SECTION (Review + Flashcards) */}
      <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 relative overflow-hidden mb-10">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2 text-purple-600">
              <Sparkles className="w-6 h-6" />
              <h3 className="font-bold">Practice Tools</h3>
            </div>
            <p className="text-sm text-purple-800 mb-4">
              Improve your weak points with personalized tools.
            </p>
            
            <div className="flex flex-col gap-3">
                <button 
                  onClick={handleCreateReview}
                  disabled={generating || stats.mistakes_pool.length === 0}
                  className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold shadow-md hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {generating ? <Loader2 className="w-5 h-5 animate-spin"/> : "Practice My Mistakes (Exam)"}
                </button>

                <button 
                  onClick={() => setView("flashcards")}
                  disabled={stats.mistakes_pool.length === 0}
                  className="w-full py-3 bg-white text-purple-700 border-2 border-purple-200 rounded-xl font-bold hover:bg-purple-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  <Brain className="w-5 h-5"/>
                  Study Vocabulary Flashcards
                </button>
            </div>

            {error && <p className="text-xs text-red-500 mt-3 font-medium text-center">{error}</p>}
          </div>
      </div>

      {/* MISTAKES LOG */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gray-50 p-4 border-b">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Recent Mistakes ({stats.mistakes_pool.length})
          </h3>
        </div>
        
        <div className="divide-y max-h-96 overflow-y-auto">
          {stats.mistakes_pool.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No mistakes recorded yet. Keep practicing to populate this list!
            </div>
          ) : (
            stats.mistakes_pool.map((m: any, idx: number) => (
              <div key={idx} className="p-4 hover:bg-gray-50 transition">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">{m.type}</span>
                </div>
                <p className="font-medium text-gray-800 mb-2">{m.stem || m.question}</p>
                <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="text-red-600 bg-red-50 px-2 py-1 rounded">
                    <span className="opacity-70 text-xs uppercase mr-2">You:</span> 
                    <strong>{m.user_answer}</strong>
                  </div>
                  <div className="text-green-700 bg-green-50 px-2 py-1 rounded">
                    <span className="opacity-70 text-xs uppercase mr-2">Correct:</span>
                    <strong>{m.correct_answer}</strong>
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