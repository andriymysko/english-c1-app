import { ArrowLeft, Shield, FileText } from 'lucide-react';

export default function Legal({ type, onBack }: { type: 'privacy' | 'terms', onBack: () => void }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8 transition">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>

        {type === 'privacy' ? (
          <div className="prose prose-slate lg:prose-lg">
            <div className="flex items-center gap-3 mb-6 text-blue-600">
                <Shield className="w-8 h-8"/>
                <h1 className="text-4xl font-bold m-0 text-slate-900">Privacy Policy</h1>
            </div>
            <p className="text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h3>1. Introduction</h3>
            <p>Welcome to PrepAI. We respect your privacy and are committed to protecting your personal data.</p>
            
            <h3>2. Data We Collect</h3>
            <p>We may collect, use, store and transfer different kinds of personal data about you, including:</p>
            <ul>
                <li>Identity Data (email address).</li>
                <li>Technical Data (IP address, browser type).</li>
                <li>Usage Data (how you use our exercises).</li>
            </ul>

            <h3>3. How We Use Your Data</h3>
            <p>We use your data to provide the AI exercise generation service, process payments via Stripe, and improve our algorithms.</p>
            
            <h3>4. Data Security</h3>
            <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way.</p>
          </div>
        ) : (
          <div className="prose prose-slate lg:prose-lg">
            <div className="flex items-center gap-3 mb-6 text-slate-900">
                <FileText className="w-8 h-8"/>
                <h1 className="text-4xl font-bold m-0">Terms of Service</h1>
            </div>
            <p className="text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

            <h3>1. Acceptance of Terms</h3>
            <p>By accessing and using PrepAI, you accept and agree to be bound by the terms and provision of this agreement.</p>

            <h3>2. Description of Service</h3>
            <p>PrepAI provides AI-generated English exercises for exam preparation. The service is provided "as is" and we do not guarantee specific exam results.</p>

            <h3>3. Payments</h3>
            <p>Payments are processed securely via Stripe. We do not store your credit card information. Refunds are handled on a case-by-case basis.</p>

            <h3>4. User Conduct</h3>
            <p>You agree not to misuse the service or attempt to access it using automated methods.</p>
          </div>
        )}
      </div>
    </div>
  );
}