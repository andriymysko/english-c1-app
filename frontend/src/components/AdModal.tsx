import { useState, useEffect } from 'react';
import { X, Loader2, PlayCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// IMPORTANT: Aquest component simula un anunci.
// En el futur, aquí posaries el codi de Google AdMob / AdSense.

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function AdModal({ onClose, onReward }: { onClose: () => void, onReward: () => void }) {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(10); // L'anunci dura 10 segons
  const [canClose, setCanClose] = useState(false);
  const [adState, setAdState] = useState<'loading' | 'playing' | 'finished'>('loading');

  useEffect(() => {
    // Simulem càrrega de l'anunci
    const loadTimer = setTimeout(() => {
      setAdState('playing');
    }, 1500);
    return () => clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (adState === 'playing') {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanClose(true);
            setAdState('finished');
            // Cridem al backend per donar la recompensa
            fetch(`${API_URL}/ad_reward/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: user?.uid }),
            }).then(() => onReward());
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [adState]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-700 m-4">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {adState === 'finished' ? 'Reward Granted' : `Ad ends in ${timeLeft}s`}
            </span>
            {canClose && (
                <button onClick={onClose} className="text-white hover:text-gray-300">
                    <X className="w-6 h-6" />
                </button>
            )}
        </div>

        {/* Content */}
        <div className="h-64 flex flex-col items-center justify-center p-8 text-center">
            {adState === 'loading' && <Loader2 className="w-10 h-10 text-white animate-spin" />}
            
            {adState === 'playing' && (
                <div className="animate-pulse">
                    <h3 className="text-2xl font-bold text-white mb-2">PRO VERSION</h3>
                    <p className="text-gray-400">Support the app to remove these ads.</p>
                    <div className="mt-6 p-4 bg-blue-600 rounded-lg text-white font-bold">
                        Great things are coming...
                    </div>
                </div>
            )}

            {adState === 'finished' && (
                <div className="text-green-400">
                    <PlayCircle className="w-16 h-16 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white">Reward Unlocked!</h3>
                    <p className="text-gray-400 mt-2">You can now generate another exercise.</p>
                    <button onClick={onClose} className="mt-6 px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200">
                        Close & Continue
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}