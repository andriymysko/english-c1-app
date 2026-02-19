import { Check, Loader2, Zap, Crown, Star, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Pricing() {
  const { user } = useAuth();
  
  // 🔥 LLEGIM L'ESTAT VIP DIRECTAMENT (Sense retards gràcies al teu AuthContext)
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
    <div className="max-w-6xl mx-auto px-4 py-12 animate-in fade-in duration-700">
      
      {/* --- HEADER CONDICIONAL --- */}
      <div className="text-center mb-12 space-y-4">
        {isVip ? (
            <>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">Your Subscription</h2>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                    You are currently a <span className="text-yellow-600 font-bold">VIP Member</span>. Enjoy your unlimited access!
                </p>
            </>
        ) : (
            <>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">Upgrade your Plan</h2>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                    Choose the best option to ace your C1 Exam. Unlocking full access increases your passing rate by 40%.
                </p>
            </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
      
        {/* --- WEEKLY PLAN (Només el mostrem si NO ets VIP) --- */}
        {!isVip && (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col relative group">
              <div className="absolute top-0 left-0 w-full h-2 bg-gray-200 rounded-t-3xl"></div>
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Zap className="w-5 h-5 text-gray-400" /> Cramming Week
              </h3>
              <div className="my-6">
                <span className="text-4xl font-black text-gray-900">3.49€</span>
                <span className="text-gray-500 font-medium"> / week</span>
              </div>
              <p className="text-gray-500 mb-8 leading-relaxed">Perfect for last-minute exam prep. Cancel anytime.</p>
              
              <button 
                  onClick={() => handleBuy(PRODUCT_TYPES.WEEKLY)} 
                  disabled={loadingId !== null}
                  className="w-full py-3.5 border-2 border-gray-900 text-gray-900 font-bold rounded-xl hover:bg-gray-900 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                  {loadingId === PRODUCT_TYPES.WEEKLY ? <Loader2 className="animate-spin w-5 h-5"/> : "Buy 1 Week"}
              </button>
            </div>
        )}

        {/* --- SEASON PASS (VIP) --- */}
        {/* Canviem l'estil si està actiu: Fons blanc amb vora daurada en lloc de fons negre */}
        <div className={`p-8 rounded-3xl shadow-2xl transform md:-translate-y-4 relative flex flex-col ring-4 
            ${isVip ? 'bg-white border-2 border-yellow-400 ring-yellow-100' : 'bg-gray-900 border border-gray-800 ring-yellow-400/30'}`}>
          
          <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-amber-500 text-xs font-black px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl text-black shadow-lg uppercase tracking-wider">
            {isVip ? 'CURRENT PLAN' : 'BEST VALUE'}
          </div>
          
          <h3 className={`text-xl font-bold flex items-center gap-2 ${isVip ? 'text-gray-900' : 'text-white'}`}>
            <Crown className="w-6 h-6 text-yellow-400" /> Season Pass
          </h3>
          <div className="my-6">
            <span className={`text-5xl font-black ${isVip ? 'text-gray-900' : 'text-white'}`}>29.99€</span>
            <span className="text-gray-400 font-medium"> / 3 mo</span>
          </div>
          <p className="text-gray-400 mb-8 text-sm">Full access for the whole term. Includes everything you need.</p>
          
          <ul className="space-y-4 mb-8 flex-grow">
              {/* Canviem el color del text de la llista segons el fons */}
              <li className={`flex gap-3 items-start ${isVip ? 'text-gray-700' : 'text-gray-200'}`}>
                  <div className="bg-green-500/20 p-1 rounded-full"><Check className="w-3 h-3 text-green-500"/></div>
                  <span className="font-medium">Unlimited Exercises</span>
              </li>
              <li className={`flex gap-3 items-start ${isVip ? 'text-gray-700' : 'text-gray-200'}`}>
                  <div className="bg-green-500/20 p-1 rounded-full"><Check className="w-3 h-3 text-green-500"/></div>
                  <span className="font-medium">15 Premium AI Corrections</span>
              </li>
              <li className={`flex gap-3 items-start ${isVip ? 'text-gray-700' : 'text-gray-200'}`}>
                  <div className="bg-green-500/20 p-1 rounded-full"><Check className="w-3 h-3 text-green-500"/></div>
                  <span className="font-medium">No Ads & Priority Support</span>
              </li>
          </ul>
          
          {/* BOTÓ CONDICIONAL */}
          {isVip ? (
              <button disabled className="w-full py-4 bg-green-100 text-green-700 font-bold text-lg rounded-xl flex justify-center items-center gap-2 cursor-default border border-green-200">
                  <ShieldCheck className="w-6 h-6"/> PLAN ACTIVE
              </button>
          ) : (
              <button 
                  onClick={() => handleBuy(PRODUCT_TYPES.SEASON)}
                  disabled={loadingId !== null}
                  className="w-full py-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black text-lg rounded-xl hover:shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:scale-[1.02] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                  {loadingId === PRODUCT_TYPES.SEASON ? <Loader2 className="animate-spin w-6 h-6"/> : "GET SEASON PASS"}
              </button>
          )}
        </div>

        {/* --- CORRECTION PACK (Sempre visible) --- */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-purple-200 rounded-t-3xl"></div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Star className="w-5 h-5 text-purple-400" /> Correction Pack
          </h3>
          <div className="my-6">
            <span className="text-4xl font-black text-gray-900">4.99€</span>
          </div>
          <p className="text-gray-500 mb-8 leading-relaxed">5 extra professional corrections for Writing & Speaking tasks.</p>
          
          <button 
              onClick={() => handleBuy(PRODUCT_TYPES.PACK5)}
              disabled={loadingId !== null}
              className="w-full py-3.5 border-2 border-purple-600 text-purple-700 font-bold rounded-xl hover:bg-purple-50 transition-all disabled:opacity-50 flex justify-center items-center gap-2 mt-auto"
          >
              {loadingId === PRODUCT_TYPES.PACK5 ? <Loader2 className="animate-spin w-5 h-5"/> : "Buy 5 Credits"}
          </button>
        </div>

      </div>
      
      <p className="text-center text-gray-400 text-sm mt-12">
        Secure payment powered by Stripe. {isVip ? "Manage your subscription in your profile." : "You can cancel subscriptions at any time."}
      </p>
    </div>
  );
}