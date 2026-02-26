import React from 'react';
import { ArrowRight, Brain, Target, ShieldCheck, PenTool, Sparkles, BookOpen } from "lucide-react";

interface Props {
  onGetStarted: () => void;
  onShowLegal: (type: 'privacy' | 'terms') => void;
}

export default function Landing({ onGetStarted, onShowLegal }: Props) {
  return (
    <div className="min-h-screen bg-stone-50 font-sans selection:bg-stone-200">
      
      {/* NAVBAR */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-sm flex items-center justify-center text-white shadow-sm">
              <span className="font-serif font-black text-sm">C1</span>
            </div>
            <span className="text-lg font-serif font-black text-slate-900 tracking-wide">
              getaidvanced
            </span>
          </div>
          <button 
            onClick={onGetStarted}
            className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-slate-900 border border-slate-900 rounded-sm hover:bg-slate-900 hover:text-white transition-colors"
          >
            Log In
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="pt-32 pb-20 px-6 text-center max-w-5xl mx-auto flex flex-col items-center">
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-white border border-stone-200 text-stone-500 text-[10px] font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5" /> Cambridge Assessment Engine
        </div>
        
        <h1 className="text-5xl md:text-7xl font-serif font-black text-slate-900 leading-tight mb-8 tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-4xl">
          Stop memorizing. <br className="hidden md:block"/> Start mastering the C1.
        </h1>
        
        <p className="text-lg md:text-xl text-stone-500 mb-12 max-w-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 font-medium">
          The elite simulation platform that tracks your linguistic weaknesses, generates mutated mock exams, and provides examiner-grade feedback in real time.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 w-full sm:w-auto">
          <button 
            onClick={onGetStarted}
            className="px-8 py-5 bg-slate-900 text-white rounded-sm font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors shadow-md w-full sm:w-auto"
          >
            Enter the Simulator <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SOCIAL PROOF BANNER */}
      <div className="border-y border-stone-200 bg-white py-8">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 text-center">
              <div className="flex items-center gap-2 text-stone-400 font-bold text-xs uppercase tracking-widest">
                  <Brain className="w-4 h-4" /> Adaptive Algorithm
              </div>
              <div className="flex items-center gap-2 text-stone-400 font-bold text-xs uppercase tracking-widest">
                  <Sparkles className="w-4 h-4" /> Official C1 Rubric
              </div>
              <div className="flex items-center gap-2 text-stone-400 font-bold text-xs uppercase tracking-widest">
                  <Target className="w-4 h-4" /> Targeted Diagnostics
              </div>
          </div>
      </div>

      {/* THE ARSENAL (FEATURES GRID) */}
      <div className="py-24 bg-stone-50">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-black text-slate-900 mb-4">The Methodology</h2>
            <p className="text-stone-500 font-medium max-w-2xl mx-auto">We don't just provide practice tests. We analyze your cognitive patterns to force improvement where you are statistically weakest.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 👇 S'HAN ELIMINAT ELS COLORS FIXOS DE LES ICONES. ARA HERETEN DEL PARE */}
            <FeatureCard 
              icon={<Target className="w-6 h-6" />}
              title="Dynamic Error Engine"
              desc="The system logs every grammatical mistake you make. When you are ready, it generates a custom 'Frankenstein' exam forcing you to face your exact weak points in completely new contexts."
            />
            <FeatureCard 
              icon={<PenTool className="w-6 h-6" />}
              title="Examiner-Grade Grading"
              desc="Submit essays and speaking recordings. Get graded instantly from 0 to 20 based on the official Cambridge criteria, including detailed corrections and a perfect C1 model answer."
            />
            <FeatureCard 
              icon={<BookOpen className="w-6 h-6" />}
              title="Infinite Vocabulary Vault"
              desc="Never run out of mock exams. Our AI generates complex Use of English and Listening tasks on demand, utilizing spaced repetition to ensure phrasal verbs and idioms stick."
            />
          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <div className="bg-slate-900 py-24 text-center border-y border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full bg-slate-800/50 blur-[100px] pointer-events-none"></div>
        <div className="max-w-3xl mx-auto px-6 relative z-10">
            <h2 className="text-4xl md:text-5xl font-serif font-black text-white mb-6">Ready to secure your C1?</h2>
            <p className="text-stone-400 text-lg mb-10 font-medium leading-relaxed">Join the platform that treats language acquisition as an exact science. Create your free account today and establish your baseline score.</p>
            <button 
                onClick={onGetStarted}
                className="px-10 py-5 bg-white text-slate-900 rounded-sm font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-stone-100 transition-colors shadow-xl mx-auto"
            >
                Start Free Trial
            </button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="py-12 text-center text-stone-400 text-xs uppercase tracking-widest font-bold bg-white">
        <div className="flex justify-center gap-8 mb-6">
            <button onClick={() => onShowLegal('terms')} className="hover:text-slate-900 transition-colors">Terms of Service</button>
            <button onClick={() => onShowLegal('privacy')} className="hover:text-slate-900 transition-colors">Privacy Policy</button>
        </div>
        <p>© {new Date().getFullYear()} Ethernals. getaidvanced C1 Simulator.</p>
      </footer>
    </div>
  );
}

// 👇 LA SOLUCIÓ DE TYPESCRIPT ÉS AQUÍ (SENSE React.cloneElement)
function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 md:p-10 rounded-sm bg-white border border-stone-200 hover:border-slate-900 transition-colors group flex flex-col h-full shadow-sm">
      <div className="w-14 h-14 bg-stone-50 border border-stone-200 rounded-sm flex items-center justify-center mb-6 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-colors">
        {icon}
      </div>
      <h3 className="text-2xl font-serif font-black text-slate-900 mb-4">{title}</h3>
      <p className="text-stone-500 leading-relaxed font-medium text-sm flex-grow">
        {desc}
      </p>
    </div>
  );
}