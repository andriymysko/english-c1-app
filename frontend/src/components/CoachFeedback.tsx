import { Lock, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

// ✅ DEFINIM ELS TIPUS (Soluciona l'error "implicitly has an 'any' type")
interface Props {
    advice: string;
    weaknesses: string[]; // Ara diem explícitament que és una llista de textos
    isVip?: boolean;
}

export default function CoachFeedback({ advice, weaknesses, isVip }: Props) {
  
  // OPCIÓ A: USUARI VIP (Ho veu tot)
  if (isVip) {
    return (
      <div className="bg-green-50 p-6 rounded-xl border border-green-200 shadow-sm mt-6">
        <h3 className="font-bold text-green-900 text-lg mb-3">🧠 AI Coach Analysis</h3>
        
        {/* Advice Text */}
        <p className="text-green-800 leading-relaxed mb-4">
            {advice}
        </p>

        {/* ✅ ARA FEM SERVIR LA VARIABLE 'weaknesses' (Soluciona l'error "value never read") */}
        {weaknesses && weaknesses.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
                {weaknesses.map((w, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs font-bold bg-white text-green-700 px-3 py-1 rounded-full border border-green-200 shadow-sm">
                        <AlertTriangle className="w-3 h-3" /> {w}
                    </span>
                ))}
            </div>
        )}
      </div>
    );
  }

  // OPCIÓ B: USUARI FREE (Blur / Teaser)
  return (
    <div className="relative mt-6 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
       {/* Contingut Difuminat (Blur) */}
       <div className="p-6 filter blur-[6px] opacity-60 select-none pointer-events-none">
          <h3 className="font-bold text-gray-800 text-lg mb-3">🧠 AI Coach Analysis</h3>
          <p className="text-gray-500 leading-relaxed">
            Based on your recent mistakes, you seem to struggle with <strong>inverted conditionals</strong>. 
            Next time, try to focus on the structure "Had I known..." to improve your score significantly.
            Keep an eye on prepositions as well.
          </p>
          <div className="flex gap-2 mt-4">
             <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs">Grammar</span>
             <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs">Phrasals</span>
          </div>
       </div>
       
       {/* Capa de Bloqueig (Overlay) */}
       <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 z-10">
          <div className="bg-white p-3 rounded-full shadow-lg mb-3">
             <Lock className="w-6 h-6 text-purple-600" />
          </div>
          <h4 className="font-bold text-gray-900">Unlock Personalized Feedback</h4>
          <p className="text-sm text-gray-500 mb-4">See exactly why you made mistakes.</p>
          
          <Link to="/pricing" className="bg-gray-900 text-white px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition hover:bg-black">
             Unlock Now
          </Link>
       </div>
    </div>
  );
}