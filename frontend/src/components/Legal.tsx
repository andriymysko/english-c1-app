import { ArrowLeft, Shield, FileText, AlertTriangle } from 'lucide-react';

export default function Legal({ type, onBack }: { type: 'privacy' | 'terms', onBack: () => void }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 p-6 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-3xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8 transition font-medium">
          <ArrowLeft className="w-5 h-5" /> Back to App
        </button>

        {type === 'privacy' ? (
          // --- PRIVACY POLICY ---
          <div className="prose prose-slate lg:prose-lg">
            <div className="flex items-center gap-3 mb-6 text-blue-600">
                <Shield className="w-10 h-10"/>
                <h1 className="text-4xl font-bold m-0 text-slate-900">Privacy Policy</h1>
            </div>
            <p className="text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h3>1. Introduction</h3>
            <p>Welcome to PrepAI. We respect your privacy and are committed to protecting your personal data.</p>
            
            <h3>2. Data We Collect</h3>
            <p>We may collect, use, store and transfer different kinds of personal data about you, including:</p>
            <ul>
                <li><strong>Identity Data:</strong> Includes email address (via authentication).</li>
                <li><strong>Technical Data:</strong> Internet protocol (IP) address, browser type and version.</li>
                <li><strong>Usage Data:</strong> Information about how you use our exercises and your progress scores.</li>
            </ul>

            <h3>3. How We Use Your Data</h3>
            <p>We use your data to:</p>
            <ul>
                <li>Provide the AI exercise generation service using third-party LLMs (e.g., OpenAI).</li>
                <li>Process payments securely via Stripe.</li>
                <li>Analyze usage trends to improve our algorithms.</li>
            </ul>
            
            <h3>4. Data Security</h3>
            <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way. We do not sell your data to third parties.</p>
          </div>
        ) : (
          // --- TERMS OF SERVICE ---
          <div className="prose prose-slate lg:prose-lg">
            <div className="flex items-center gap-3 mb-6 text-slate-900">
                <FileText className="w-10 h-10"/>
                <h1 className="text-4xl font-bold m-0">Terms of Service</h1>
            </div>
            <p className="text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

            <h3>1. Acceptance of Terms</h3>
            <p>By accessing and using PrepAI, you accept and agree to be bound by the terms and provision of this agreement.</p>

            <h3>2. Description of Service</h3>
            <p>PrepAI provides AI-generated English exercises designed to help users prepare for advanced English exams. The service is provided "as is".</p>

            <h3>3. Payments & Subscriptions</h3>
            <p>Payments are processed securely via Stripe. We do not store your credit card information on our servers. Refunds are handled on a case-by-case basis according to consumer laws.</p>

            <h3>4. User Conduct</h3>
            <p>You agree not to misuse the service, share your account credentials, or attempt to access the API using automated methods (scraping).</p>

            {/* --- SECCIÓ NOVA: DISCLAIMER & IP --- */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg my-8 not-prose">
                <h3 className="text-xl font-bold text-amber-900 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-6 h-6" /> 5. Disclaimer & Intellectual Property
                </h3>
                <div className="text-amber-900/80 text-sm space-y-3 leading-relaxed">
                    <p>
                        <strong>AI-Generated Content:</strong> The exercises and texts provided in this application are generated dynamically using Artificial Intelligence. While based on CEFR C1/C2 standards, they are synthetic creations.
                    </p>
                    <p>
                        <strong>No Affiliation:</strong> PrepAI is an independent educational tool. We are <u>not affiliated with, endorsed by, or connected to</u> Cambridge Assessment English, the British Council, IDP IELTS, or any official examining body.
                    </p>
                    <p>
                        <strong>Fair Use:</strong> Any references to "Cambridge", "Advanced", "Proficiency", or "C1/C2" are used solely for descriptive purposes to indicate the level and style of the material (nominative fair use).
                    </p>
                </div>
            </div>

            <h3>6. Limitation of Liability</h3>
            <p>We do not guarantee specific exam results. PrepAI shall not be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use the service.</p>
          </div>
        )}
      </div>
    </div>
  );
}