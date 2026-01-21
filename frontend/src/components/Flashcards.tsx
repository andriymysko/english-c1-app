import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFlashcards, updateFlashcardStatus } from '../api'; // <--- Import nou
import { Loader2, ArrowLeft, Brain, BookOpen, Languages, PenTool, Check, X } from 'lucide-react';

interface Flashcard {
  id?: string; // Ara necessitem l'ID per actualitzar
  front: string;
  definition: string;
  translation: string;
  example: string;
  type: string;
  icon: string;
}

export default function Flashcards({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [updating, setUpdating] = useState(false); // Per evitar doble clic

  useEffect(() => {
    if (user) {
      loadCards();
    }
  }, [user]);

  const loadCards = () => {
    if (!user) return;
    setLoading(true);
    getFlashcards(user.uid)
      .then(data => {
        setCards(data.flashcards || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleRate = async (success: boolean) => {
    if (!user || updating) return;
    const currentCard = cards[currentIndex];
    
    // 1. Animació i UI
    setUpdating(true);
    
    // 2. Enviar al backend (Fire and forget, no esperem per fer-ho ràpid)
    if (currentCard.id) {
        updateFlashcardStatus(user.uid, currentCard.id, success);
    }

    // 3. Passar a la següent
    setTimeout(() => {
        setIsFlipped(false);
        setTimeout(() => {
            // Si hem acabat totes les targetes, recarreguem per reordenar
            if (currentIndex >= cards.length - 1) {
                setCurrentIndex(0);
                loadCards(); // Recarrega per portar noves prioritats
            } else {
                setCurrentIndex(prev => prev + 1);
            }
            setUpdating(false);
        }, 300); // Temps perquè la targeta giri abans de canviar el text
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-blue-600">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-lg font-medium">Preparing your study session...</p>
        <p className="text-sm text-gray-400">Prioritizing your mistakes</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-2xl shadow-xl border border-gray-100">
        <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800">No data yet</h2>
        <p className="text-gray-500 mb-6">Complete exercises to generate smart flashcards!</p>
        <button onClick={onBack} className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition">Go Back</button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="max-w-md mx-auto p-4 animate-in fade-in">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 justify-center">
            <Brain className="w-6 h-6 text-purple-600" />
            Smart Review
            </h2>
            <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">Spaced Repetition</p>
        </div>
        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      {/* CARD CONTAINER */}
      <div 
        onClick={() => !isFlipped && setIsFlipped(true)}
        className="relative h-[450px] w-full cursor-pointer group [perspective:1000px]"
      >
        <div 
          className={`relative w-full h-full duration-500 transition-transform [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
        >
          
          {/* --- FRONT --- */}
          <div className="absolute w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center text-white border-4 border-white/20 [backface-visibility:hidden]">
            <div className="text-7xl mb-6 drop-shadow-md">{currentCard.icon}</div>
            <h3 className="text-4xl font-extrabold text-center tracking-tight mb-2 drop-shadow-sm">{currentCard.front}</h3>
            <span className="mt-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wider border border-white/30">
              {currentCard.type}
            </span>
            <p className="absolute bottom-8 text-sm text-white/60 animate-pulse font-medium">Tap to reveal</p>
          </div>

          {/* --- BACK --- */}
          <div className="absolute w-full h-full bg-white rounded-3xl shadow-2xl p-8 flex flex-col justify-between border-2 border-gray-100 [transform:rotateY(180deg)] [backface-visibility:hidden]">
            
            <div className="space-y-6 overflow-y-auto max-h-[320px]">
              <div>
                <div className="flex items-center gap-2 text-blue-600 mb-1 font-bold text-xs uppercase tracking-widest">
                  <BookOpen className="w-4 h-4" /> Definition
                </div>
                <p className="text-gray-800 text-lg leading-snug font-medium">
                  {currentCard.definition}
                </p>
              </div>

              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                <div className="flex items-center gap-2 text-orange-600 mb-1 font-bold text-xs uppercase tracking-widest">
                  <Languages className="w-4 h-4" /> Translation
                </div>
                <p className="text-orange-900 text-lg font-serif italic">
                  {currentCard.translation}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-green-600 mb-1 font-bold text-xs uppercase tracking-widest">
                  <PenTool className="w-4 h-4" /> Example
                </div>
                <p className="text-gray-600 text-sm leading-relaxed italic border-l-2 border-green-200 pl-3">
                  "{currentCard.example}"
                </p>
              </div>
            </div>

            {/* --- ACTION BUTTONS (NOU!) --- */}
            <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
                <button 
                    onClick={(e) => { e.stopPropagation(); handleRate(false); }}
                    className="flex-1 py-3 rounded-xl bg-red-100 text-red-700 font-bold hover:bg-red-200 transition flex items-center justify-center gap-2 active:scale-95"
                >
                    <X className="w-6 h-6" />
                    Hard
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleRate(true); }}
                    className="flex-1 py-3 rounded-xl bg-green-100 text-green-700 font-bold hover:bg-green-200 transition flex items-center justify-center gap-2 active:scale-95"
                >
                    <Check className="w-6 h-6" />
                    Easy
                </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}