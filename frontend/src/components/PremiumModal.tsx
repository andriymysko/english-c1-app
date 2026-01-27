import { X, Crown, Check, ArrowRight } from 'lucide-react';

interface Props {
    onClose: () => void;
    onGoToPricing: () => void;
}

export default function PremiumModal({ onClose, onGoToPricing }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl p-6 text-center m-4">
        
        {/* Botó tancar */}
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
        </button>

        <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Crown className="w-8 h-8 text-yellow-600" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">Bad Luck! No Ads Available.</h2>
        <p className="text-slate-500 mb-6">
            You hit your daily limit and there are no reward videos available right now. 
            <br/><span className="font-semibold text-slate-700">Upgrade to VIP to continue immediately.</span>
        </p>

        <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-3 border border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                <div className="bg-green-100 p-1 rounded-full"><Check className="w-3 h-3 text-green-600"/></div>
                Unlimited Exercises (No waiting)
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                <div className="bg-green-100 p-1 rounded-full"><Check className="w-3 h-3 text-green-600"/></div>
                Detailed AI Corrections
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                <div className="bg-green-100 p-1 rounded-full"><Check className="w-3 h-3 text-green-600"/></div>
                Priority Speaking Coach
            </div>
        </div>

        <div className="flex flex-col gap-3">
            <button 
                onClick={onGoToPricing}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg flex items-center justify-center gap-2"
            >
                See Pricing Plans <ArrowRight className="w-4 h-4" />
            </button>
            
            <button 
                onClick={onClose} 
                className="text-sm text-slate-400 hover:text-slate-600 font-medium"
            >
                I'll wait until tomorrow
            </button>
        </div>
      </div>
    </div>
  );
}