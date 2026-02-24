import { useState, useEffect } from 'react';
import { 
  BookOpen, PenTool, Mic, Headphones, 
  Loader2, Play, BarChart2, GraduationCap, 
  Layout, LogOut, Download, Zap, ShoppingBag, Crown, Lock, Flame
} from 'lucide-react';
import ExercisePlayer from './ExercisePlayer';
import ExamPlayer from './ExamPlayer';
import { fetchExercise, generateFullExam, downloadOfflinePack, getOfflineExercise, getUserStats } from '../api'; 
import Profile from './Profile';
import Pricing from './Pricing'; 
import AdGateModal from './AdGateModal'; 
import PremiumModal from './PremiumModal'; 
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

// --- DEFINICIÓ D'HABILITATS (SKILLS) ---
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
      { id: "writing2", name: "Part 2", desc: "Proposal, Report or Review", isPremium: true },
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

interface Props {
  onOpenExtras?: () => void;
  onOpenVocabulary: () => void;
}

export default function ExerciseGenerator({ onOpenExtras, onOpenVocabulary }: Props) {
  const { user, logout } = useAuth();
   
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [activeSkill, setActiveSkill] = useState<SkillKey>('reading');
   
  const [loadingPartId, setLoadingPartId] = useState<string | null>(null);
  
  const [examLoading, setExamLoading] = useState(false);
  const [downloadingPack, setDownloadingPack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exerciseData, setExerciseData] = useState<any>(null);
  const [examData, setExamData] = useState<any>(null);

  const [showAdGate, setShowAdGate] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [pendingPartId, setPendingPartId] = useState<string | null>(null);

  const [isVip, setIsVip] = useState<boolean>((user as any)?.is_vip || false);

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

    if (user) {
        if (user.is_vip) setIsVip(true);
        getUserStats(user.uid).then(data => {
            if (data && data.is_vip) {
                setIsVip(true);
            }
        });
    }
  }, [user]);

  const handlePartClick = (partId: string, isPremiumPart: boolean = false) => {
    if (isVip) {
        handleGenerate(partId);
        return;
    }

    if (isPremiumPart) {
        setShowPremiumModal(true);
        return;
    }
   
    const counts = user?.daily_usage?.counts || {};
    const totalDone = Object.values(counts).reduce((a: any, b: any) => a + b, 0) as number;

    if (totalDone === 0) {
        handleGenerate(partId);
    } else if (totalDone < 3) {
        setPendingPartId(partId);
        setShowAdGate(true);
    } else {
        setShowPremiumModal(true);
    }
  };

  const handleAdGateComplete = () => {
      setShowAdGate(false);
      if (pendingPartId) {
          handleGenerate(pendingPartId);
          setPendingPartId(null);
      }
  };

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

    setLoadingPartId(partId);
    setError(null);
    try {
      const data = await fetchExercise(partId, user.uid);
      setExerciseData(data);
    } catch (err: any) {
      if (err.message === "DAILY_LIMIT") {
         setShowPremiumModal(true);
      }
      else {
         setError("Failed to generate exercise.");
      }
    } finally {
      setLoadingPartId(null);
    }
  };

  const handleStartExam = async () => {
    if (!user) return;
    
    if (!isVip) {
        setShowPremiumModal(true); 
        return;
    }

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
      setError("Failed to generate exam.");
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
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <div className="flex-1 max-w-5xl mx-auto w-full p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <ExercisePlayer 
                data={exerciseData} 
                onBack={() => setExerciseData(null)}
                onOpenPricing={() => {
                    setExerciseData(null); 
                    setCurrentView('pricing'); 
                }} 
           />
        </div>
      </div>
  );

  return (
    <div className="flex min-h-screen font-sans text-slate-800 bg-stone-50">
       
      <AdGateModal 
          isOpen={showAdGate}
          onClose={() => setShowAdGate(false)}
          onComplete={handleAdGateComplete}
      />

      {showPremiumModal && (
        <PremiumModal 
            onClose={() => setShowPremiumModal(false)}
            onGoToPricing={() => {
                setShowPremiumModal(false);
                setCurrentView('pricing'); 
            }}
        />
      )}

      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-stone-200 shadow-sm flex-col justify-between fixed h-full z-20">
        <div>
          {/* IDENTITAT EDITORIAL */}
          <div className="p-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-sm flex items-center justify-center text-white">
              <span className="font-serif font-bold text-xl">C1</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-serif font-black text-slate-900 tracking-tight leading-none">
                getaidvanced
              </span>
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">
                Cambridge Simulator
              </span>
            </div>
          </div>

          <nav className="mt-6 px-4 space-y-2">
            <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === 'dashboard' ? 'bg-stone-100 text-slate-900 font-semibold' : 'text-stone-500 hover:bg-stone-50'}`}>
              <Layout className="w-5 h-5" /> <span>Dashboard</span>
            </button>
            
            <button onClick={onOpenExtras} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-stone-500 hover:bg-stone-50 hover:text-slate-900">
              <GraduationCap className="w-5 h-5" /> <span>Grammar Lab</span>
            </button>

            <button onClick={onOpenVocabulary} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-stone-500 hover:bg-stone-50 hover:text-slate-900">
              <Flame className="w-5 h-5" /> <span>Vocab Vault</span>
            </button>

            <button onClick={() => setCurrentView('profile')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === 'profile' ? 'bg-stone-100 text-slate-900 font-semibold' : 'text-stone-500 hover:bg-stone-50'}`}>
              <BarChart2 className="w-5 h-5" /> <span>Stats & Profile</span>
            </button>
            <button onClick={() => setCurrentView('pricing')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === 'pricing' ? 'bg-stone-100 text-slate-900 font-semibold' : 'text-stone-500 hover:bg-stone-50'}`}>
              <ShoppingBag className="w-5 h-5" /> <span>Upgrade / Store</span>
            </button>
             <button onClick={handleDownloadPack} disabled={downloadingPack} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-stone-500 hover:bg-stone-50">
              {downloadingPack ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5" />} <span>Offline Pack</span>
            </button>
          </nav>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <button onClick={logout} className="w-full flex items-center gap-4 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors">
            <LogOut className="w-5 h-5" /> <span className="font-medium">Log Out</span>
          </button>
          
          {/* EL SEGELL ETHERNALS */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-center gap-2 text-stone-400 opacity-60 hover:opacity-100 transition-opacity cursor-default">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
              <polygon points="12 2 2 12 12 22 22 12" />
            </svg>
            <span className="text-[8px] tracking-[0.2em] font-black uppercase mt-0.5">
              An Ethernals Company
            </span>
          </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 p-4 lg:p-10 pb-24 lg:pb-10 relative w-full">
        {/* MOBILE HEADER */}
        <div className="lg:hidden flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-900 rounded-sm flex items-center justify-center text-white"><span className="font-serif font-bold text-sm">C1</span></div>
                <span className="font-serif font-bold text-lg text-slate-900 tracking-tight">getaidvanced</span>
            </div>
            <div className="flex gap-2">
                 <button onClick={() => setCurrentView('pricing')} className="p-2 bg-stone-100 rounded-full shadow-sm text-slate-900"><Crown className="w-5 h-5" /></button>
                 <button onClick={logout} className="p-2 bg-white rounded-full shadow-sm text-red-600"><LogOut className="w-5 h-5" /></button>
            </div>
        </div>

        {currentView === 'pricing' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 text-stone-600 mb-6 hover:text-slate-900"><Layout className="w-4 h-4" /> Back to Dashboard</button>
                <Pricing />
            </div>
        ) : (
            <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-4xl font-serif font-black text-slate-900">Hello, <span className="text-slate-500">{user?.email?.split('@')[0]}</span></h1>
                        <p className="text-stone-500 mt-2 font-medium">Ready to ace your Cambridge C1 Exam?</p>
                        {isVip && (
                            <span className="inline-flex items-center gap-1 mt-3 px-2 py-1 bg-stone-200 text-slate-800 text-xs font-bold rounded-sm uppercase tracking-wider">
                                <Crown className="w-3 h-3 fill-current" /> VIP MEMBER
                            </span>
                        )}
                    </div>
                    
                    <button onClick={handleStartExam} disabled={examLoading} className={`w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3 rounded-sm font-bold shadow-sm transition-all disabled:opacity-70 ${isVip ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-stone-200 text-stone-500 cursor-not-allowed'}`}>
                        {examLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <GraduationCap className="w-5 h-5" />} 
                        Mock Exam {!isVip && <Lock className="w-4 h-4 ml-1" />}
                    </button>
                </div>

                {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm flex items-center gap-3"><Zap className="w-4 h-4"/><span className="font-medium text-sm">{error}</span></div>}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
                {(Object.keys(SKILLS) as SkillKey[]).map((key) => {
                    const skill = SKILLS[key];
                    const isActive = activeSkill === key;
                    return (
                    <button key={key} onClick={() => setActiveSkill(key)} className={`p-4 rounded-sm border transition-all duration-200 text-left ${isActive ? 'bg-white border-slate-900 shadow-sm ring-1 ring-slate-900' : 'bg-white border-stone-200 hover:border-stone-400'}`}>
                        <div className={`w-10 h-10 rounded-sm flex items-center justify-center mb-4 ${isActive ? 'bg-slate-900 text-white' : 'bg-stone-100 text-stone-600'}`}>{skill.icon}</div>
                        <h3 className={`font-serif font-bold text-sm lg:text-lg ${isActive ? 'text-slate-900' : 'text-stone-700'}`}>{skill.label}</h3>
                        <p className="text-[10px] lg:text-xs text-stone-400 mt-1 uppercase tracking-wider">{skill.desc}</p>
                    </button>
                    );
                })}
                </div>

                <div className="bg-white border border-stone-200 rounded-sm p-4 lg:p-8 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-center gap-4 mb-8 border-b border-stone-100 pb-6">
                    <div><h2 className="text-xl lg:text-2xl font-serif font-bold text-slate-900">{SKILLS[activeSkill].fullLabel}</h2><p className="text-xs lg:text-sm text-stone-500 mt-1">Select a part to generate a new exercise</p></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                    {SKILLS[activeSkill].parts.map((part: any) => (
                    
                    <button 
                        key={part.id} 
                        onClick={() => handlePartClick(part.id, part.isPremium)} 
                        disabled={loadingPartId !== null} 
                        className="group relative flex items-center p-4 bg-stone-50 border border-stone-200 rounded-sm hover:border-slate-900 hover:bg-white transition-all text-left disabled:opacity-50"
                    >
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-900 text-sm lg:text-base flex items-center gap-2">
                                {part.name}
                                {!isVip && part.isPremium && <span className="text-[10px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded-sm uppercase tracking-wider flex items-center gap-1"><Zap className="w-3 h-3"/> PRO</span>}
                            </h4>
                            <p className="text-xs lg:text-sm text-stone-500 mt-1">{part.desc}</p>
                        </div>
                        <div className={`w-8 h-8 rounded-sm flex items-center justify-center transition-colors ${!isVip && part.isPremium ? 'bg-stone-200 text-stone-400' : 'bg-stone-200 text-slate-900 group-hover:bg-slate-900 group-hover:text-white'}`}>
                            {loadingPartId === part.id ? <Loader2 className="w-4 h-4 animate-spin"/> : (
                                !isVip && part.isPremium ? <Lock className="w-4 h-4"/> : <Play className="w-4 h-4 fill-current"/>
                            )}
                        </div>
                    </button>
                    ))}
                </div>
                </div>
            </>
        )}
      </main>

      {/* MOBILE NAVBAR */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-stone-200 flex justify-around items-center p-3 lg:hidden z-50">
         <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' ? 'text-slate-900' : 'text-stone-400'}`}><Layout className="w-6 h-6" /><span className="text-[10px] font-bold">Home</span></button>
         <button onClick={onOpenExtras} className="flex flex-col items-center gap-1 text-stone-400 hover:text-slate-900"><GraduationCap className="w-6 h-6" /><span className="text-[10px] font-bold">Grammar</span></button>
         
         <button onClick={onOpenVocabulary} className="flex flex-col items-center gap-1 text-stone-400 hover:text-slate-900"><Flame className="w-6 h-6" /><span className="text-[10px] font-bold">Vocab</span></button>
         
         <button onClick={() => setCurrentView('pricing')} className={`flex flex-col items-center gap-1 ${currentView === 'pricing' ? 'text-slate-900' : 'text-stone-400'}`}><Crown className="w-6 h-6" /><span className="text-[10px] font-bold">Store</span></button>
         <button onClick={() => setCurrentView('profile')} className={`flex flex-col items-center gap-1 ${currentView === 'profile' ? 'text-slate-900' : 'text-stone-400'}`}><BarChart2 className="w-6 h-6" /><span className="text-[10px] font-bold">Profile</span></button>
      </nav>
    </div>
  );
}