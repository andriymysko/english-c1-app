import { useState, useEffect } from 'react';
import { Lock, ArrowRight, Zap, Shuffle, AlertTriangle, Layers, MessageCircle, Settings, Link, Anchor, Puzzle, Hourglass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserStats } from '../api'; // 👈 Importa això!

const TOPICS = [
    { id: 'tenses', title: 'Advanced Conditionals', desc: "Mixed types, inversions, and 'if' alternatives.", icon: Shuffle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', isPremium: false },
    { id: 'inversions', title: 'Inversion & Emphasis', desc: "Negative adverbials, 'Little did I know', 'So/Such'.", icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', isPremium: true },
    { id: 'phrasals', title: 'C1 Phrasal Verbs', desc: '3-part verbs, abstract meanings, and collocations.', icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', isPremium: false },
    { id: 'idioms', title: 'Idiomatic Expressions', desc: "Speak like a native: 'See eye to eye', 'Cut corners'.", icon: MessageCircle, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100', isPremium: true },
    { id: 'passives', title: 'Advanced Passives', desc: 'Causatives (Have it done) & Impersonal structures.', icon: Settings, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100', isPremium: true },
    { id: 'linkers', title: 'Linkers & Cohesion', desc: "Structuring Essays: 'Nevertheless', 'Albeit', 'Thus'.", icon: Link, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', isPremium: false },
    { id: 'prepositions', title: 'Dependent Prepositions', desc: "The silent killer: 'Object TO', 'Capable OF', 'Insist ON'.", icon: Anchor, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', isPremium: true },
    { id: 'collocations', title: 'Advanced Collocations', desc: "Word partnerships: 'Bitterly disappointed', 'Torrential rain'.", icon: Puzzle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', isPremium: true },
    { id: 'wishes', title: 'Wishes & Regrets', desc: "'I wish I had known', 'It's high time we left'.", icon: Hourglass, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100', isPremium: false },
];

interface Props {
    onSelectTopic: (topicId: string) => void;
    onPremiumLocked: () => void;
}

export default function GrammarList({ onSelectTopic, onPremiumLocked }: Props) {
    const { user } = useAuth();
    
    // 🔥 NOUTAT: Estat local per controlar el VIP amb precisió
    // Inicialitzem amb el valor que ja tinguem (per evitar parpelleig), o false.
    const [isVip, setIsVip] = useState<boolean>((user as any)?.is_vip || false);

    useEffect(() => {
        if (user) {
            // 1. Si el context ja diu que és VIP, actualitzem ràpid
            if (user.is_vip) setIsVip(true);
            
            // 2. Verifiquem amb la BD per estar 100% segurs (en segon pla)
            getUserStats(user.uid).then(data => {
                if (data && data.is_vip) {
                    setIsVip(true);
                }
            });
        }
    }, [user]);

    const handleSelect = (topic: any) => {
        // Fem servir l'estat local 'isVip' que és més fiable
        const isLocked = topic.isPremium && !isVip;
        
        if (isLocked) {
            onPremiumLocked();
        } else {
            onSelectTopic(topic.id);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TOPICS.map(topic => {
                // Fem servir 'isVip' aquí també per pintar els cadenats correctament
                const isLocked = topic.isPremium && !isVip;

                const cardStyle = isLocked 
                    ? "bg-gray-100 border-gray-300 opacity-80" 
                    : `bg-white ${topic.border} hover:shadow-xl hover:scale-[1.02] hover:border-transparent`;

                const iconBg = isLocked ? "bg-gray-300 text-gray-500" : `${topic.bg} ${topic.color}`;
                const titleColor = isLocked ? "text-gray-500" : "text-gray-900 group-hover:text-blue-600";
                
                const IconComponent = isLocked ? Lock : topic.icon;

                return (
                    <div 
                        key={topic.id} 
                        onClick={() => handleSelect(topic)}
                        className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer group flex flex-col justify-between h-full overflow-hidden ${cardStyle}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-colors ${iconBg}`}>
                                <IconComponent className="w-7 h-7" />
                            </div>

                            {isLocked ? (
                                <span className="bg-gray-200 text-gray-600 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-gray-300 flex items-center gap-1">
                                    <Lock className="w-3 h-3" /> Locked
                                </span>
                            ) : (
                                topic.isPremium && (
                                    <span className="bg-yellow-100 text-yellow-800 text-[10px] px-3 py-1 rounded-full font-bold border border-yellow-200 flex items-center gap-1 shadow-sm">
                                        <Zap className="w-3 h-3 fill-yellow-800" /> PRO
                                    </span>
                                )
                            )}
                        </div>
                        
                        <div>
                            <h3 className={`font-bold text-lg mb-2 transition-colors ${titleColor}`}>
                                {topic.title}
                            </h3>
                            <p className="text-sm leading-relaxed text-gray-500">
                                {topic.desc}
                            </p>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <div className={`p-2 rounded-full transition-colors ${isLocked ? 'bg-transparent' : 'bg-gray-50 group-hover:bg-blue-50'}`}>
                                {isLocked ? (
                                    <Lock className="text-gray-400 w-5 h-5" />
                                ) : (
                                    <ArrowRight className="text-blue-500 w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}