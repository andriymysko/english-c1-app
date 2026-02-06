import { useState, useEffect } from 'react';
import { Gift, Timer, Star, X, Lock } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import AdBanner from './AdBanner'; 

interface Props {
  isOpen: boolean;
  onClose: () => void;      // Tancar (cancel·lar)
  onComplete: () => void;   // L'usuari ha "pagat" amb temps (continuar a l'exercici)
}

export default function AdGateModal({ isOpen, onClose, onComplete }: Props) {
  const navigate = useNavigate();
  
  // Estat per decidir quina versió mostrem: 'google' o 'house' (el teu)
  const [variant, setVariant] = useState<'google' | 'house'>('google');
  
  // Timer logic
  const [timeLeft, setTimeLeft] = useState(10);
  const [canClaim, setCanClaim] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 🎲 50% de probabilitat
      const isGoogle = Math.random() > 0.5;
      setVariant(isGoogle ? 'google' : 'house');
      
      // Reiniciem el timer cada cop que s'obre
      setTimeLeft(isGoogle ? 10 : 5); // Google 10s, el teu anunci 5s (més amable)
      setCanClaim(false);
    }
  }, [isOpen]);

  // Compte enrere
  useEffect(() => {
    if (!isOpen) return;
    
    if (timeLeft > 0) {
        const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timer);
    } else {
        setCanClaim(true);
    }
  }, [timeLeft, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl text-center">
        
        {/* --- OPCIÓ A: GOOGLE ADSENSE (Money Maker) --- */}
        {variant === 'google' && (
            <>
                <div className="p-6 pb-2">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Gift className="w-6 h-6 text-blue-600 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Sponsored Break</h2>
                    <p className="text-slate-500 text-sm">Watch this short ad to continue your free streak.</p>
                </div>

                <div className="bg-slate-100 p-4 border-y border-slate-200 min-h-[250px] flex items-center justify-center relative">
                     {/* ⚠️ POSA EL TEU SLOT ID DE GOOGLE ADSENSE AQUÍ */}
                     <AdBanner 
                        dataAdSlot="1234567890" 
                        format="rectangle"
                        style={{ display: 'block', minHeight: '250px', width: '100%' }}
                     />
                     <span className="absolute top-1 right-2 text-[10px] text-slate-400 uppercase tracking-wide">Advertisement</span>
                </div>
            </>
        )}

        {/* --- OPCIÓ B: HOUSE AD (Season Pass Upsell) --- */}
        {variant === 'house' && (
            <div className="bg-gray-900 text-white h-full relative overflow-hidden">
                {/* Decoració de fons */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-yellow-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-600 rounded-full blur-3xl opacity-20"></div>

                <div className="p-8 relative z-10">
                    <div className="mx-auto bg-gradient-to-br from-yellow-300 to-yellow-600 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-yellow-500/30 animate-bounce">
                        <Star className="w-8 h-8 text-black fill-black" />
                    </div>
                    
                    <h2 className="text-2xl font-black mb-2">Tired of waiting?</h2>
                    <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                        Upgrade to the <strong>Season Pass</strong> to remove all ads, unlock <span className="text-yellow-400">Unlimited Speaking</span> and get detailed AI feedback.
                    </p>

                    <ul className="text-left text-sm space-y-3 mb-8 bg-white/5 p-4 rounded-xl border border-white/10">
                        <li className="flex gap-2 items-center"><X className="w-4 h-4 text-red-400"/> <span className="text-gray-400 line-through">Daily Limits</span></li>
                        <li className="flex gap-2 items-center"><X className="w-4 h-4 text-red-400"/> <span className="text-gray-400 line-through">Waiting for ads</span></li>
                        <li className="flex gap-2 items-center"><Lock className="w-4 h-4 text-yellow-400"/> <span className="font-bold text-white">Unlock Full Exam Mode</span></li>
                    </ul>

                    <button 
                        onClick={() => navigate('/pricing')}
                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition mb-3"
                    >
                        Get Season Pass - 29.99€
                    </button>
                </div>
            </div>
        )}

        {/* --- BOTONS I TIMERS (COMUNS) --- */}
        <div className={`p-6 ${variant === 'house' ? 'bg-gray-900 pt-0' : 'bg-white'}`}>
            {canClaim ? (
                <button 
                    onClick={onComplete}
                    className={`w-full py-3 rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-2
                        ${variant === 'house' 
                            ? 'bg-transparent border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                        }`}
                >
                    {variant === 'house' ? "No thanks, continue to exercise" : "Continue to Exercise"}
                </button>
            ) : (
                <button 
                    disabled
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-wait
                        ${variant === 'house'
                            ? 'bg-gray-800 text-gray-500'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                >
                    <Timer className="w-5 h-5 animate-pulse" /> 
                    Wait {timeLeft}s...
                </button>
            )}

            {/* Només mostrem l'opció de sortir si és l'anunci de Google (per no ser tan agressius) */}
            {variant === 'google' && (
                <button 
                    onClick={onClose} 
                    className="mt-4 text-sm text-slate-400 hover:text-slate-600 font-medium"
                >
                    Cancel and go back
                </button>
            )}
        </div>

      </div>
    </div>
  );
}