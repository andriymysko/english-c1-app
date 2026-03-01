import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, BookOpen, Layers, Flame, Loader2, CheckCircle2, XCircle, ExternalLink, Sparkles, Filter, Tag, Quote } from 'lucide-react';
import { fetchUserVocabulary } from '../api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

// 1. AMPLIEM LA INTERFÍCIE PER ACCEPTAR DADES RIQUES DE LA IA
interface VocabItem {
  word: string;
  mistakes: number;
  category?: string;   // ex: 'Phrasal Verb', 'Idiom', 'Collocation', 'Vocabulary'
  definition?: string; // ex: 'To cancel an event or agreement.'
  example?: string;    // ex: 'They had to call off the match due to the storm.'
}

interface Props {
  onBack: () => void;
}

const CATEGORIES = ['All', 'Phrasal Verbs', 'Idioms', 'Collocations', 'Grammar', 'Vocabulary'];

export default function VocabularyDeck({ onBack }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'flashcards'>('list');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const [fullVocab, setFullVocab] = useState<VocabItem[]>([]); 
  const [activeQueue, setActiveQueue] = useState<VocabItem[]>([]); 
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchUserVocabulary(user.uid).then((data: VocabItem[]) => {
        // Ordenem de més a menys errors
        const sortedData = data.sort((a, b) => b.mistakes - a.mistakes);
        
        // MOCKUP TEMPORAL: Si les dades del backend encara no tenen categories, 
        // n'assignem algunes genèriques per defecte perquè puguis veure com queda el disseny.
        const enrichedData = sortedData.map(item => ({
            ...item,
            category: item.category || (item.word.includes(' ') ? 'Phrasal Verbs' : 'Vocabulary'),
            definition: item.definition || 'Pending AI context generation...',
            example: item.example || `Make sure you understand the context of "${item.word}".`
        }));

        setFullVocab(enrichedData);
        setLoading(false);
      });
    }
  }, [user]);

  // Apliquem el filtre en temps real
  const filteredVocab = useMemo(() => {
      if (selectedCategory === 'All') return fullVocab;
      return fullVocab.filter(item => item.category?.toLowerCase() === selectedCategory.toLowerCase());
  }, [fullVocab, selectedCategory]);

  // Si canviem el filtre, reiniciem la sessió de flashcards amb les paraules filtrades
  useEffect(() => {
      setActiveQueue(filteredVocab);
      setCurrentIndex(0);
      setSessionCompleted(false);
      setIsFlipped(false);
  }, [filteredVocab]);

  const handleAssessment = (mastered: boolean) => {
    setIsFlipped(false);
    setTimeout(() => {
        if (mastered) {
            const newQueue = activeQueue.filter((_, idx) => idx !== currentIndex);
            setActiveQueue(newQueue);
            
            if (newQueue.length === 0) {
                setSessionCompleted(true);
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            } else {
                setCurrentIndex(prev => prev >= newQueue.length ? 0 : prev);
            }
        } else {
            setCurrentIndex((prev) => (prev + 1) % activeQueue.length);
        }
    }, 200);
  };

  const restartSession = () => {
      setActiveQueue(filteredVocab);
      setCurrentIndex(0);
      setSessionCompleted(false);
      setIsFlipped(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50">
        <Loader2 className="w-10 h-10 animate-spin text-slate-900 mb-4" />
        <p className="font-bold text-stone-500 uppercase tracking-widest text-sm">Loading your vault...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER CONTROLS */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
          <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-slate-900 transition-colors font-bold uppercase tracking-widest text-sm">
            <ArrowLeft className="w-5 h-5" /> Dashboard
          </button>
          
          <div className="bg-stone-200/60 p-1 rounded-sm shadow-inner flex gap-1 w-full md:w-auto">
            <button 
              onClick={() => setViewMode('list')} 
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-sm font-bold text-sm uppercase tracking-wider transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-stone-500 hover:text-slate-900'}`}
            >
              <BookOpen className="w-4 h-4" /> Audit Log
            </button>
            <button 
              onClick={() => setViewMode('flashcards')} 
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-sm font-bold text-sm uppercase tracking-wider transition-all ${viewMode === 'flashcards' ? 'bg-white text-slate-900 shadow-sm' : 'text-stone-500 hover:text-slate-900'}`}
            >
              <Layers className="w-4 h-4" /> Training
            </button>
          </div>
        </div>

        {/* NOU: BARRA DE FILTRES (NOMÉS VISIBLE SI HI HA DADES) */}
        {fullVocab.length > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-6 mb-2 custom-scrollbar border-b border-stone-200">
                <Filter className="w-4 h-4 text-stone-400 flex-shrink-0 mr-2" />
                {CATEGORIES.map(cat => {
                    const isActive = selectedCategory === cat;
                    return (
                        <button 
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`flex-shrink-0 px-4 py-2 rounded-sm font-bold text-[10px] uppercase tracking-widest border transition-colors ${isActive ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-white border-stone-200 text-stone-500 hover:border-slate-900 hover:text-slate-900'}`}
                        >
                            {cat}
                        </button>
                    )
                })}
            </div>
        )}

        {filteredVocab.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-sm border border-stone-200 shadow-sm mt-8">
            <Sparkles className="w-16 h-16 text-stone-200 mx-auto mb-4" />
            <h2 className="text-2xl font-serif font-black text-slate-900 mb-2">No entries found</h2>
            <p className="text-stone-500">You don't have any mistakes recorded in the "{selectedCategory}" category yet.</p>
          </div>
        ) : (
          <>
            {/* ---------------------------------------------------------------- */}
            {/* VISTA 1: AUDIT LOG (LLISTAT DETALLAT I FILTRABLE) */}
            {/* ---------------------------------------------------------------- */}
            {viewMode === 'list' && (
              <div className="grid grid-cols-1 gap-4 mt-6 animate-in fade-in">
                {filteredVocab.map((item, i) => (
                    <div key={i} className="bg-white border border-stone-200 p-6 rounded-sm shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-400 transition-colors">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-serif font-black text-2xl text-slate-900">{item.word}</h3>
                                <span className="bg-stone-100 text-stone-600 font-bold text-[10px] px-2 py-1 rounded-sm uppercase tracking-widest flex items-center gap-1">
                                    <Tag className="w-3 h-3"/> {item.category}
                                </span>
                            </div>
                            <p className="text-stone-600 font-medium text-sm mb-3">{item.definition}</p>
                            <p className="text-stone-500 italic font-serif flex items-start gap-2">
                                <Quote className="w-4 h-4 text-stone-300 flex-shrink-0 mt-0.5" /> 
                                "{item.example}"
                            </p>
                        </div>
                        <div className="flex flex-row md:flex-col items-center justify-between md:justify-center gap-3 border-t md:border-t-0 md:border-l border-stone-100 pt-4 md:pt-0 md:pl-6 min-w-[120px]">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Error Rate</span>
                            <span className="bg-red-50 text-red-700 border border-red-100 font-black text-lg px-4 py-2 rounded-sm flex items-center gap-2 shadow-sm">
                                <Flame className="w-4 h-4" /> {item.mistakes}
                            </span>
                        </div>
                    </div>
                ))}
              </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* VISTA 2: FLASHCARDS PROFESSIONALS (ENTRENAMENT) */}
            {/* ---------------------------------------------------------------- */}
            {viewMode === 'flashcards' && (
              <div className="flex flex-col items-center mt-12 animate-in fade-in slide-in-from-bottom-4">
                
                {sessionCompleted ? (
                    <div className="bg-white p-12 text-center rounded-sm border border-stone-200 shadow-sm w-full max-w-lg">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
                        <h2 className="text-3xl font-serif font-black text-slate-900 mb-4">Training Complete</h2>
                        <p className="text-stone-500 font-medium mb-8">You have successfully reviewed all your weak points in the <strong>{selectedCategory}</strong> category.</p>
                        <button onClick={restartSession} className="px-8 py-4 bg-slate-900 text-white font-bold uppercase tracking-widest text-xs rounded-sm hover:bg-slate-800 transition-colors shadow-sm w-full">
                            Train Again
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-8 text-xs font-bold text-stone-400 tracking-widest uppercase flex items-center gap-4">
                            <span className="w-8 h-px bg-stone-300"></span>
                            Remaining in {selectedCategory}: {activeQueue.length}
                            <span className="w-8 h-px bg-stone-300"></span>
                        </div>
                        
                        <div className="w-full max-w-xl h-[28rem] perspective-1000 group relative">
                            <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d shadow-md rounded-sm ${isFlipped ? 'rotate-y-180' : ''}`}>
                                
                                {/* FRONT OF CARD */}
                                <div 
                                    onClick={() => setIsFlipped(true)}
                                    className="absolute cursor-pointer w-full h-full backface-hidden bg-white border border-stone-200 rounded-sm flex flex-col items-center justify-center p-10 text-center hover:border-slate-900 hover:shadow-2xl transition-all"
                                >
                                    <div className="absolute top-6 left-6 bg-stone-100 text-stone-600 font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-sm flex items-center gap-1">
                                        <Tag className="w-3 h-3" /> {activeQueue[currentIndex]?.category}
                                    </div>
                                    <div className="absolute top-6 right-6 bg-red-50 text-red-700 font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-sm border border-red-100 flex items-center gap-1">
                                        <Flame className="w-3 h-3" /> {activeQueue[currentIndex]?.mistakes} Fails
                                    </div>
                                    
                                    <h3 className="text-5xl font-serif font-black text-slate-900 mb-8">{activeQueue[currentIndex]?.word}</h3>
                                    
                                    <div className="mt-8 pt-8 border-t border-stone-100 w-full">
                                        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest animate-pulse">
                                            Tap to reveal context & definition
                                        </p>
                                    </div>
                                </div>

                                {/* BACK OF CARD */}
                                <div className="absolute w-full h-full backface-hidden bg-slate-900 text-white border border-slate-800 rounded-sm flex flex-col p-10 rotate-y-180">
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col items-center text-center justify-center">
                                        <h3 className="text-4xl font-serif font-black mb-4 text-white">{activeQueue[currentIndex]?.word}</h3>
                                        <p className="text-stone-300 font-medium mb-6">{activeQueue[currentIndex]?.definition}</p>
                                        
                                        <div className="w-full bg-stone-800/50 p-6 rounded-sm border border-stone-700 mb-6">
                                            <p className="text-stone-200 font-serif italic text-lg leading-relaxed">
                                                "{activeQueue[currentIndex]?.example}"
                                            </p>
                                        </div>
                                        
                                        <a 
                                            href={`https://dictionary.cambridge.org/dictionary/english/${activeQueue[currentIndex]?.word.toLowerCase().replace(/\s+/g, '-')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 px-6 py-3 rounded-sm font-bold uppercase tracking-widest text-[10px] transition-colors"
                                        >
                                            <ExternalLink className="w-3 h-3" /> Dictionary
                                        </a>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-4 w-full mt-6 pt-6 border-t border-stone-800">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleAssessment(false); }} 
                                            className="flex-1 py-4 bg-red-600/10 border border-red-500/30 text-red-400 rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="w-4 h-4" /> Needs Work
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleAssessment(true); }} 
                                            className="flex-1 py-4 bg-green-500 text-slate-900 rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-green-400 transition-all flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Mastered
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}