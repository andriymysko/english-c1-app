import { Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

// URL del backend (detecta automàticament si és local o producció)
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// --- ⚠️ IMPORTANT: Substitueix aquests valors pels teus Price IDs de Stripe ⚠️ ---
// Els trobaràs a Stripe Dashboard > Catàleg de Productes > Clica al producte > Clica al preu > Copia l'ID (price_...)
const STRIPE_PRICES = {
    WEEKLY: "price_1SxB2sD8Zbei5I09AefaDGye",  // ID del pla setmanal
    SEASON: "price_1SxB4VD8Zbei5I09WKSBoxTE",  // ID del pla trimestral
    PACK5:  "price_1SxB5QD8Zbei5I095spVqILk"   // ID del pack de correccions
};

export default function Pricing() {
  const { user } = useAuth();
  
  // Estat per saber quin botó s'està carregant (per no bloquejar-los tots)
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
        alert("Please log in or sign up to upgrade!");
        // O redirigir a /login
        return;
    }

    setLoadingId(priceId); // Activem l'spinner al botó clicat

    try {
      const response = await fetch(`${API_URL}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            price_id: priceId, 
            user_id: user.uid 
        }),
      });

      const data = await response.json();
      
      if (data.url) {
        // Redirigim a la passarel·la segura de Stripe
        window.location.href = data.url;
      } else {
        alert("Error initializing payment. Please try again.");
      }
    } catch (e) {
      console.error("Payment error:", e);
      alert("Could not connect to payment server.");
    } finally {
        setLoadingId(null); // Desactivem l'spinner
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10 max-w-6xl mx-auto px-4">
      
      {/* --- WEEKLY PLAN --- */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col">
        <h3 className="text-lg font-bold text-gray-800">Cramming Week</h3>
        <div className="my-4"><span className="text-3xl font-black text-gray-900">3.49€</span> / week</div>
        <p className="text-sm text-gray-500 mb-6 flex-grow">Perfect for last-minute exam prep. Cancel anytime.</p>
        
        <button 
            onClick={() => handleSubscribe(STRIPE_PRICES.WEEKLY)} 
            disabled={loadingId !== null}
            className="w-full py-2 border-2 border-gray-900 text-gray-900 font-bold rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
            {loadingId === STRIPE_PRICES.WEEKLY && <Loader2 className="animate-spin w-4 h-4"/>}
            Buy 1 Week
        </button>
      </div>

      {/* --- SEASON PASS (DESTACAT) --- */}
      <div className="bg-gray-900 p-6 rounded-2xl border border-gray-900 shadow-xl transform md:-translate-y-2 relative flex flex-col">
        <div className="absolute top-0 right-0 bg-yellow-400 text-xs font-bold px-3 py-1 rounded-bl-xl text-black">BEST VALUE</div>
        <h3 className="text-lg font-bold text-white">Season Pass</h3>
        <div className="my-4 text-white"><span className="text-4xl font-black">29.99€</span> / 3 mo</div>
        <p className="text-sm text-gray-400 mb-6">Full access for the whole term. Includes 15 corrections.</p>
        
        <ul className="text-gray-300 text-sm space-y-2 mb-6 flex-grow">
            <li className="flex gap-2"><Check className="w-4 h-4 text-green-400"/> Unlimited Exercises</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-green-400"/> 15 Premium Corrections</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-green-400"/> No Ads</li>
        </ul>
        
        <button 
            onClick={() => handleSubscribe(STRIPE_PRICES.SEASON)}
            disabled={loadingId !== null}
            className="w-full py-3 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 disabled:opacity-50 flex justify-center items-center gap-2"
        >
            {loadingId === STRIPE_PRICES.SEASON && <Loader2 className="animate-spin w-4 h-4"/>}
            Get Season Pass
        </button>
      </div>

      {/* --- CORRECTION PACK --- */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col">
        <h3 className="text-lg font-bold text-gray-800">Correction Pack</h3>
        <div className="my-4"><span className="text-3xl font-black text-gray-900">4.99€</span></div>
        <p className="text-sm text-gray-500 mb-6 flex-grow">5 extra professional corrections for Writing & Speaking.</p>
        
        <button 
            onClick={() => handleSubscribe(STRIPE_PRICES.PACK5)}
            disabled={loadingId !== null}
            className="w-full py-2 border-2 border-purple-600 text-purple-600 font-bold rounded-xl hover:bg-purple-50 disabled:opacity-50 flex justify-center items-center gap-2"
        >
            {loadingId === STRIPE_PRICES.PACK5 && <Loader2 className="animate-spin w-4 h-4"/>}
            Buy 5 Credits
        </button>
      </div>

    </div>
  );
}