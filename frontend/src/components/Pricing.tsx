import { Check, Loader2, Zap, Crown, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Pricing() {
  const { user } = useAuth();
  
  // Estat per saber quin botó s'està carregant
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Constants per coincidir amb el teu backend (payment.py)
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

    setLoadingId(type); // Activem l'spinner

    try {
      // Fem servir la URL de l'entorn (Vercel)
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      
      const response = await fetch(`${API_URL}/create-checkout-session/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 👇 ENVIEM product_type PERQUÈ EL BACKEND HO ENTENGUI
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
      
      <div className="text-center mb-12 space-y-4">
        <h2 className="text-4xl font-black text-gray-900 tracking-tight">Upgrade your Plan</h2>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Choose the best option to ace your C1 Exam. Unlocking full access increases your passing rate by 40%.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
      
        {/* --- WEEKLY PLAN --- */}
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

        {/* --- SEASON PASS (VIP) --- */}
        <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800 shadow-2xl transform md:-translate-y-4 relative flex flex-col ring-4 ring-yellow-400/30">
          <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-amber-500 text-xs font-black px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl text-black shadow-lg uppercase tracking-wider">
            Best Value
          </div>
          
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-400" /> Season Pass
          </h3>
          <div className="my-6">
            <span className="text-5xl font-black text-white">29.99€</span>
            <span className="text-gray-400 font-medium"> / 3 mo</span>
          </div>
          <p className="text-gray-400 mb-8 text-sm">Full access for the whole term. Includes everything you need.</p>
          
          <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex gap-3 text-gray-200 items-start">
                  <div className="bg-green-500/20 p-1 rounded-full"><Check className="w-3 h-3 text-green-400"/></div>
                  <span className="font-medium">Unlimited Exercises</span>
              </li>
              <li className="flex gap-3 text-gray-200 items-start">
                  <div className="bg-green-500/20 p-1 rounded-full"><Check className="w-3 h-3 text-green-400"/></div>
                  <span className="font-medium">15 Premium AI Corrections</span>
              </li>
              <li className="flex gap-3 text-gray-200 items-start">
                  <div className="bg-green-500/20 p-1 rounded-full"><Check className="w-3 h-3 text-green-400"/></div>
                  <span className="font-medium">No Ads & Priority Support</span>
              </li>
          </ul>
          
          <button 
              onClick={() => handleBuy(PRODUCT_TYPES.SEASON)}
              disabled={loadingId !== null}
              className="w-full py-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black text-lg rounded-xl hover:shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:scale-[1.02] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
          >
              {loadingId === PRODUCT_TYPES.SEASON ? <Loader2 className="animate-spin w-6 h-6"/> : "GET SEASON PASS"}
          </button>
        </div>

        {/* --- CORRECTION PACK --- */}
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
        Secure payment powered by Stripe. You can cancel subscriptions at any time.
      </p>
    </div>
  );
}