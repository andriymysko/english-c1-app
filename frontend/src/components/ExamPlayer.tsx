import { useState, useEffect } from "react";
import { Timer, ArrowRight, Save, CheckCircle, AlertCircle } from "lucide-react";
import ExercisePlayer from "./ExercisePlayer";

interface ExamProps {
  examData: any;
  onExit: () => void;
}

export default function ExamPlayer({ examData, onExit }: ExamProps) {
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(examData.duration_minutes * 60); 
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Total de parts dinàmic (Ara seran 8)
  const totalParts = examData.parts.length;

  // CRONÒMETRE
  useEffect(() => {
    if (isSubmitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam(); 
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSubmitExam = () => {
    setIsSubmitted(true);
    // Aquí podries guardar totes les respostes a la DB si volguessis
  };

  const currentPart = examData.parts[currentPartIndex];

  // --- PANTALLA DE RESULTATS ---
  if (isSubmitted) {
    return (
      <div className="max-w-5xl mx-auto p-8 bg-white min-h-screen animate-in fade-in">
        <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
                Exam Completed
            </h1>
            <p className="text-gray-500">Review your answers below. Good luck!</p>
        </div>
        
        {/* NAVEGACIÓ RESULTATS (DINÀMICA) */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
            {examData.parts.map((p: any, idx: number) => (
                <button
                    key={idx}
                    onClick={() => setCurrentPartIndex(idx)}
                    className={`px-5 py-2 rounded-full whitespace-nowrap font-bold text-sm transition-all ${
                        currentPartIndex === idx 
                        ? 'bg-gray-900 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    {/* Truc visual: Si és reading_...1 mostra "Part 1" */}
                    {p.type.includes("reading") 
                        ? `Part ${p.type.replace(/\D/g, '')}` // Extreu el número
                        : `Part ${idx + 1}`
                    }
                </button>
            ))}
        </div>

        {/* MOSTREM L'EXERCICI AMB SOLUCIONS */}
        <div className="border-4 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <ExercisePlayer 
                key={currentPartIndex} 
                data={currentPart} 
                onBack={onExit} 
            />
        </div>
      </div>
    );
  }

  // --- PANTALLA D'EXAMEN ACTIU ---
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* BARRA SUPERIOR FLOTANT */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-50 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-2 rounded-lg bg-gray-100 border border-gray-200 ${timeLeft < 300 ? 'text-red-500 bg-red-50 border-red-100 animate-pulse' : 'text-gray-700'}`}>
                <Timer className="w-5 h-5" />
                {formatTime(timeLeft)}
            </div>
            
            <div className="hidden md:block">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Progress</span>
                <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-600 transition-all duration-500" 
                            style={{ width: `${((currentPartIndex + 1) / totalParts) * 100}%` }}
                        />
                    </div>
                    <span className="text-sm font-bold text-gray-600">
                        {currentPartIndex + 1}/{totalParts}
                    </span>
                </div>
            </div>
        </div>
        
        <button 
            onClick={handleSubmitExam}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition shadow-md hover:shadow-lg active:scale-95"
        >
            <Save className="w-4 h-4" />
            Finish Exam
        </button>
      </div>

      <div className="max-w-5xl mx-auto mt-8 px-4">
        {/* INFO BAR */}
        <div className="flex justify-between items-end mb-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">
                    {currentPart.type.includes("reading") 
                        ? `Reading & Use of English - Part ${currentPart.type.replace(/\D/g, '')}`
                        : currentPart.title
                    }
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                    Manage your time. You have about {Math.round(90 / totalParts)} minutes per part.
                </p>
            </div>
        </div>

        {/* TABS DE NAVEGACIÓ RÀPIDA */}
        <div className="flex flex-wrap gap-2 mb-6">
            {examData.parts.map((p: any, idx: number) => (
                <button
                    key={idx}
                    onClick={() => setCurrentPartIndex(idx)}
                    className={`flex-1 min-w-[60px] h-10 rounded-lg text-sm font-bold transition-all border-b-4 ${
                        currentPartIndex === idx 
                        ? 'bg-white border-blue-600 text-blue-600 shadow-sm -translate-y-1' 
                        : 'bg-gray-200 border-gray-300 text-gray-400 hover:bg-gray-300'
                    }`}
                >
                    Part {p.type.replace(/\D/g, '')}
                </button>
            ))}
        </div>

        {/* ÀREA DE L'EXERCICI */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[600px] border border-gray-100">
            {/* Missatge d'avís */}
            <div className="bg-blue-50/50 p-2 text-center text-blue-600 text-xs font-bold border-b border-blue-100 flex justify-center items-center gap-2">
                <AlertCircle className="w-3 h-3"/>
                Viewing Part {currentPartIndex + 1} of {totalParts}
            </div>
            
            <ExercisePlayer 
                key={currentPartIndex} 
                data={currentPart} 
                onBack={() => {}} 
            />
        </div>
        
        {/* NEXT BUTTON */}
        <div className="flex justify-end mt-8 mb-12">
            {currentPartIndex < totalParts - 1 ? (
                <button 
                    onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setCurrentPartIndex(p => p + 1);
                    }}
                    className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 transition shadow-xl hover:shadow-2xl"
                >
                    Next Part <ArrowRight className="w-5 h-5"/>
                </button>
            ) : (
                <div className="text-right">
                    <p className="text-gray-400 font-medium mb-2">You've reached the end.</p>
                    <button 
                        onClick={handleSubmitExam}
                        className="bg-red-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 transition shadow-xl animate-pulse"
                    >
                        Submit All Answers <Save className="w-5 h-5"/>
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}