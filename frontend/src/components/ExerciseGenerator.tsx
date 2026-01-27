import { useState, useEffect } from 'react';
import { 
  BookOpen, PenTool, Mic, Headphones, 
  Loader2, Play, BarChart2, GraduationCap, 
  Brain, Layout, LogOut, Download, Zap, ShoppingBag, Crown
} from 'lucide-react';
import ExercisePlayer from './ExercisePlayer';
import ExamPlayer from './ExamPlayer';
import { fetchExercise, generateFullExam, downloadOfflinePack, getOfflineExercise } from '../api';
import Profile from './Profile';
import Pricing from './Pricing'; 
import AdModal from './AdModal'; 
import PremiumModal from './PremiumModal'; 
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const SKILLS = {
  reading: {
    label: "Reading",
    fullLabel: "Reading & Use of English",
    desc: "Grammar & Vocabulary",
    icon: <BookOpen className="w-5 h-5 lg:w-6 lg:h-6" />,
    color: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50 text-blue-700",
    parts: [
      { id: "reading_and_use_of_language1", name: "Part 1", desc: "Multiple Choice Cloze" },
      { id: "reading_and_use_of_language2", name: "Part 2", desc: "Open Cloze" },
      { id: "reading_and_use_of_language3", name: "Part 3", desc: "Word Formation" },
      { id: "reading_and_use_of_language4", name: "Part 4", desc: "Key Word Transformation" },
      { id: "reading_and_use_of_language5", name: "Part 5", desc: "Multiple Choice" },
      { id: "reading_and_use_of_language6", name: "Part 6", desc: "Cross-Text Matching" },
      { id: "reading_and_use_of_language7", name: "Part 7", desc: "Gapped Text" },
      { id: "reading_and_use_of_language8", name: "Part 8", desc: "Multiple Matching" },
    ]
  },
  writing: {
    label: "Writing",
    fullLabel: "Writing",
    desc: "Essays & Reports",
    icon: <PenTool className="w-5 h-5 lg:w-6 lg:h-6" />,
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 text-emerald-700",
    parts: [
      { id: "writing1", name: "Part 1", desc: "Essay (Compulsory)" },
      { id: "writing2", name: "Part 2", desc: "Proposal, Report or Review" },
    ]
  },
  speaking: {
    label: "Speaking",
    fullLabel: "Speaking",
    desc: "Fluency & Images",
    icon: <Mic className="w-5 h-5 lg:w-6 lg:h-6" />,
    color: "from-purple-500 to-pink-600",
    bg: "bg-purple-50 text-purple-700",
    parts: [
      { id: "speaking1", name: "Part 1", desc: "Interview" },
      { id: "speaking2", name: "Part 2", desc: "Long Turn (Pictures)" },
      { id: "speaking3", name: "Parts 3 & 4", desc: "Collaborative Task" },
    ]
  },
  listening: {
    label: "Listening",
    fullLabel: "Listening",
    desc: "Audio comprehension",
    icon: <Headphones className="w-5 h-5 lg:w-6 lg:h-6" />,
    color: "from-orange-500 to-red-600",
    bg: "bg-orange-50 text-orange-700",
    parts: [
      { id: "listening1", name: "Part 1", desc: "Multiple Choice" },
      { id: "listening2", name: "Part 2", desc: "Sentence Completion" },
      { id: "listening3", name: "Part 3", desc: "Interview" },
      { id: "listening4", name: "Part 4", desc: "Multiple Matching" },
    ]
  }
};

type SkillKey = keyof typeof SKILLS;

export default function Dashboard() {
  const { user, logout } = useAuth();
  
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [activeSkill, setActiveSkill] = useState<SkillKey>('reading');
  
  const [loading, setLoading] = useState(false);
  const [examLoading, setExamLoading] = useState(false);
  const [downloadingPack, setDownloadingPack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exerciseData, setExerciseData] = useState<any>(null);
  const [examData, setExamData] = useState<any>(null);

  // --- ESTATS PELS DOS TIPUS DE MODALS ---
  const [showAdModal, setShowAdModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // --- FUNCIÓ DE DECISIÓ INTEL·LIGENT (1 Reward al dia) ---
  const handleLimitReached = () => {
      // 1. Comprovem si JA ha gastat la recompensa d'avui
      const today = new Date().toISOString().split('T')[0]; // Format "2024-05-20"
      const alreadyClaimed = localStorage.getItem(`ad_reward_claimed_${today}`);

      if (alreadyClaimed) {
          // Si ja l'ha gastat avui -> Forcem el Premium (No hi ha sort que valgui)
          setShowPremiumModal(true);
          return;
      }

      // 2. Si no l'ha gastat, fem el sorteig 50/50
      const chance = Math.random(); 
      if (chance > 0.5) {
          setShowAdModal(true); // Li ha tocat la recompensa!
      } else {
          setShowPremiumModal(true); // Mala sort
      }
  };

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('success') === 'true') {
      setCurrentView('profile'); 
      toast.success("Payment Successful! 🌟", {
        description: "Your VIP Pass is now active.",
        duration: 5000,
      });
      window.history.replaceState({}, '', '/');
    }
    if (query.get('canceled') === 'true') {
      setCurrentView('pricing'); 
      window.history.replaceState({}, '', '/');
      toast.info("Payment canceled");
    }
  }, []);

  const handleGenerate = async (partId: string) => {
    if (!user) return;
    
    if (!navigator.onLine) {
        const offlineEx = getOfflineExercise();
        if (offlineEx) {
             setExerciseData(offlineEx);
             toast.info("Loaded offline exercise", { description: "You are currently offline." });
             return;
        }
        setError("You are offline.");
        return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchExercise(partId, user.uid);
      setExerciseData(data);
    } catch (err: any) {
      if (err.message === "DAILY_LIMIT") {
         handleLimitReached();
      }
      else {
         setError("Failed to generate exercise.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    if (!user) return;
    if (!navigator.onLine) {
       setError("Mock Exams require internet.");
       return;
    }
    setExamLoading(true);
    setError(null);
    try {
      const data = await generateFullExam(user.uid);
      setExamData(data);
    } catch (err: any) {
      if (err.message === "DAILY_LIMIT") {
        handleLimitReached();
      }
      else setError("Failed to generate exam.");
    } finally {
      setExamLoading(false);
    }
  };

  const handleDownloadPack = async () => {
    if(!user) return;
    if(!navigator.onLine) { 
        toast.error("Offline", { description: "Please connect to internet." }); 
        return; 
    }
    if(!confirm("Download 5 Reading exercises for offline use? This might take a minute.")) return;
    
    setDownloadingPack(true);
    try {
        await downloadOfflinePack(user.uid);
        toast.success("Pack Downloaded!", { description: "You can practice offline now." });
    } catch(e) { 
        toast.error("Download Failed"); 
    }
    finally { setDownloadingPack(false); }
  };

  // --- RENDERITZAT ---

  if (currentView === 'profile') {
    return <Profile onBack={() => setCurrentView('dashboard')} onStartReview={(data) => { setCurrentView('dashboard'); setExerciseData(data); }} />;
  }
  if (examData) return <ExamPlayer examData={examData} onExit={() => setExamData(null)} />;
  if (exerciseData) return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-1 max-w-5xl mx-auto w-full p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <ExercisePlayer data={exerciseData} onBack={() => setExerciseData(null)} />
        </div>
      </div>
  );

  return (
    <div className="flex min-h-screen font-sans text-slate-800 bg-slate-50">
      
      {/* --- MODAL 1: L'ANUNCI BO (Dona Recompensa i marca el dia com a gastat) --- */}
      {showAdModal && (
        <AdModal 
            onClose={() => setShowAdModal(false)}
            onReward={() => {
                setShowAdModal(false);
                
                // GUARDEM QUE JA HA GASTAT LA SORT D'AVUI
                const today = new Date().toISOString().split('T')[0];
                localStorage.setItem(`ad_reward_claimed_${today}`, 'true');

                toast.success("Reward Granted! 🎁", {
                    description: "You earned 1 extra life. Enjoy!"
                });
            }}
        />
      )}

      {/* --- MODAL 2: EL PAYWALL (Només ven) --- */}
      {showPremiumModal && (
        <PremiumModal 
            onClose={() => setShowPremiumModal(false)}
            onGoToPricing={() => {
                setShowPremiumModal(false);
                setCurrentView('pricing'); 
            }}
        />
      )}

      {/* SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-white/90 backdrop-blur-xl border-r border-white/20 shadow-2xl flex-col justify-between fixed h-full z-20">
        <div>
          <div className="p-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Brain className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
              C1 Master
            </span>
          </div>
          <nav className="mt-6 px-4 space-y-2">
            <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === 'dashboard' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Layout className="w-5 h-5" /> <span>Dashboard</span>
            </button>
            <button onClick={() => setCurrentView('profile')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === 'profile' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
              <BarChart2 className="w-5 h-5" /> <span>Stats & Profile</span>
            </button>
            <button onClick={() => setCurrentView('pricing')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === 'pricing' ? 'bg-yellow-50 text-yellow-700 font-semibold' : 'text-gray-500 hover:bg-yellow-50'}`}>
              <ShoppingBag className="w-5 h-5" /> <span>Upgrade / Store</span>
            </button>
             <button onClick={handleDownloadPack} disabled={downloadingPack} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-gray-500 hover:bg-gray-50">
              {downloadingPack ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5" />} <span>Offline Pack</span>
            </button>
          </nav>
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={logout} className="w-full flex items-center gap-4 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
            <LogOut className="w-5 h-5" /> <span className="font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 p-4 lg:p-10 pb-24 lg:pb-10 relative w-full">
        {/* HEADER MOBIL */}
        <div className="lg:hidden flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white"><Brain className="w-4 h-4" /></div>
                <span className="font-bold text-lg">C1 Master</span>
            </div>
            <div className="flex gap-2">
                 <button onClick={() => setCurrentView('pricing')} className="p-2 bg-yellow-100 rounded-full shadow-sm text-yellow-600"><Crown className="w-5 h-5" /></button>
                 <button onClick={logout} className="p-2 bg-white rounded-full shadow-sm text-red-500"><LogOut className="w-5 h-5" /></button>
            </div>
        </div>

        {currentView === 'pricing' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 text-gray-600 mb-6 hover:text-gray-900"><Layout className="w-4 h-4" /> Back to Dashboard</button>
                <div className="text-center mb-8"><h1 className="text-3xl font-bold text-gray-900">Upgrade your Plan</h1><p className="text-gray-500">Choose the best option to ace your C1 Exam.</p></div>
                <Pricing />
            </div>
        ) : (
            <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div><h1 className="text-2xl lg:text-4xl font-extrabold text-gray-900">Hello, <span className="text-blue-600">{user?.email?.split('@')[0]}</span></h1><p className="text-gray-500 mt-1">Ready to ace your Cambridge C1 Exam?</p></div>
                    <button onClick={handleStartExam} disabled={examLoading} className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3 bg-gray-900 text-white rounded-full font-bold shadow-lg hover:scale-105 transition-all active:scale-95 disabled:opacity-70">
                        {examLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <GraduationCap className="w-5 h-5" />} Mock Exam
                    </button>
                </div>

                {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3"><Zap className="w-4 h-4"/><span className="font-medium text-sm">{error}</span></div>}

                {/* SKILLS GRID */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
                {(Object.keys(SKILLS) as SkillKey[]).map((key) => {
                    const skill = SKILLS[key];
                    const isActive = activeSkill === key;
                    return (
                    <button key={key} onClick={() => setActiveSkill(key)} className={`relative overflow-hidden p-3 lg:p-4 rounded-2xl border transition-all duration-300 text-left group ${isActive ? 'bg-white border-blue-200 shadow-xl ring-2 ring-blue-500 scale-[1.02]' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'}`}>
                        <div className={`absolute top-0 right-0 p-16 rounded-full bg-gradient-to-br ${skill.color} opacity-5 blur-xl`} />
                        <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center mb-3 ${skill.bg}`}>{skill.icon}</div>
                        <h3 className={`font-bold text-sm lg:text-lg ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>{skill.label}</h3>
                        <p className="text-[10px] lg:text-xs text-gray-400 mt-1 line-clamp-1">{skill.desc}</p>
                    </button>
                    );
                })}
                </div>

                {/* PARTS GRID */}
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-4 lg:p-8 shadow-xl animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2 rounded-lg ${SKILLS[activeSkill].bg}`}>{SKILLS[activeSkill].icon}</div>
                    <div><h2 className="text-xl lg:text-2xl font-bold text-gray-800">{SKILLS[activeSkill].fullLabel}</h2><p className="text-xs lg:text-sm text-gray-500">Select a part to generate a new exercise</p></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                    {SKILLS[activeSkill].parts.map((part) => (
                    <button key={part.id} onClick={() => handleGenerate(part.id)} disabled={loading} className="group relative flex items-center p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-400 hover:shadow-md transition-all text-left disabled:opacity-50">
                        <div className="flex-1"><h4 className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors text-sm lg:text-base">{part.name}</h4><p className="text-xs lg:text-sm text-gray-500">{part.desc}</p></div>
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">{loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4 fill-current"/>}</div>
                    </button>
                    ))}
                </div>
                </div>
            </>
        )}
      </main>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center p-3 lg:hidden z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
         <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}><Layout className="w-6 h-6" /><span className="text-[10px] font-bold">Home</span></button>
         <button onClick={() => setCurrentView('pricing')} className={`flex flex-col items-center gap-1 ${currentView === 'pricing' ? 'text-yellow-600' : 'text-gray-400'}`}><Crown className="w-6 h-6" /><span className="text-[10px] font-bold">Store</span></button>
         <button onClick={() => setCurrentView('profile')} className={`flex flex-col items-center gap-1 ${currentView === 'profile' ? 'text-blue-600' : 'text-gray-400'}`}><BarChart2 className="w-6 h-6" /><span className="text-[10px] font-bold">Profile</span></button>
      </nav>
    </div>
  );
}