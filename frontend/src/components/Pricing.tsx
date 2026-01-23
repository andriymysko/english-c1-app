import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Pricing() {
  const { user } = useAuth();

  const handleBuy = async (type: string) => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/create-checkout-session/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.uid, product_type: type }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert("Payment error");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
      
      {/* WEEKLY */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <h3 className="text-lg font-bold text-gray-800">Cramming Week</h3>
        <div className="my-4"><span className="text-3xl font-black text-gray-900">3.49€</span> / week</div>
        <p className="text-sm text-gray-500 mb-6">Perfect for last-minute exam prep.</p>
        <button onClick={() => handleBuy('weekly')} className="w-full py-2 border-2 border-gray-900 text-gray-900 font-bold rounded-xl hover:bg-gray-50">Buy 1 Week</button>
      </div>

      {/* SEASON (POPULAR) */}
      <div className="bg-gray-900 p-6 rounded-2xl border border-gray-900 shadow-xl transform scale-105 relative">
        <div className="absolute top-0 right-0 bg-yellow-400 text-xs font-bold px-3 py-1 rounded-bl-xl text-black">BEST VALUE</div>
        <h3 className="text-lg font-bold text-white">Season Pass</h3>
        <div className="my-4 text-white"><span className="text-4xl font-black">29.99€</span> / 3 mo</div>
        <p className="text-sm text-gray-400 mb-6">Full access for the whole term. Includes 15 corrections.</p>
        <ul className="text-gray-300 text-sm space-y-2 mb-6">
            <li className="flex gap-2"><Check className="w-4 h-4 text-green-400"/> Unlimited Exercises</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-green-400"/> 15 Premium Corrections</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-green-400"/> No Ads</li>
        </ul>
        <button onClick={() => handleBuy('season')} className="w-full py-3 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100">Get Season Pass</button>
      </div>

      {/* CORRECTIONS */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <h3 className="text-lg font-bold text-gray-800">Correction Pack</h3>
        <div className="my-4"><span className="text-3xl font-black text-gray-900">4.99€</span></div>
        <p className="text-sm text-gray-500 mb-6">5 extra professional corrections for Writing & Speaking.</p>
        <button onClick={() => handleBuy('pack5')} className="w-full py-2 border-2 border-purple-600 text-purple-600 font-bold rounded-xl hover:bg-purple-50">Buy 5 Credits</button>
      </div>

    </div>
  );
}