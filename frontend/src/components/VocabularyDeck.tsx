import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Layers, RotateCcw, Flame, Loader2 } from 'lucide-react';
import { fetchUserVocabulary } from '../api';
import { useAuth } from '../context/AuthContext';

interface VocabItem {
  word: string;
  mistakes: number;
}

interface Props {
  onBack: () => void;
}

export default function VocabularyDeck({ onBack }: Props) {
  const { user } = useAuth();
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'flashcards'>('flashcards');
  
  // Estats per les Flashcards
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchUserVocabulary(user.uid).then((data) => {
        setVocab(data);
        setLoading(false);
      });
    }
  }, [user]);

  const handleNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % vocab.length);
    }, 150);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + vocab.length) % vocab.length);
    }, 150);
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
    <div className="min-h-screen bg-stone-50 p-6 md:p-12 animate-in fade-in">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
          <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-slate-900 transition-colors font-bold uppercase tracking-widest text-sm">
            <ArrowLeft className="w-5 h-5" /> Dashboard
          </button>
          
          {/* EL NOU TOGGLE ELEGANT */}
          <div className="bg-stone-200/60 p-1 rounded-sm shadow-inner flex gap-1 w-full md:w-auto">
            <button 
              onClick={() => setViewMode('flashcards')} 
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-sm font-bold text-sm uppercase tracking-wider transition-all ${viewMode === 'flashcards' ? 'bg-white text-slate-900 shadow-sm' : 'text-stone-500 hover:text-slate-900'}`}
            >
              <Layers className="w-4 h-4" /> Flashcards
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-sm font-bold text-sm uppercase tracking-wider transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-stone-500 hover:text-slate-900'}`}
            >
              <BookOpen className="w-4 h-4" /> Word List
            </button>
          </div>
        </div>

        {vocab.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-sm border border-stone-200 shadow-sm">
            <Flame className="w-16 h-16 text-stone-200 mx-auto mb-4" />
            <h2 className="text-2xl font-serif font-black text-slate-900 mb-2">Your vault is empty!</h2>
            <p className="text-stone-500">Make some mistakes in the Use of English exercises to fill this up. Mistakes are the first step to C1 mastery.</p>
          </div>
        ) : (
          <>
            {/* VIEW MODE: LIST */}
            {viewMode === 'list' && (
              <div className="bg-white rounded-sm border border-stone-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="p-6 font-bold text-stone-500 uppercase tracking-widest text-xs">Phrasal Verb / Word</th>
                      <th className="p-6 font-bold text-stone-500 uppercase tracking-widest text-xs text-right">Mistakes Made</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vocab.map((item, i) => (
                      <tr key={i} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                        <td className="p-6 font-serif font-bold text-xl text-slate-900">{item.word}</td>
                        <td className="p-6 text-right">
                          <span className="bg-stone-100 text-stone-600 border border-stone-200 font-black text-xs px-3 py-1.5 rounded-sm uppercase tracking-wider inline-flex items-center gap-1.5">
                            <Flame className="w-3 h-3" /> {item.mistakes}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW MODE: FLASHCARDS */}
            {viewMode === 'flashcards' && vocab.length > 0 && (
              <div className="flex flex-col items-center">
                <div className="mb-6 text-xs font-bold text-stone-400 tracking-widest uppercase flex items-center gap-2">
                  <span className="w-8 h-px bg-stone-300"></span>
                  Card {currentIndex + 1} of {vocab.length}
                  <span className="w-8 h-px bg-stone-300"></span>
                </div>
                
                {/* THE CARD */}
                <div 
                  className="w-full max-w-lg h-80 perspective-1000 cursor-pointer group"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d shadow-md hover:shadow-xl rounded-sm ${isFlipped ? 'rotate-y-180' : ''}`}>
                    
                    {/* FRONT OF CARD (Question/Mistakes) */}
                    <div className="absolute w-full h-full backface-hidden bg-white border border-stone-200 rounded-sm flex flex-col items-center justify-center p-8 text-center">
                      <Flame className="w-8 h-8 text-stone-200 mb-6" />
                      <h3 className="text-4xl font-serif font-black text-slate-900 mb-6">{vocab[currentIndex].word}</h3>
                      <p className="text-stone-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" /> Click to reveal context
                      </p>
                      <div className="absolute top-6 right-6 bg-stone-100 text-stone-500 font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-sm border border-stone-200 flex items-center gap-1">
                        <Flame className="w-3 h-3" /> {vocab[currentIndex].mistakes} Mistakes
                      </div>
                    </div>

                    {/* BACK OF CARD (Action/Definition area) */}
                    <div className="absolute w-full h-full backface-hidden bg-slate-900 text-white border border-slate-800 rounded-sm flex flex-col items-center justify-center p-8 text-center rotate-y-180">
                      <h3 className="text-3xl font-serif font-black mb-6 text-white">{vocab[currentIndex].word}</h3>
                      <div className="w-12 h-1 bg-stone-700 mb-6"></div>
                      <p className="text-stone-300 text-lg leading-relaxed font-medium">
                        (You struggled with this in a recent Use of English test. Make sure you memorize its context and prepositions!)
                      </p>
                    </div>

                  </div>
                </div>

                {/* CONTROLS */}
                <div className="flex items-center gap-4 mt-12 w-full max-w-lg">
                  <button onClick={handlePrevCard} className="flex-1 py-4 bg-white border border-stone-200 rounded-sm font-bold uppercase tracking-widest text-xs text-stone-500 hover:bg-stone-50 hover:text-slate-900 transition-all">
                    Previous
                  </button>
                  <button onClick={handleNextCard} className="flex-1 py-4 bg-slate-900 border border-slate-900 rounded-sm font-bold uppercase tracking-widest text-xs text-white hover:bg-slate-800 hover:shadow-lg transition-all transform active:scale-95">
                    Next Card
                  </button>
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}