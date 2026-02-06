import { Lock, Play } from 'lucide-react';

interface Props {
    isVip?: boolean;
    audioUrl?: string;
    onUnlock: () => void; // <--- REP LA FUNCIÓ
}

export default function AudioPlayerLocked({ isVip, audioUrl, onUnlock }: Props) {

  if (isVip) {
      return (
          <audio controls className="w-full mt-4 shadow-sm rounded-full">
              <source src={audioUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
          </audio>
      );
  }

  // Teaser Bloquejat
  return (
    <div className="relative bg-white rounded-2xl mt-6 border border-gray-200 shadow-md overflow-hidden w-full max-w-md mx-auto h-40 group cursor-pointer"
         onClick={onUnlock}> {/* Tot el requadre és clicable */}
        
        <div className="absolute inset-0 p-6 flex items-center gap-6 filter blur-[4px] opacity-40 bg-gray-50 select-none">
            <div className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center">
                <Play className="text-white w-6 h-6 fill-current"/>
            </div>
            <div className="flex-1 space-y-3">
                <div className="h-3 bg-gray-300 rounded-full w-full"></div>
                <div className="flex justify-between text-xs font-mono font-bold text-gray-400">
                    <span>00:00</span>
                    <span>03:45</span>
                </div>
            </div>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/50 hover:bg-white/40 transition-colors">
            <div className="bg-orange-100 p-2 rounded-full mb-2 shadow-sm">
                <Lock className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Audio Locked</h3>
            
            <button 
                onClick={(e) => {
                    e.stopPropagation(); // Evita doble clic
                    onUnlock();
                }}
                className="bg-gray-900 text-white text-xs px-5 py-2 rounded-full font-bold hover:bg-black transition shadow-lg flex items-center gap-2 transform hover:scale-105"
            >
                Upgrade to Listen
            </button>
        </div>
    </div>
  );
}