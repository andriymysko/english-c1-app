import { Check, Loader2, Zap, Crown, Star, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Pricing() {
  const { user } = useAuth();
  
  const isVip = user?.is_vip || false;

  const [loadingId, setLoadingId] = useState<string | null>(null);

  const PRODUCT_TYPES = {
    WEEKLY: 'weekly',
    SEASON: 'season',
    PACK5: 'pack5'
  };

  const handleBuy = async (type: string) => {
    if (!user) {
        alert("Please log in to upgrade your plan.");
        return;
    }

    setLoadingId(type);

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      
      const response = await fetch(`${API_URL}/payment/create-checkout-session/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            user_id: user.uid,
            product_type: type 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Payment initialization failed");
      }

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error("Payment error:", e);
      alert("Could not connect to payment server. Please try again.");
    } finally {
        setLoadingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 animate-in fade-in duration-700 bg-stone-50 min-h-screen">
      
      {/* --- HEADER CONDICIONAL --- */}
      <div className="text-center mb-16 space-y-4">
        {isVip ? (
            <>
                <h2 className="text-4xl md:text-5xl font-serif font-black text-slate-900 tracking-tight">Your Subscription</h2>
                <p className="text-lg text-stone-500 max-w-2xl mx-auto font-medium">
                    You are currently a <span className="text-slate-900 font-bold">VIP Member</span>. Enjoy your unlimited access!
                </p>
            </>
        ) : (
            <>
                <h2 className="text-4xl md:text-5xl font-serif font-black text-slate-900 tracking-tight">Upgrade your Plan</h2>
                <p className="text-lg text-stone-500 max-w-2xl mx-auto font-medium">
                    Choose the best option to ace your C1 Exam. Unlocking full access increases your passing rate by 40%.
                </p>
            </>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-center gap-8 items-stretch max-w-4xl mx-auto">
      
        {/* --- WEEKLY PLAN (Només el mostrem si NO ets VIP) --- */}
        {!isVip && (
            <div className="flex-1 bg-white p-8 md:p-10 rounded-sm border border-stone-200 shadow-sm transition-all hover:border-slate-900 flex flex-col relative group">
              <h3 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-3">
                <Zap className="w-5 h-5 text-stone-400" /> Cramming Week
              </h3>
              <div className="mt-8 mb-6">
                <span className="text-4xl font-serif font-black text-slate-900">3.49€</span>
              </div>
              <p className="text-stone-500 text-sm mb-10 leading-relaxed font-medium">Perfect for last-minute exam prep. Cancel anytime.</p>
              
              <button 
                  onClick={() => handleBuy(PRODUCT_TYPES.WEEKLY)} 
                  disabled={loadingId !== null}
                  className="w-full mt-auto py-4 border border-slate-900 text-slate-900 font-bold uppercase tracking-widest text-xs rounded-sm hover:bg-slate-900 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                  {loadingId === PRODUCT_TYPES.WEEKLY ? <Loader2 className="animate-spin w-4 h-4"/> : "Buy 1 Week"}
              </button>
            </div>
        )}

        {/* --- SEASON PASS (VIP) --- */}
        <div className={`flex-[1.2] p-8 md:p-10 rounded-sm shadow-md relative flex flex-col
            ${isVip ? 'bg-stone-100 border border-stone-200' : 'bg-slate-900 border border-slate-800'}`}>
          
          <div className="absolute top-0 right-0 bg-stone-200 text-[10px] font-black px-4 py-2 text-slate-900 uppercase tracking-widest">
            {isVip ? 'CURRENT PLAN' : 'BEST VALUE'}
          </div>
          
          <h3 className={`text-2xl font-serif font-bold flex items-center gap-3 ${isVip ? 'text-slate-900' : 'text-white'}`}>
            <Crown className={`w-6 h-6 ${isVip ? 'text-stone-400' : 'text-stone-300'}`} /> Season Pass
          </h3>
          <div className="mt-8 mb-6">
            <span className={`text-5xl font-serif font-black ${isVip ? 'text-slate-900' : 'text-white'}`}>29.99€</span>
          </div>
          <p className={`text-sm mb-10 font-medium ${isVip ? 'text-stone-500' : 'text-stone-400'}`}>Full access for the whole term. Includes everything you need.</p>
          
          <ul className="space-y-4 mb-10 flex-grow">
              <li className={`flex gap-4 items-center text-sm font-medium ${isVip ? 'text-slate-700' : 'text-stone-300'}`}>
                  <div className={`p-1 rounded-sm ${isVip ? 'bg-stone-200 text-slate-900' : 'bg-slate-800 text-white'}`}><Check className="w-3 h-3"/></div>
                  <span>Unlimited Exercises</span>
              </li>
              <li className={`flex gap-4 items-center text-sm font-medium ${isVip ? 'text-slate-700' : 'text-stone-300'}`}>
                  <div className={`p-1 rounded-sm ${isVip ? 'bg-stone-200 text-slate-900' : 'bg-slate-800 text-white'}`}><Check className="w-3 h-3"/></div>
                  <span>15 Premium AI Corrections</span>
              </li>
              <li className={`flex gap-4 items-center text-sm font-medium ${isVip ? 'text-slate-700' : 'text-stone-300'}`}>
                  <div className={`p-1 rounded-sm ${isVip ? 'bg-stone-200 text-slate-900' : 'bg-slate-800 text-white'}`}><Check className="w-3 h-3"/></div>
                  <span>No Ads & Priority Support</span>
              </li>
          </ul>
          
          {/* BOTÓ CONDICIONAL */}
          {isVip ? (
              <div className="w-full mt-auto py-4 bg-stone-200 text-stone-500 font-bold uppercase tracking-widest text-xs rounded-sm flex justify-center items-center gap-2 cursor-default border border-stone-300">
                  <ShieldCheck className="w-4 h-4"/> PLAN ACTIVE
              </div>
          ) : (
              <button 
                  onClick={() => handleBuy(PRODUCT_TYPES.SEASON)}
                  disabled={loadingId !== null}
                  className="w-full mt-auto py-4 bg-white text-slate-900 font-black uppercase tracking-widest text-xs rounded-sm hover:bg-stone-100 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                  {loadingId === PRODUCT_TYPES.SEASON ? <Loader2 className="animate-spin w-4 h-4"/> : "GET SEASON PASS"}
              </button>
          )}
        </div>

        {/* --- CORRECTION PACK (Sempre visible) --- */}
        <div className="flex-1 bg-white p-8 md:p-10 rounded-sm border border-stone-200 shadow-sm transition-all hover:border-slate-900 flex flex-col relative">
          <h3 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-3">
            <Star className="w-5 h-5 text-stone-400" /> Correction Pack
          </h3>
          <div className="mt-8 mb-6">
            <span className="text-4xl font-serif font-black text-slate-900">4.99€</span>
          </div>
          <p className="text-stone-500 text-sm mb-10 leading-relaxed font-medium">5 extra professional corrections for Writing & Speaking tasks.</p>
          
          <button 
              onClick={() => handleBuy(PRODUCT_TYPES.PACK5)}
              disabled={loadingId !== null}
              className="w-full mt-auto py-4 border border-slate-900 text-slate-900 font-bold uppercase tracking-widest text-xs rounded-sm hover:bg-slate-900 hover:text-white transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
          >
              {loadingId === PRODUCT_TYPES.PACK5 ? <Loader2 className="animate-spin w-4 h-4"/> : "Buy 5 Credits"}
          </button>
        </div>

      </div>
      
      <div className="mt-16 text-center border-t border-stone-200 pt-8">
        <p className="text-stone-400 text-xs font-medium uppercase tracking-widest">
            Secure payment powered by Stripe. {isVip ? "Manage your subscription in your profile." : "You can cancel subscriptions at any time."}
        </p>
      </div>
    </div>
  );
}