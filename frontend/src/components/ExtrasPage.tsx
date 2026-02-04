import { useState } from "react";
import { 
  BookOpen, Dumbbell, ArrowRight, Lightbulb, ArrowLeft, 
  Layers, Shuffle, AlertTriangle, MessageCircle, Settings,
  Link, Anchor, Puzzle, Hourglass // <--- NOVA ICONA AFEGIDA
} from "lucide-react";
import ExercisePlayer from "./ExercisePlayer";
import { generateExercise } from "../api";

// --- IMPORTACIONS DE TEORIA ---
import { conditionalsTheory } from "../data/conditionalsTheory";
import { inversionTheory } from "../data/inversionTheory";
import { phrasalVerbsTheory } from "../data/phrasalVerbsTheory";
import { idiomsTheory } from "../data/idiomsTheory";
import { passiveTheory } from "../data/passiveTheory";
import { linkersTheory } from "../data/linkersTheory";
import { prepositionsTheory } from "../data/prepositionsTheory";
import { collocationsTheory } from "../data/collocationsTheory";
import { wishesTheory } from "../data/wishesTheory"; // <--- NOU IMPORT

// CONFIGURACIÓ MESTRA DELS TEMES
const TOPICS = {
  conditionals: {
    title: "Advanced Conditionals",
    desc: "Mixed types, inversions, and 'if' alternatives.",
    icon: <Shuffle className="w-8 h-8 text-blue-500" />,
    color: "bg-blue-50 border-blue-200 hover:border-blue-400",
    theory: conditionalsTheory,
    apiType: "grammar_conditionals"
  },
  inversion: {
    title: "Inversion & Emphasis",
    desc: "Negative adverbials, 'Little did I know', 'So/Such'.",
    icon: <AlertTriangle className="w-8 h-8 text-orange-500" />,
    color: "bg-orange-50 border-orange-200 hover:border-orange-400",
    theory: inversionTheory,
    apiType: "grammar_inversion"
  },
  phrasals: {
    title: "C1 Phrasal Verbs",
    desc: "3-part verbs, abstract meanings, and collocations.",
    icon: <Layers className="w-8 h-8 text-purple-500" />,
    color: "bg-purple-50 border-purple-200 hover:border-purple-400",
    theory: phrasalVerbsTheory,
    apiType: "grammar_phrasal_verbs"
  },
  idioms: {
    title: "Idiomatic Expressions",
    desc: "Speak like a native: 'See eye to eye', 'Cut corners'.",
    icon: <MessageCircle className="w-8 h-8 text-pink-500" />,
    color: "bg-pink-50 border-pink-200 hover:border-pink-400",
    theory: idiomsTheory,
    apiType: "grammar_idioms"
  },
  passive: {
    title: "Advanced Passives",
    desc: "Causatives (Have it done) & Impersonal structures.",
    icon: <Settings className="w-8 h-8 text-teal-500" />,
    color: "bg-teal-50 border-teal-200 hover:border-teal-400",
    theory: passiveTheory,
    apiType: "grammar_passive"
  },
  linkers: {
    title: "Linkers & Cohesion",
    desc: "Structuring Essays: 'Nevertheless', 'Albeit', 'Thus'.",
    icon: <Link className="w-8 h-8 text-indigo-500" />,
    color: "bg-indigo-50 border-indigo-200 hover:border-indigo-400",
    theory: linkersTheory,
    apiType: "grammar_linkers"
  },
  prepositions: {
    title: "Dependent Prepositions",
    desc: "The silent killer: 'Object TO', 'Capable OF', 'Insist ON'.",
    icon: <Anchor className="w-8 h-8 text-red-500" />,
    color: "bg-red-50 border-red-200 hover:border-red-400",
    theory: prepositionsTheory,
    apiType: "grammar_prepositions"
  },
  collocations: {
    title: "Advanced Collocations",
    desc: "Word partnerships: 'Bitterly disappointed', 'Torrential rain'.",
    icon: <Puzzle className="w-8 h-8 text-emerald-500" />,
    color: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
    theory: collocationsTheory,
    apiType: "grammar_collocations"
  },
  // --- NOU MÒDUL FINAL ---
  wishes: {
    title: "Wishes & Regrets",
    desc: "'I wish I had known', 'It's high time we left'.",
    icon: <Hourglass className="w-8 h-8 text-cyan-500" />,
    color: "bg-cyan-50 border-cyan-200 hover:border-cyan-400",
    theory: wishesTheory,
    apiType: "grammar_wishes"
  }
};

type TopicKey = keyof typeof TOPICS;

export default function ExtrasPage({ onBack }: { onBack: () => void }) {
  const [selectedTopic, setSelectedTopic] = useState<TopicKey | null>(null);
  const [activeTab, setActiveTab] = useState<"theory" | "practice">("theory");
  const [practiceData, setPracticeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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

  // --- VISTA 1: MENÚ DE SELECCIÓ ---
  if (!selectedTopic) {
    return (
      <div className="max-w-6xl mx-auto min-h-screen bg-gray-50 p-6 animate-in fade-in">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-900 font-bold flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-5 h-5" /> Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Grammar Lab 🧪</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Object.keys(TOPICS) as TopicKey[]).map((key) => (
            <button
              key={key}
              onClick={() => { setSelectedTopic(key); setActiveTab("theory"); setPracticeData(null); }}
              className={`p-8 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] shadow-sm group ${TOPICS[key].color}`}
            >
              <div className="mb-4 bg-white w-14 h-14 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                {TOPICS[key].icon}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{TOPICS[key].title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{TOPICS[key].desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- VISTA 2: DINS DEL TEMA ---
  const currentTopic = TOPICS[selectedTopic];

  return (
    <div className="max-w-5xl mx-auto min-h-screen bg-gray-50 p-6 animate-in slide-in-from-right-8 duration-300">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setSelectedTopic(null)} className="text-gray-500 hover:text-gray-900 font-bold flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Topics
        </button>
        <h1 className="text-3xl font-bold text-gray-800">{currentTopic.title}</h1>
      </div>

      {/* TABS */}
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

      {/* CONTENT */}
      <div>
        {/* TEORIA */}
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

        {/* PRÀCTICA */}
        {activeTab === "practice" && (
          <div className="w-full">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p>Generating {currentTopic.title} Challenges...</p>
              </div>
            ) : practiceData ? (
              <ExercisePlayer data={practiceData} onBack={() => setActiveTab("theory")} />
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