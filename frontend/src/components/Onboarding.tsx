import { Target, Brain, ShieldAlert, ArrowRight } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-stone-50 flex flex-col items-center justify-center p-6 selection:bg-stone-200">
      <div className="max-w-2xl w-full bg-white border border-stone-200 shadow-xl p-10 md:p-16 rounded-sm text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <div className="w-16 h-16 bg-slate-900 rounded-sm flex items-center justify-center mx-auto mb-8 shadow-sm">
            <Brain className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-3xl md:text-5xl font-serif font-black text-slate-900 mb-6 tracking-tight">
            Profile Initialized.
        </h1>
        
        <p className="text-stone-500 text-lg md:text-xl font-medium leading-relaxed mb-12">
            Welcome to the C1 Assessment Engine. Before the algorithm can target your linguistic weaknesses, we must establish your baseline score.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 text-left">
            <div className="p-6 border border-stone-200 rounded-sm bg-stone-50">
                <Target className="w-5 h-5 text-slate-900 mb-4" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-widest mb-2">1. The Diagnostic</h3>
                <p className="text-stone-500 text-sm font-medium leading-relaxed">Enter the Training Lab and select any 'Reading & Use of English' simulation to calibrate the system to your current level.</p>
            </div>
            <div className="p-6 border border-stone-200 rounded-sm bg-stone-50">
                <ShieldAlert className="w-5 h-5 text-slate-900 mb-4" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-widest mb-2">2. The Mutation</h3>
                <p className="text-stone-500 text-sm font-medium leading-relaxed">Your mistakes will be logged instantly. The system will force you to face them in future hybrid exams.</p>
            </div>
        </div>

        <button 
            onClick={onComplete}
            className="w-full md:w-auto px-10 py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-sm hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center gap-3 mx-auto"
        >
            ACCESS TRAINING LAB <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}