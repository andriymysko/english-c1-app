import { ArrowLeft, Shield, FileText, AlertTriangle } from 'lucide-react';

export default function Legal({ type, onBack }: { type: 'privacy' | 'terms', onBack: () => void }) {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 p-6 md:p-12 animate-in fade-in duration-500 selection:bg-stone-200">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-14 rounded-sm border border-stone-200 shadow-sm">
        
        <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-slate-900 mb-10 transition-colors font-bold uppercase tracking-widest text-xs">
          <ArrowLeft className="w-4 h-4" /> Back to Application
        </button>

        {type === 'privacy' ? (
          // --- PRIVACY POLICY ---
          <div className="prose prose-stone max-w-none">
            <div className="flex items-center gap-4 mb-8 text-slate-900 border-b border-stone-100 pb-8">
                <div className="p-3 bg-stone-100 rounded-sm">
                    <Shield className="w-8 h-8"/>
                </div>
                <h1 className="text-3xl md:text-4xl font-serif font-black m-0">Privacy Policy</h1>
            </div>
            <p className="text-stone-400 font-bold text-xs uppercase tracking-widest mb-10">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h3 className="font-serif font-bold text-xl text-slate-900 mt-8 mb-4">1. Data We Collect</h3>
            <p className="text-stone-600 leading-relaxed mb-6">
                To provide our diagnostic services, we collect your email address (for authentication via Firebase), payment history (via Stripe, we do not store credit card numbers), and platform usage data, specifically including the English mistakes you make during exercises to power our Dynamic Error Engine.
            </p>

            <h3 className="font-serif font-bold text-xl text-slate-900 mt-8 mb-4">2. Voice and Audio Data (Speaking Practice)</h3>
            <p className="text-stone-600 leading-relaxed mb-6">
                When you use the Speaking Simulator, your microphone audio is recorded temporarily. This audio is sent securely to our third-party AI provider (OpenAI) strictly for speech-to-text transcription. <strong>We do not store your audio files permanently on our servers</strong>, nor are they used to train our internal models.
            </p>

            <h3 className="font-serif font-bold text-xl text-slate-900 mt-8 mb-4">3. Third-Party Processors</h3>
            <p className="text-stone-600 leading-relaxed mb-6">
                Your text inputs (essays, answers) are processed using OpenAI APIs. By policy, OpenAI does not use API data submitted by our users to train their public models. Your data remains private and is only used to generate your immediate feedback.
            </p>
            
            <h3 className="font-serif font-bold text-xl text-slate-900 mt-8 mb-4">4. Your Data Rights</h3>
            <p className="text-stone-600 leading-relaxed mb-6">
                You have the right to request the complete deletion of your account and diagnostic history at any time. To do so, please contact our support team. Upon deletion, your historical error pool and vocabulary vault will be permanently erased.
            </p>
          </div>
        ) : (
          // --- TERMS OF SERVICE ---
          <div className="prose prose-stone max-w-none">
            <div className="flex items-center gap-4 mb-8 text-slate-900 border-b border-stone-100 pb-8">
                <div className="p-3 bg-stone-100 rounded-sm">
                    <FileText className="w-8 h-8"/>
                </div>
                <h1 className="text-3xl md:text-4xl font-serif font-black m-0">Terms of Service</h1>
            </div>
            <p className="text-stone-400 font-bold text-xs uppercase tracking-widest mb-10">Last updated: {new Date().toLocaleDateString()}</p>

            {/* --- DISCLAIMER CRÍTIC --- */}
            <div className="bg-stone-50 border border-stone-200 p-6 md:p-8 rounded-sm my-10 not-prose">
                <h3 className="text-lg font-serif font-black text-slate-900 flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-stone-500" /> 1. Nature of Service and Disclaimer
                </h3>
                <div className="text-stone-600 text-sm space-y-4 leading-relaxed font-medium">
                    <p>
                        getaidvanced (operated by Ethernals) provides an AI-powered simulation and diagnostic tool for advanced English learning (C1 Level). 
                    </p>
                    <p className="text-slate-900 font-bold">
                        We are not affiliated, associated, authorized, endorsed by, or in any way officially connected with Cambridge University Press & Assessment or any of its subsidiaries.
                    </p>
                    <p>
                        Any references to "Advanced" or "C1" are used solely for descriptive purposes to indicate the CEFR level. The use of our service does not guarantee passing any official examination.
                    </p>
                </div>
            </div>

            <h3 className="font-serif font-bold text-xl text-slate-900 mt-8 mb-4">2. Artificial Intelligence Limitations</h3>
            <p className="text-stone-600 leading-relaxed mb-6">
                Our platform utilizes advanced Large Language Models (LLMs) to generate exercises and provide feedback. While we strive for absolute accuracy, AI-generated content may occasionally contain inconsistencies. The examiner-grade scores provided are estimates based on standard CEFR criteria and hold no official academic validity.
            </p>

            <h3 className="font-serif font-bold text-xl text-slate-900 mt-8 mb-4">3. Subscriptions and Payments</h3>
            <p className="text-stone-600 leading-relaxed mb-6">
                All payments are securely processed via Stripe. By purchasing a Season Pass or Weekly Plan, you grant us permission to charge the chosen payment method. Subscriptions can be canceled at any time through your profile. Due to the high computational costs of AI generation, we do not offer refunds for periods partially used.
            </p>

            <h3 className="font-serif font-bold text-xl text-slate-900 mt-8 mb-4">4. Fair Use Policy</h3>
            <p className="text-stone-600 leading-relaxed mb-6">
                Automated scraping, reverse engineering of our dynamic prompts, or sharing accounts to bypass generation limits is strictly prohibited and will result in immediate account termination without a refund.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}