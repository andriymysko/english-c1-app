import { useState } from "react";
import { 
  BookOpen, Dumbbell, ArrowRight, Lightbulb, ArrowLeft, 
  Layers, Shuffle, AlertTriangle, MessageCircle, Settings,
  Link, Anchor, Puzzle, Hourglass, Lock, Zap, Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ExercisePlayer from "./ExercisePlayer";
import { generateExercise } from "../api";
import { useAuth } from "../context/AuthContext";
import PremiumModal from "./PremiumModal";

// --- IMPORTACIONS DE TEORIA ---
import { conditionalsTheory } from "../data/conditionalsTheory";
import { inversionTheory } from "../data/inversionTheory";
import { phrasalVerbsTheory } from "../data/phrasalVerbsTheory";
import { idiomsTheory } from "../data/idiomsTheory";
import { passiveTheory } from "../data/passiveTheory";
import { linkersTheory } from "../data/linkersTheory";
import { prepositionsTheory } from "../data/prepositionsTheory";
import { collocationsTheory } from "../data/collocationsTheory";
import { wishesTheory } from "../data/wishesTheory";

// CONFIGURACIÓ MESTRA DELS TEMES (AMB PALETA ACADÈMICA PREMIUM)
const TOPICS = {
  conditionals: {
    title: "Advanced Conditionals",
    desc: "Mixed types, inversions, and 'if' alternatives.",
    icon: <Shuffle className="w-5 h-5" />,
    iconColor: "text-indigo-800",
    iconBg: "bg-indigo-50",
    theory: conditionalsTheory,
    apiType: "grammar_conditionals",
    isPremium: false 
  },
  inversion: {
    title: "Inversion & Emphasis",
    desc: "Negative adverbials, 'Little did I know', 'So/Such'.",
    icon: <AlertTriangle className="w-5 h-5" />,
    iconColor: "text-amber-700",
    iconBg: "bg-amber-50",
    theory: inversionTheory,
    apiType: "grammar_inversion",
    isPremium: true 
  },
  phrasals: {
    title: "C1 Phrasal Verbs",
    desc: "3-part verbs, abstract meanings, and collocations.",
    icon: <Layers className="w-5 h-5" />,
    iconColor: "text-emerald-800",
    iconBg: "bg-emerald-50",
    theory: phrasalVerbsTheory,
    apiType: "grammar_phrasal_verbs",
    isPremium: false 
  },
  idioms: {
    title: "Idiomatic Expressions",
    desc: "Speak like a native: 'See eye to eye', 'Cut corners'.",
    icon: <MessageCircle className="w-5 h-5" />,
    iconColor: "text-rose-800",
    iconBg: "bg-rose-50",
    theory: idiomsTheory,
    apiType: "grammar_idioms",
    isPremium: true 
  },
  passive: {
    title: "Advanced Passives",
    desc: "Causatives (Have it done) & Impersonal structures.",
    icon: <Settings className="w-5 h-5" />,
    iconColor: "text-slate-700",
    iconBg: "bg-slate-100",
    theory: passiveTheory,
    apiType: "grammar_passive",
    isPremium: true 
  },
  linkers: {
    title: "Linkers & Cohesion",
    desc: "Structuring Essays: 'Nevertheless', 'Albeit', 'Thus'.",
    icon: <Link className="w-5 h-5" />,
    iconColor: "text-blue-800",
    iconBg: "bg-blue-50",
    theory: linkersTheory,
    apiType: "grammar_linkers",
    isPremium: false 
  },
  prepositions: {
    title: "Dependent Prepositions",
    desc: "The silent killer: 'Object TO', 'Capable OF', 'Insist ON'.",
    icon: <Anchor className="w-5 h-5" />,
    iconColor: "text-red-800",
    iconBg: "bg-red-50",
    theory: prepositionsTheory,
    apiType: "grammar_prepositions",
    isPremium: true 
  },
  collocations: {
    title: "Advanced Collocations",
    desc: "Word partnerships: 'Bitterly disappointed', 'Torrential rain'.",
    icon: <Puzzle className="w-5 h-5" />,
    iconColor: "text-teal-800",
    iconBg: "bg-teal-50",
    theory: collocationsTheory,
    apiType: "grammar_collocations",
    isPremium: true 
  },
  wishes: {
    title: "Wishes & Regrets",
    desc: "'I wish I had known', 'It's high time we left'.",
    icon: <Hourglass className="w-5 h-5" />,
    iconColor: "text-violet-800",
    iconBg: "bg-violet-50",
    theory: wishesTheory,
    apiType: "grammar_wishes",
    isPremium: false 
  }
};

type TopicKey = keyof typeof TOPICS;

export default function ExtrasPage({ onBack }: { onBack: () => void }) {
  const { user } = useAuth(); 
  const navigate = useNavigate();
  
  const [selectedTopic, setSelectedTopic] = useState<TopicKey | null>(null);
  const [activeTab, setActiveTab] = useState<"theory" | "practice">("theory");
  const [practiceData, setPracticeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false); 

  const loadPractice = async (topicKey: TopicKey) => {
    setLoading(true);
    try {
      const apiType = TOPICS[topicKey].apiType;
      const data = await generateExercise(apiType, "C1");
      setPracticeData(data);
    } catch (error) {
      console.error("Error loading exercise:", error);
      alert("Failed to generate exercise. Check API connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleTopicClick = (key: TopicKey) => {
      const topic = TOPICS[key];
      if (topic.isPremium && !user?.is_vip) {
          setShowPremiumModal(true);
      } else {
          setSelectedTopic(key); 
          setActiveTab("theory"); 
          setPracticeData(null);
      }
  };

  // --- VISTA 1: MENÚ DE SELECCIÓ (GRID) ---
  if (!selectedTopic) {
    return (
      <div className="max-w-6xl mx-auto min-h-screen bg-stone-50 p-6 animate-in fade-in">
        
        {showPremiumModal && (
            <PremiumModal 
                onClose={() => setShowPremiumModal(false)}
                onGoToPricing={() => navigate('/pricing')}
            />
        )}

        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="text-stone-500 hover:text-slate-900 font-bold flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-5 h-5" /> Dashboard
          </button>
          <h1 className="text-3xl font-serif font-black text-slate-900">Grammar Lab</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.keys(TOPICS) as TopicKey[]).map((key) => {
            const topic = TOPICS[key];
            const isLocked = topic.isPremium && !user?.is_vip;
            
            return (
                <button
                key={key}
                onClick={() => handleTopicClick(key)}
                className={`relative p-6 rounded-sm border text-left transition-all group flex flex-col justify-between h-full
                    ${isLocked 
                        ? 'bg-stone-100 border-stone-200 opacity-80' 
                        : 'bg-white border-stone-200 hover:border-slate-900 hover:shadow-sm'
                    }
                `}
                >
                <div className="flex justify-between items-start mb-6 w-full">
                    {/* APLIQUEM LA PALETA ACADÈMICA NOMÉS A LA ICONA */}
                    <div className={`w-10 h-10 rounded-sm flex items-center justify-center transition-colors
                        ${isLocked ? 'bg-stone-200 text-stone-400' : `${topic.iconBg} ${topic.iconColor} group-hover:bg-slate-900 group-hover:text-white`}`}>
                        {isLocked ? <Lock className="w-5 h-5" /> : topic.icon}
                    </div>

                    {isLocked ? (
                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                        </span>
                    ) : (
                        topic.isPremium && (
                            <span className="bg-stone-200 text-stone-600 text-[10px] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider flex items-center gap-1">
                                <Zap className="w-3 h-3" /> PRO
                            </span>
                        )
                    )}
                </div>

                <div className="w-full mb-4">
                    <h3 className={`text-xl font-serif font-bold mb-2 transition-colors ${isLocked ? 'text-stone-500' : 'text-slate-900'}`}>
                        {topic.title}
                    </h3>
                    <p className={`text-sm ${isLocked ? 'text-stone-400' : 'text-stone-500'}`}>
                        {topic.desc}
                    </p>
                </div>

                <div className="flex justify-end w-full">
                    <div className={`transition-colors ${isLocked ? 'text-stone-300' : 'text-stone-400 group-hover:text-slate-900'}`}>
                        {isLocked ? (
                            <span className="text-xs font-bold uppercase tracking-widest">Unavailable</span>
                        ) : (
                            <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                        )}
                    </div>
                </div>
                </button>
            );
          })}
        </div>
      </div>
    );
  }

  // --- VISTA 2: DINS DEL TEMA ---
  const currentTopic = TOPICS[selectedTopic];

  return (
    <div className="max-w-5xl mx-auto min-h-screen bg-stone-50 p-6 animate-in slide-in-from-right-8 duration-300">
      
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setSelectedTopic(null)} className="text-stone-500 hover:text-slate-900 font-bold flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Topics
        </button>
        <h1 className="text-3xl font-serif font-black text-slate-900">{currentTopic.title}</h1>
      </div>

      <div className="flex gap-6 mb-8 border-b border-stone-200">
        <button
          onClick={() => setActiveTab("theory")}
          className={`pb-3 text-sm font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${
            activeTab === "theory" ? "border-b-2 border-slate-900 text-slate-900" : "text-stone-400 hover:text-slate-900 border-b-2 border-transparent"
          }`}
        >
          <BookOpen className="w-4 h-4" /> Theory
        </button>
        <button
          onClick={() => { setActiveTab("practice"); if(!practiceData) loadPractice(selectedTopic); }}
          className={`pb-3 text-sm font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${
            activeTab === "practice" ? "border-b-2 border-slate-900 text-slate-900" : "text-stone-400 hover:text-slate-900 border-b-2 border-transparent"
          }`}
        >
          <Dumbbell className="w-4 h-4" /> AI Practice
        </button>
      </div>

      <div>
        {activeTab === "theory" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
            {currentTopic.theory.map((section, idx) => (
              <div key={idx} className="bg-white p-8 rounded-sm shadow-sm border border-stone-200">
                <h3 className="text-xl font-serif font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-stone-400" /> {section.title}
                </h3>
                <p className="text-stone-600 mb-6 leading-relaxed">{section.content}</p>
                <div className="bg-stone-50 border border-stone-100 p-5 rounded-sm space-y-4">
                  {section.examples.map((ex, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-widest block mb-1">{ex.type}</span>
                      <p className="font-serif text-stone-800 text-base" dangerouslySetInnerHTML={{ __html: ex.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="bg-slate-900 p-8 rounded-sm text-white flex flex-col justify-center items-center text-center">
              <h3 className="text-2xl font-serif font-bold mb-3">Ready to master {currentTopic.title}?</h3>
              <p className="text-stone-400 mb-8 font-medium">Test yourself with our AI engine.</p>
              <button 
                onClick={() => { setActiveTab("practice"); loadPractice(selectedTopic); }}
                className="bg-white text-slate-900 px-8 py-3 rounded-sm font-bold hover:bg-stone-100 transition-colors flex items-center gap-2 uppercase tracking-widest text-sm"
              >
                Start Practice <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === "practice" && (
          <div className="w-full">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-stone-500">
                <Loader2 className="w-10 h-10 animate-spin text-slate-900 mb-4" />
                <p className="font-medium tracking-wide">Generating {currentTopic.title} Challenges...</p>
              </div>
            ) : practiceData ? (
              <ExercisePlayer 
                data={practiceData} 
                onBack={() => setActiveTab("theory")} 
                onOpenPricing={() => navigate('/pricing')} 
              />
            ) : (
              <div className="text-center text-red-600 mt-10">
                  <p className="font-bold">Failed to load exercise.</p>
                  <button onClick={() => loadPractice(selectedTopic)} className="mt-4 text-slate-900 font-bold uppercase tracking-widest text-sm hover:underline">Try Again</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}