import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Layers, Flame, Loader2, CheckCircle2, XCircle, ExternalLink, Sparkles } from 'lucide-react';
import { fetchUserVocabulary } from '../api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

interface VocabItem {
  word: string;
  mistakes: number;
}

interface Props {
  onBack: () => void;
}

export default function VocabularyDeck({ onBack }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'flashcards'>('flashcards');
  
  // Estats per a l'algorisme de repàs
  const [fullVocab, setFullVocab] = useState<VocabItem[]>([]); // La llista original
  const [activeQueue, setActiveQueue] = useState<VocabItem[]>([]); // La cua de la sessió actual
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchUserVocabulary(user.uid).then((data: VocabItem[]) => {
        // Ordenem perquè surtin primer les paraules amb més errors
        const sortedData = data.sort((a, b) => b.mistakes - a.mistakes);
        setFullVocab(sortedData);
        setActiveQueue(sortedData);
        setLoading(false);
      });
    }
  }, [user]);

  // --- LÒGICA DE REPETICIÓ ESPAIADA (SRS) ---
  const handleAssessment = (mastered: boolean) => {
    setIsFlipped(false);
    
    setTimeout(() => {
        if (mastered) {
            // Si l'ha encertat, l'eliminem de la cua de la sessió actual
            const newQueue = activeQueue.filter((_, idx) => idx !== currentIndex);
            setActiveQueue(newQueue);
            
            if (newQueue.length === 0) {
                setSessionCompleted(true);
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            } else {
                // Si la cua s'ha reduït, ens assegurem que l'índex no es passi del límit
                setCurrentIndex(prev => prev >= newQueue.length ? 0 : prev);
            }
        } else {
            // Si falla, passem a la següent targeta i aquesta es queda a la cua per tornar a sortir
            setCurrentIndex((prev) => (prev + 1) % activeQueue.length);
        }
    }, 200);
  };

  const restartSession = () => {
      setActiveQueue(fullVocab);
      setCurrentIndex(0);
      setSessionCompleted(false);
      setIsFlipped(false);
  };

  // --- RENDERS ---
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
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
          <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-slate-900 transition-colors font-bold uppercase tracking-widest text-sm">
            <ArrowLeft className="w-5 h-5" /> Dashboard
          </button>
          
          <div className="bg-stone-200/60 p-1 rounded-sm shadow-inner flex gap-1 w-full md:w-auto">
            <button 
              onClick={() => setViewMode('flashcards')} 
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-sm font-bold text-sm uppercase tracking-wider transition-all ${viewMode === 'flashcards' ? 'bg-white text-slate-900 shadow-sm' : 'text-stone-500 hover:text-slate-900'}`}
            >
              <Layers className="w-4 h-4" /> Training
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-sm font-bold text-sm uppercase tracking-wider transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-stone-500 hover:text-slate-900'}`}
            >
              <BookOpen className="w-4 h-4" /> Audit Log
            </button>
          </div>
        </div>

        {fullVocab.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-sm border border-stone-200 shadow-sm">
            <Flame className="w-16 h-16 text-stone-200 mx-auto mb-4" />
            <h2 className="text-2xl font-serif font-black text-slate-900 mb-2">Your vault is empty!</h2>
            <p className="text-stone-500">Make some mistakes in the Use of English exercises to fill this up. Mistakes are the first step to C1 mastery.</p>
          </div>
        ) : (
          <>
            {/* VIEW MODE: LIST (AUDIT LOG) */}
            {viewMode === 'list' && (
              <div className="bg-white rounded-sm border border-stone-200 shadow-sm overflow-hidden animate-in fade-in">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="p-6 font-bold text-stone-500 uppercase tracking-widest text-xs">Vocabulary Target</th>
                      <th className="p-6 font-bold text-stone-500 uppercase tracking-widest text-xs text-right">Error Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fullVocab.map((item, i) => (
                      <tr key={i} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                        <td className="p-6">
                            <span className="font-serif font-bold text-xl text-slate-900">{item.word}</span>
                        </td>
                        <td className="p-6 text-right">
                          <span className="bg-red-50 text-red-700 border border-red-100 font-black text-xs px-3 py-1.5 rounded-sm uppercase tracking-wider inline-flex items-center gap-1.5">
                            <Flame className="w-3 h-3" /> {item.mistakes}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW MODE: FLASHCARDS (TRAINING) */}
            {viewMode === 'flashcards' && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
                
                {sessionCompleted ? (
                    <div className="bg-white p-12 text-center rounded-sm border border-stone-200 shadow-sm w-full max-w-lg">
                        <Sparkles className="w-16 h-16 text-green-500 mx-auto mb-6" />
                        <h2 className="text-3xl font-serif font-black text-slate-900 mb-4">Vault Cleared!</h2>
                        <p className="text-stone-500 font-medium mb-8">You have successfully reviewed all your weak points for this session. The algorithm will remember your progress.</p>
                        <button onClick={restartSession} className="px-8 py-4 bg-slate-900 text-white font-bold uppercase tracking-widest text-xs rounded-sm hover:bg-slate-800 transition-colors shadow-sm w-full">
                            Train Again
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 text-xs font-bold text-stone-400 tracking-widest uppercase flex items-center gap-4">
                            <span className="w-8 h-px bg-stone-300"></span>
                            Remaining in Queue: {activeQueue.length}
                            <span className="w-8 h-px bg-stone-300"></span>
                        </div>
                        
                        {/* THE CARD */}
                        <div 
                        className="w-full max-w-lg h-[24rem] perspective-1000 group relative"
                        >
                            <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d shadow-md rounded-sm ${isFlipped ? 'rotate-y-180' : ''}`}>
                                
                                {/* FRONT OF CARD (Question) */}
                                <div 
                                    onClick={() => setIsFlipped(true)}
                                    className="absolute cursor-pointer w-full h-full backface-hidden bg-white border border-stone-200 rounded-sm flex flex-col items-center justify-center p-8 text-center hover:border-slate-900 hover:shadow-xl transition-all"
                                >
                                    <h3 className="text-4xl md:text-5xl font-serif font-black text-slate-900 mb-8">{activeQueue[currentIndex]?.word}</h3>
                                    <p className="text-stone-400 font-bold text-xs uppercase tracking-widest animate-pulse">
                                        Tap to reveal context
                                    </p>
                                    <div className="absolute top-6 right-6 bg-red-50 text-red-700 font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-sm border border-red-100 flex items-center gap-1">
                                        <Flame className="w-3 h-3" /> {activeQueue[currentIndex]?.mistakes} Mistakes
                                    </div>
                                </div>

                                {/* BACK OF CARD (Action & Feedback) */}
                                <div className="absolute w-full h-full backface-hidden bg-slate-900 text-white border border-slate-800 rounded-sm flex flex-col items-center justify-between p-8 text-center rotate-y-180">
                                    <div className="flex-1 flex flex-col items-center justify-center w-full">
                                        <h3 className="text-4xl font-serif font-black mb-6 text-white">{activeQueue[currentIndex]?.word}</h3>
                                        <div className="w-12 h-1 bg-stone-700 mb-6"></div>
                                        
                                        {/* Botó del Diccionari de Cambridge */}
                                        <a 
                                            href={`https://dictionary.cambridge.org/dictionary/english/${activeQueue[currentIndex]?.word.toLowerCase().replace(/\s+/g, '-')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 px-6 py-3 rounded-sm font-bold uppercase tracking-widest text-xs transition-colors w-full"
                                        >
                                            <ExternalLink className="w-4 h-4" /> Cambridge Dictionary
                                        </a>
                                        <p className="text-stone-400 text-xs mt-4 italic">Check collocations and prepositions</p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-3 w-full mt-6">
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