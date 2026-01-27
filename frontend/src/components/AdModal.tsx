import { useState, useEffect } from 'react';
import { Gift, Timer } from 'lucide-react'; // Canviem icones per adaptar al nou disseny
import AdBanner from './AdBanner'; 

interface Props {
    onClose: () => void;
    onReward: () => void;
}

export default function AdModal({ onClose, onReward }: Props) {
  // L'usuari ha d'esperar 10 segons mirant l'anunci
  const [timeLeft, setTimeLeft] = useState(10);
  const [canClaim, setCanClaim] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) {
        const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timer);
    } else {
        setCanClaim(true);
    }
  }, [timeLeft]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl text-center">
        
        {/* Capçalera */}
        <div className="p-6 pb-2">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Gift className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Extra Life Available!</h2>
            <p className="text-slate-500 text-sm mt-1">
                Support AIdvanced by viewing this ad to unlock your reward.
            </p>
        </div>

        {/* --- ZONA DE L'ANUNCI REAL --- */}
        <div className="bg-slate-100 p-4 border-y border-slate-200 min-h-[250px] flex items-center justify-center relative">
             
             {/* IMPORTANT: 
                 1. 'dataAdClient': Ja he posat el teu ID real.
                 2. 'dataAdSlot': Has de crear un "Display Ad Unit" a Google AdSense 
                    i enganxar aquí el número que et donin.
             */}
             <AdBanner 
                dataAdClient="ca-pub-6220801511844436"
                dataAdSlot="1234567890"  // <--- SUBSTITUEIX AIXÒ PEL SLOT ID DE GOOGLE
                style={{ display: 'block', minHeight: '250px', width: '100%' }}
             />
             
             <span className="absolute top-1 right-2 text-[10px] text-slate-400 uppercase tracking-wide">Advertisement</span>
        </div>

        {/* Peu amb el botó */}
        <div className="p-6">
            {canClaim ? (
                <button 
                    onClick={onReward}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg hover:shadow-blue-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                    <Gift className="w-5 h-5" /> Claim Reward
                </button>
            ) : (
                <button 
                    disabled
                    className="w-full py-3 bg-slate-100 text-slate-400 rounded-xl font-bold flex items-center justify-center gap-2 cursor-wait"
                >
                    <Timer className="w-5 h-5 animate-pulse" /> 
                    Wait {timeLeft}s to claim...
                </button>
            )}

            <button 
                onClick={onClose} 
                className="mt-4 text-sm text-slate-400 hover:text-slate-600 font-medium"
            >
                No thanks, I'll stop for today
            </button>
        </div>
      </div>
    </div>
  );
}