import { useState } from "react";
import { 
  BookOpen, Dumbbell, ArrowRight, Lightbulb, ArrowLeft, 
  Layers, Shuffle, AlertTriangle, MessageCircle, Settings,
  Link, Anchor, Puzzle, Hourglass, Lock, Zap // <--- Imports icones
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ExercisePlayer from "./ExercisePlayer";
import { generateExercise } from "../api";
import { useAuth } from "../context/AuthContext"; // <--- Necessari per saber si ets VIP
import PremiumModal from "./PremiumModal"; // <--- El modal de venda

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

// CONFIGURACIÓ MESTRA DELS TEMES (ARA AMB isPremium)
const TOPICS = {
  conditionals: {
    title: "Advanced Conditionals",
    desc: "Mixed types, inversions, and 'if' alternatives.",
    icon: <Shuffle className="w-7 h-7" />, // <--- He tret els colors d'aquí per controlar-los abaix
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    theory: conditionalsTheory,
    apiType: "grammar_conditionals",
    isPremium: false // GRATIS
  },
  inversion: {
    title: "Inversion & Emphasis",
    desc: "Negative adverbials, 'Little did I know', 'So/Such'.",
    icon: <AlertTriangle className="w-7 h-7" />,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    theory: inversionTheory,
    apiType: "grammar_inversion",
    isPremium: true // 🔒 PREMIUM
  },
  phrasals: {
    title: "C1 Phrasal Verbs",
    desc: "3-part verbs, abstract meanings, and collocations.",
    icon: <Layers className="w-7 h-7" />,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    theory: phrasalVerbsTheory,
    apiType: "grammar_phrasal_verbs",
    isPremium: false // GRATIS
  },
  idioms: {
    title: "Idiomatic Expressions",
    desc: "Speak like a native: 'See eye to eye', 'Cut corners'.",
    icon: <MessageCircle className="w-7 h-7" />,
    color: "text-pink-600",
    bg: "bg-pink-50",
    border: "border-pink-200",
    theory: idiomsTheory,
    apiType: "grammar_idioms",
    isPremium: true // 🔒 PREMIUM
  },
  passive: {
    title: "Advanced Passives",
    desc: "Causatives (Have it done) & Impersonal structures.",
    icon: <Settings className="w-7 h-7" />,
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
    theory: passiveTheory,
    apiType: "grammar_passive",
    isPremium: true // 🔒 PREMIUM
  },
  linkers: {
    title: "Linkers & Cohesion",
    desc: "Structuring Essays: 'Nevertheless', 'Albeit', 'Thus'.",
    icon: <Link className="w-7 h-7" />,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    theory: linkersTheory,
    apiType: "grammar_linkers",
    isPremium: false // GRATIS
  },
  prepositions: {
    title: "Dependent Prepositions",
    desc: "The silent killer: 'Object TO', 'Capable OF', 'Insist ON'.",
    icon: <Anchor className="w-7 h-7" />,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    theory: prepositionsTheory,
    apiType: "grammar_prepositions",
    isPremium: true // 🔒 PREMIUM
  },
  collocations: {
    title: "Advanced Collocations",
    desc: "Word partnerships: 'Bitterly disappointed', 'Torrential rain'.",
    icon: <Puzzle className="w-7 h-7" />,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    theory: collocationsTheory,
    apiType: "grammar_collocations",
    isPremium: true // 🔒 PREMIUM
  },
  wishes: {
    title: "Wishes & Regrets",
    desc: "'I wish I had known', 'It's high time we left'.",
    icon: <Hourglass className="w-7 h-7" />,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    theory: wishesTheory,
    apiType: "grammar_wishes",
    isPremium: false // GRATIS
  }
};

type TopicKey = keyof typeof TOPICS;

export default function ExtrasPage({ onBack }: { onBack: () => void }) {
  const { user } = useAuth(); // <--- 1. Necessitem l'usuari
  const navigate = useNavigate();
  
  const [selectedTopic, setSelectedTopic] = useState<TopicKey | null>(null);
  const [activeTab, setActiveTab] = useState<"theory" | "practice">("theory");
  const [practiceData, setPracticeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false); // <--- Modal estat

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
      // 🔒 LÒGICA DE BLOQUEIG
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
      <div className="max-w-6xl mx-auto min-h-screen bg-gray-50 p-6 animate-in fade-in">
        
        {/* MODAL SI CLICA UN PREMIUM */}
        {showPremiumModal && (
            <PremiumModal 
                onClose={() => setShowPremiumModal(false)}
                onGoToPricing={() => navigate('/pricing')}
            />
        )}

        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-900 font-bold flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-5 h-5" /> Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Grammar Lab 🧪</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Object.keys(TOPICS) as TopicKey[]).map((key) => {
            const topic = TOPICS[key];
            const isLocked = topic.isPremium && !user?.is_vip;
            console.log("Sóc VIP?", user?.is_vip);
            return (
                <button
                key={key}
                onClick={() => handleTopicClick(key)}
                className={`relative p-6 rounded-2xl border-2 text-left transition-all group flex flex-col justify-between h-full overflow-hidden
                    ${isLocked 
                        ? 'bg-gray-50 border-gray-200'  // Estil Tancat
                        : `bg-white ${topic.border} hover:scale-[1.02] hover:shadow-lg` // Estil Obert
                    }
                `}
                >
                <div className="flex justify-between items-start mb-4 w-full">
                    {/* ICONA (Canvia a Candau si està tancat) */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-colors
                        ${isLocked ? 'bg-gray-200 text-gray-500' : `${topic.bg} ${topic.color}`}`}>
                        {isLocked ? <Lock className="w-7 h-7" /> : topic.icon}
                    </div>

                    {/* ETIQUETA SUPERIOR DRETA */}
                    {isLocked ? (
                        <span className="bg-red-100 text-red-600 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider border border-red-200 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                        </span>
                    ) : (
                        topic.isPremium && (
                            <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 rounded-full font-bold border border-yellow-200 flex items-center gap-1 shadow-sm">
                                <Zap className="w-3 h-3 fill-yellow-800" /> PRO
                            </span>
                        )
                    )}
                </div>

                <div className="w-full">
                    <h3 className={`text-xl font-bold mb-2 transition-colors ${isLocked ? 'text-gray-500' : 'text-gray-900 group-hover:text-blue-600'}`}>
                        {topic.title}
                    </h3>
                    <p className={`text-sm leading-relaxed ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
                        {topic.desc}
                    </p>
                </div>

                {/* FLETXA AL FINAL */}
                <div className="mt-4 flex justify-end w-full">
                    <div className={`p-2 rounded-full transition-colors ${isLocked ? 'bg-transparent' : 'bg-gray-50 group-hover:bg-blue-50'}`}>
                        {isLocked ? (
                            <Lock className="text-gray-300 w-5 h-5" />
                        ) : (
                            <ArrowRight className="text-blue-500 w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
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

  // --- VISTA 2: DINS DEL TEMA (NO CANVIA GAIRE) ---
  const currentTopic = TOPICS[selectedTopic];

  return (
    <div className="max-w-5xl mx-auto min-h-screen bg-gray-50 p-6 animate-in slide-in-from-right-8 duration-300">
      
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setSelectedTopic(null)} className="text-gray-500 hover:text-gray-900 font-bold flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Topics
        </button>
        <h1 className="text-3xl font-bold text-gray-800">{currentTopic.title}</h1>
      </div>

      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("theory")}
          className={`pb-3 px-4 text-lg font-medium flex items-center gap-2 transition-colors ${
            activeTab === "theory" ? "border-b-4 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <BookOpen className="w-5 h-5" /> Theory
        </button>
        <button
          onClick={() => { setActiveTab("practice"); if(!practiceData) loadPractice(selectedTopic); }}
          className={`pb-3 px-4 text-lg font-medium flex items-center gap-2 transition-colors ${
            activeTab === "practice" ? "border-b-4 border-purple-600 text-purple-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Dumbbell className="w-5 h-5" /> AI Practice
        </button>
      </div>

      <div>
        {activeTab === "theory" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
            {currentTopic.theory.map((section, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" /> {section.title}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">{section.content}</p>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  {section.examples.map((ex, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-bold text-blue-700 text-xs uppercase tracking-wide block mb-1">{ex.type}</span>
                      <p className="font-serif text-gray-800" dangerouslySetInnerHTML={{ __html: ex.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-xl shadow-lg text-white flex flex-col justify-center items-center text-center">
              <h3 className="text-2xl font-bold mb-2">Ready to master {currentTopic.title}?</h3>
              <p className="opacity-80 mb-6">Test yourself with our AI engine.</p>
              <button 
                onClick={() => { setActiveTab("practice"); loadPractice(selectedTopic); }}
                className="bg-white text-gray-900 px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-2"
              >
                Start Practice <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {activeTab === "practice" && (
          <div className="w-full">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p>Generating {currentTopic.title} Challenges...</p>
              </div>
            ) : practiceData ? (
              <ExercisePlayer 
                data={practiceData} 
                onBack={() => setActiveTab("theory")} 
                onOpenPricing={() => navigate('/pricing')} 
              />
            ) : (
              <div className="text-center text-red-500 mt-10">
                  <p className="font-bold">Failed to load exercise.</p>
                  <button onClick={() => loadPractice(selectedTopic)} className="mt-4 text-blue-600 underline hover:text-blue-800">Try Again</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}