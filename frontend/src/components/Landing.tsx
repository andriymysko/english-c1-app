import React from 'react'; // Often needed for JSX in some setups
import { ArrowRight, Brain, Mic, Globe, ShieldCheck, Zap } from "lucide-react";

interface Props {
  onGetStarted: () => void;
  // Function to open legal documents
  onShowLegal: (type: 'privacy' | 'terms') => void;
}

export default function Landing({ onGetStarted, onShowLegal }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100">
      
      {/* NAVBAR */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-md">
              <Brain className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
              C1 Master
            </span>
          </div>
          <button 
            onClick={onGetStarted}
            className="px-5 py-2 text-sm font-bold text-gray-700 hover:text-blue-600 transition"
          >
            Log In
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="pt-32 pb-20 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-6 animate-in fade-in slide-in-from-bottom-4">
          <Zap className="w-3 h-3 fill-current" /> AI-Powered Exam Prep
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-tight mb-6 tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-700">
          Master the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">C1 Advanced</span> <br className="hidden md:block"/> with Artificial Intelligence.
        </h1>
        <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
          Unlimited practice for Reading, Writing, Listening, and Speaking. 
          Get instant feedback, pronunciation scoring, and personalized study plans.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <button 
            onClick={onGetStarted}
            className="px-8 py-4 bg-gray-900 text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-xl hover:shadow-2xl hover:bg-gray-800"
          >
            Start Practicing Free <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* FEATURES GRID */}
      <div className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Globe className="w-6 h-6 text-blue-600" />}
              title="Unlimited Content"
              desc="Never run out of exams. Our AI generates unique Reading and Use of English tasks instantly."
            />
            <FeatureCard 
              icon={<Mic className="w-6 h-6 text-purple-600" />}
              title="Speaking Coach"
              desc="Practice with realistic AI-generated images and get instant feedback on your fluency and vocabulary."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-6 h-6 text-emerald-600" />}
              title="Smart Correction"
              desc="Writing essays? Our AI examiner grades your work, fixes your mistakes, and provides model answers."
            />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="py-10 text-center text-gray-400 text-sm border-t border-gray-100 bg-slate-50">
        <div className="flex justify-center gap-6 mb-4 font-medium">
            <button onClick={() => onShowLegal('terms')} className="hover:text-slate-600 transition hover:underline underline-offset-4">Terms of Service</button>
            <button onClick={() => onShowLegal('privacy')} className="hover:text-slate-600 transition hover:underline underline-offset-4">Privacy Policy</button>
        </div>
        <p>© {new Date().getFullYear()} C1 Master AI. Built for Cambridge Students.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-100 hover:shadow-lg transition-all duration-300">
      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 leading-relaxed">
        {desc}
      </p>
    </div>
  );
}