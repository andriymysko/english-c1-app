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
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="font-bold text-gray-500">Loading your vocabulary vault...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 animate-in fade-in">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-bold">
            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
          </button>
          
          <div className="bg-white p-1 rounded-xl shadow-sm border flex gap-1">
            <button 
              onClick={() => setViewMode('flashcards')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${viewMode === 'flashcards' ? 'bg-blue-50 text-blue-700' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              <Layers className="w-4 h-4" /> Flashcards
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${viewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              <BookOpen className="w-4 h-4" /> Word List
            </button>
          </div>
        </div>

        {vocab.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border shadow-sm">
            <Flame className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-gray-800 mb-2">Your vault is empty!</h2>
            <p className="text-gray-500">Make some mistakes in the Use of English exercises to fill this up. Mistakes are the first step to C1 mastery.</p>
          </div>
        ) : (
          <>
            {/* VIEW MODE: LIST */}
            {viewMode === 'list' && (
              <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-6 font-black text-gray-500 uppercase tracking-widest text-sm">Phrasal Verb / Word</th>
                      <th className="p-6 font-black text-gray-500 uppercase tracking-widest text-sm text-right">Mistakes Made</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vocab.map((item, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="p-6 font-bold text-lg text-gray-900 uppercase">{item.word}</td>
                        <td className="p-6 text-right">
                          <span className="bg-red-100 text-red-700 font-black px-3 py-1 rounded-full flex items-center gap-1 w-fit ml-auto">
                            <Flame className="w-4 h-4" /> {item.mistakes}
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
                <div className="mb-4 text-sm font-bold text-gray-400 tracking-widest uppercase">
                  Card {currentIndex + 1} of {vocab.length}
                </div>
                
                {/* THE CARD */}
                <div 
                  className="w-full max-w-lg h-80 perspective-1000 cursor-pointer group"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d shadow-xl rounded-3xl ${isFlipped ? 'rotate-y-180' : ''}`}>
                    
                    {/* FRONT OF CARD (Question/Mistakes) */}
                    <div className="absolute w-full h-full backface-hidden bg-white border-2 border-blue-100 rounded-3xl flex flex-col items-center justify-center p-8 text-center">
                      <Flame className="w-8 h-8 text-red-400 mb-4 opacity-50" />
                      <h3 className="text-3xl font-black text-gray-800 uppercase mb-4">{vocab[currentIndex].word}</h3>
                      <p className="text-gray-400 font-medium flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" /> Click to reveal
                      </p>
                      <div className="absolute top-6 right-6 bg-red-50 text-red-600 font-black text-xs px-3 py-1 rounded-full">
                        {vocab[currentIndex].mistakes} Mistakes
                      </div>
                    </div>

                    {/* BACK OF CARD (Action/Definition area) */}
                    <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-2 border-indigo-500 rounded-3xl flex flex-col items-center justify-center p-8 text-center rotate-y-180">
                      <h3 className="text-3xl font-black uppercase mb-6">{vocab[currentIndex].word}</h3>
                      <p className="text-blue-100 text-lg leading-relaxed font-medium">
                        (You struggled with this in a recent Use of English test. Make sure you memorize its context!)
                      </p>
                    </div>

                  </div>
                </div>

                {/* CONTROLS */}
                <div className="flex items-center gap-6 mt-10">
                  <button onClick={handlePrevCard} className="px-6 py-3 bg-white border-2 rounded-xl font-bold text-gray-600 hover:bg-gray-50 hover:shadow-md transition-all">
                    Previous
                  </button>
                  <button onClick={handleNextCard} className="px-8 py-3 bg-gray-900 border-2 border-gray-900 rounded-xl font-black text-white hover:bg-black hover:shadow-xl transition-all hover:-translate-y-1">
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