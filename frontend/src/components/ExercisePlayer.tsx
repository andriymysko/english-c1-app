import { useState, useEffect, useRef } from "react";
import { ArrowLeft, CheckCircle, Download, Eye, RefreshCw, XCircle, Send, Loader2, AlertCircle, Mic, StopCircle, Volume2, FileText, Sparkles, Image as ImageIcon, ChevronDown, Lock, PenTool, Clock, LayoutList, Users, ArrowRight } from "lucide-react";
import { preloadExercise, submitResult, gradeWriting, gradeSpeaking, transcribeAudio, fetchAudio } from "../api";
import { useAuth } from "../context/AuthContext";
import confetti from 'canvas-confetti';
import { playSuccessSound, playErrorSound } from "../utils/audioFeedback";
import AudioPlayerLocked from './AudioPlayerLocked';
import { toast } from 'sonner';

interface Question {
  question: string;
  stem?: string;
  options?: any[];
  answer: string;
  answer_type: string;
  explanation?: string;
  timestamp?: string;
  original_sentence?: string;
  second_sentence?: string;
  keyword?: string;
}

interface ExerciseData {
  id?: string;
  title: string;
  instructions: string;
  text: string;
  type: string;
  level: string;
  questions: Question[];
  image_urls?: string[]; 
  image_prompts?: string[];
  instruction?: string;
  content?: {
    input_text?: string;
    text?: string;
    question?: string;
    notes?: string[];
    opinions?: string[];
  };
  options?: Array<{
    id: string;
    type: string;
    title: string;
    text: string;
    tips: string;
  }>;
  part3_central_question?: string;
  part3_prompts?: string[];
  part3_decision_question?: string;
  part4_questions?: string[];
}

interface Props {
  data: ExerciseData;
  onBack: () => void;
  onOpenPricing: () => void; 
}

export default function ExercisePlayer({ data, onBack, onOpenPricing }: Props) {
  const { user } = useAuth();

  // -----------------------------------------------------------
  // 1. GESTIÓ DE SELECCIÓ (WRITING PART 2)
  // -----------------------------------------------------------
  const isChoiceMode = data.type === 'writing_choice';
  const [selectedOption, setSelectedOption] = useState<any>(null);

  // -----------------------------------------------------------
  // 2. GESTIÓ ESSAY/WRITING EXAM (PART 1 & PART 2)
  // -----------------------------------------------------------
  const isEssayExam = data.id === 'writing1' || data.type === 'essay' || (data.type === 'writing1' && data.content);
  const [essayAnswer, setEssayAnswer] = useState("");
  const [wordCount, setWordCount] = useState(0);

  // -----------------------------------------------------------
  // 3. ESTATS GENERALS & STANDARD MODE
  // -----------------------------------------------------------
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [loadingGrade, setLoadingGrade] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false); 

  const [showAnswers, setShowAnswers] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);

  const [inputText, setInputText] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // -----------------------------------------------------------
  // 4. ESTAT NOU: SPEAKING PART 3 (FASES)
  // -----------------------------------------------------------
  const [part3Phase, setPart3Phase] = useState<'discussion' | 'decision' | 'part4'>('discussion');

  // FLAGS
  const isWriting = data.type.startsWith("writing") && !isChoiceMode; 
  const isSpeaking = data.type.startsWith("speaking");
  const isSpeakingPart3 = data.type === "speaking3";
  const isListening = data.type.startsWith("listening");
  const isPart4 = data.type === "reading_and_use_of_language4";
  
  // ⚠️ FIX: Identifiquem Listening Part 2
  const isListeningPart2 = data.type === "listening2";
  
  // ⚠️ FIX: TREIEM 'listening2' d'aquesta llista perquè no entri en conflicte
  const isGapFill = ["reading_and_use_of_language1", "reading_and_use_of_language2", "reading_and_use_of_language3"].includes(data.type);
  
  const isInteractive = !isWriting && !isSpeaking && !isEssayExam && !selectedOption && !isChoiceMode;

  // --- HANDLERS ---

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"; 
      const response = await fetch(`${API_URL}/download_pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), 
      });
      if (!response.ok) throw new Error("Server failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(data.title || "Exercise").replace(/[^a-z0-9]/gi, '_').toLowerCase()}_task.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("PDF error:", error);
      alert("Failed to generate PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    window.history.pushState({ page: "exercise" }, "", "");
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      if (selectedOption) {
          setSelectedOption(null);
          setEssayAnswer("");
      } else {
          onBack();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [onBack, selectedOption]);

  useEffect(() => {
    setShowAnswers(false);
    setUserAnswers({});
    setScore(null);
    setFeedback(null);
    setInputText("");
    setEssayAnswer("");
    setShowTranscript(false);
    setSelectedOption(null);
    setPart3Phase('discussion'); // Reset speaking phase
  }, [data.id, data.title]);

  useEffect(() => {
    if (isInteractive) preloadExercise(data.type, data.level || "C1");
    if (isListening && data.text) {
      setLoadingAudio(true);
      fetchAudio(data.text).then(url => setAudioUrl(url)).finally(() => setLoadingAudio(false));
    }
  }, [data.type, data.level, isInteractive, isListening, data.text]);

  // --- WRITING EXAM HANDLERS ---
  const handleEssayChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setEssayAnswer(text);
    setWordCount(text.trim().split(/\s+/).filter(w => w.length > 0).length);
  };

  const submitWritingTask = async () => {
     if (wordCount < 220) {
       toast.warning("Too short!", { description: "Aim for at least 220 words for C1 level." });
       return;
     }
     setLoadingGrade(true);
     try {
       const taskPrompt = selectedOption 
           ? `TASK: ${selectedOption.title}\nINSTRUCTION: ${selectedOption.text}\nTIP: ${selectedOption.tips}`
           : (data.instruction + "\n" + (data.content?.question || data.text));
       
       const result = await gradeWriting(user?.uid || "anon", taskPrompt, essayAnswer);
       setFeedback(result);
       playSuccessSound();
       confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
     } catch (e) {
       alert("Error grading essay");
     } finally {
       setLoadingGrade(false);
     }
  };

  // --- STANDARD HANDLERS ---
  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        setIsTranscribing(true);
        try {
          const result = await transcribeAudio(audioBlob);
          setInputText(prev => prev + " " + result.text);
        } catch (err) { alert("Could not transcribe audio."); } finally { setIsTranscribing(false); }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { alert("Microphone denied."); }
  };

  const handleSubmitCreative = async () => {
    if (!user || !inputText) return;
    setLoadingGrade(true);
    try {
      const fullTask = isSpeakingPart3 
        ? JSON.stringify({ q: data.part3_central_question, d: data.part3_decision_question, p4: data.part4_questions }) 
        : (data.instructions + " " + (data.text || ""));
        
      let result;
      if (isWriting) result = await gradeWriting(user.uid, fullTask, inputText);
      else result = await gradeSpeaking(user.uid, fullTask, inputText);
      
      setFeedback(result);
      playSuccessSound();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (e) { alert("Error grading submission"); } finally { setLoadingGrade(false); }
  };

  const handleSelect = (qKey: string, value: string) => {
    if (showAnswers) return;
    setUserAnswers(prev => ({ ...prev, [qKey]: value }));
  };

  const cleanOptionText = (opt: any) => {
    let text = typeof opt === 'string' ? opt : opt.text || JSON.stringify(opt);
    return text.replace(/^[A-D][\.\)]\s*/i, "").trim();
  };

  const checkScore = async () => {
    let correct = 0;
    const mistakes: any[] = [];
    data.questions.forEach((q, idx) => {
      const key = q.question || idx.toString();
      const userAns = (userAnswers[key] || "").trim().toLowerCase();
      const cleanCorrectAnswer = cleanOptionText(q.answer).toLowerCase();
      const isCorrect = (userAns === cleanCorrectAnswer || userAns === q.answer.trim().toLowerCase());
      if (isCorrect) correct++;
      else mistakes.push({
        question: q.question, stem: q.stem || "", user_answer: userAnswers[key] || "", correct_answer: q.answer, type: data.type
      });
    });
    setScore(correct);
    setShowAnswers(true);
    if (correct > (data.questions.length / 2)) {
      playSuccessSound();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#2563eb', '#3b82f6', '#60a5fa'] });
    } else { playErrorSound(); }
    if (user) {
      submitResult({ user_id: user.uid, exercise_type: data.type, exercise_id: data.id || null, score: correct, total: data.questions.length, mistakes: mistakes });
    }
  };

  // --- RENDERITZADOR DE READING/USE OF ENGLISH (TEXT GAP FILL) ---
  const renderInteractiveText = () => {
    if (!data.text) return null;
    const parts = data.text.split(/\[\s*(\d+)\s*\]/g);
    return (
      <div className="leading-loose text-lg text-gray-800 font-serif text-justify">
        {parts.map((part, index) => {
          if (!isNaN(Number(part)) && part.trim() !== "") {
            const questionNumString = part.trim();
            const question = data.questions.find(q => q.question === questionNumString) || data.questions[parseInt(questionNumString) - 1];
            if (!question) return <span key={index} className="text-red-500 font-bold">[{part}]</span>;
            const qKey = question.question || index.toString();
            const userAnswer = userAnswers[qKey] || "";
            const isCorrect = showAnswers && (userAnswer.toLowerCase() === cleanOptionText(question.answer).toLowerCase());
            const isWrong = showAnswers && !isCorrect;
            const wrapperClass = `inline-flex items-center align-middle mx-1 my-1 rounded-md border shadow-sm transition-all overflow-hidden relative ${showAnswers ? (isCorrect ? "border-green-500 ring-1 ring-green-500" : "border-red-500 ring-1 ring-red-500") : "border-gray-300 bg-white hover:border-blue-400 focus-within:border-blue-500"}`;
            const badgeClass = `px-2 py-1.5 text-xs font-bold border-r select-none h-full flex items-center justify-center ${showAnswers ? (isCorrect ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300") : "bg-slate-100 text-slate-500 border-gray-200"}`;
            const inputClass = "outline-none bg-transparent px-2 py-1 text-base min-w-[80px] text-gray-800 font-sans h-full";
            return (
              <span key={index} className="group relative inline-block">
                <span className={wrapperClass}>
                  <span className={badgeClass}>{questionNumString}</span>
                  {data.type === "reading_and_use_of_language1" && question.options ? (
                    <div className="relative h-full">
                      <select value={userAnswer} onChange={(e) => handleSelect(qKey, e.target.value)} disabled={showAnswers} className={`${inputClass} appearance-none pr-7 cursor-pointer`}>
                        <option value="">Choose...</option>
                        {question.options.map((opt: any, i: number) => (<option key={i} value={cleanOptionText(opt)}>{cleanOptionText(opt)}</option>))}
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                    </div>
                  ) : (
                    <input type="text" value={userAnswer} onChange={(e) => handleSelect(qKey, e.target.value)} disabled={showAnswers} autoComplete="off" className={inputClass} style={{ width: `${Math.max(80, userAnswer.length * 10)}px` }} />
                  )}
                </span>
                {isWrong && <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"><span className="text-green-300 font-bold mr-1">✓</span> {cleanOptionText(question.answer)}</span>}
              </span>
            );
          }
          return <span key={index}>{part.replace(/_+/g, "")}</span>;
        })}
      </div>
    );
  };

  // --- RENDERITZADOR DE LISTENING PART 2 (SENTENCE COMPLETION) ---
  const renderListeningPart2 = () => {
    return (
        <div className="space-y-6">
            {data.questions.map((q, idx) => {
                const parts = (q.stem || q.question).split(/\[_*\]|\[\d+\]|________/); 
                const qKey = q.question || idx.toString();
                const userAnswer = userAnswers[qKey] || "";
                const cleanCorrectAnswer = cleanOptionText(q.answer);
                const isCorrect = showAnswers && (userAnswer.toLowerCase() === cleanCorrectAnswer.toLowerCase());
                const isWrong = showAnswers && !isCorrect;

                return (
                    <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="bg-orange-100 text-orange-800 font-bold rounded-lg w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">{q.question || idx + 1}</div>
                            <div className="leading-loose text-lg text-gray-800 font-serif flex-1">
                                {parts.map((part, i) => (
                                    <span key={i}>
                                        {part}
                                        {i < parts.length - 1 && (
                                            <span className="inline-block mx-2 relative">
                                                <input 
                                                    type="text" 
                                                    value={userAnswer} 
                                                    onChange={(e) => handleSelect(qKey, e.target.value)} 
                                                    disabled={showAnswers}
                                                    className={`border-b-2 outline-none px-2 py-1 w-48 text-center font-sans font-medium transition-colors ${showAnswers ? (isCorrect ? "border-green-500 bg-green-50 text-green-900" : "border-red-500 bg-red-50 text-red-900") : "border-gray-300 focus:border-blue-500 bg-gray-50"}`} 
                                                />
                                                {isWrong && <div className="absolute top-full left-0 w-full text-center text-xs text-green-700 font-bold mt-1 bg-green-100 px-1 rounded shadow-sm z-10"><CheckCircle className="w-3 h-3 inline mr-1"/>{cleanCorrectAnswer}</div>}
                                            </span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
  };

  // --- RENDERITZADOR DE SPEAKING PART 3 (DIAGRAMA RESPONSIVE) ---
  const renderSpeakingPart3 = () => {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        {/* PHASE INDICATOR */}
        <div className="flex justify-center mb-6">
            <div className="bg-gray-100 p-1 rounded-full flex text-sm font-medium overflow-x-auto max-w-full">
                <button onClick={() => setPart3Phase('discussion')} className={`px-3 sm:px-4 py-2 rounded-full transition-all whitespace-nowrap ${part3Phase === 'discussion' ? 'bg-white shadow-md text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>1. Discussion (2')</button>
                <button onClick={() => setPart3Phase('decision')} className={`px-3 sm:px-4 py-2 rounded-full transition-all flex items-center gap-2 whitespace-nowrap ${part3Phase === 'decision' ? 'bg-white shadow-md text-purple-700' : 'text-gray-500 hover:text-gray-900'}`}>2. Decision (1') {part3Phase === 'discussion' && <Lock className="w-3 h-3"/>}</button>
                <button onClick={() => setPart3Phase('part4')} className={`px-3 sm:px-4 py-2 rounded-full transition-all flex items-center gap-2 whitespace-nowrap ${part3Phase === 'part4' ? 'bg-white shadow-md text-emerald-700' : 'text-gray-500 hover:text-gray-900'}`}>3. Part 4 {part3Phase !== 'part4' && <Lock className="w-3 h-3"/>}</button>
            </div>
        </div>

        {part3Phase === 'discussion' && (
            <div className="bg-white p-4 sm:p-8 rounded-2xl border-2 border-blue-100 shadow-xl relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold font-mono flex items-center gap-2 z-20">
                    <Clock className="w-4 h-4" /> 02:00
                </div>
                <h3 className="text-center text-gray-500 text-sm font-bold uppercase tracking-widest mb-4 sm:mb-8 mt-8 sm:mt-0">Collaborative Task</h3>
                
                <div className="relative max-w-lg mx-auto aspect-square flex items-center justify-center scale-[0.60] sm:scale-100 origin-center -my-24 sm:my-0">
                    {/* Central Bubble */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="w-48 h-48 bg-blue-600 rounded-full flex items-center justify-center p-4 text-center shadow-xl border-4 border-white ring-4 ring-blue-100 z-20">
                            <p className="text-white font-bold text-lg leading-tight drop-shadow-md">{data.part3_central_question || "Central Question"}</p>
                        </div>
                    </div>
                    {/* Outer Bubbles */}
                    {data.part3_prompts?.map((prompt, i) => {
                        const angle = (i * (360 / data.part3_prompts!.length)) - 90; 
                        const radius = 140; // px
                        const x = Math.cos((angle * Math.PI) / 180) * radius;
                        const y = Math.sin((angle * Math.PI) / 180) * radius;
                        
                        return (
                            <div key={i} className="absolute w-32 h-32 flex items-center justify-center" 
                                 style={{ transform: `translate(${x}px, ${y}px)` }}>
                                <div className="bg-white border-2 border-gray-200 rounded-2xl p-2 w-full h-full flex items-center justify-center text-center shadow-lg z-10">
                                    <p className="text-gray-800 font-semibold text-sm leading-tight">{prompt}</p>
                                </div>
                                {/* Connector Line */}
                                <div className="absolute top-1/2 left-1/2 w-[140px] h-[2px] bg-gray-300 -z-10 origin-left"
                                     style={{ 
                                         transform: `rotate(${angle + 180}deg) translate(0, -50%)`,
                                         width: '140px' 
                                     }}></div>
                            </div>
                        )
                    })}
                </div>

                <div className="mt-4 sm:mt-8 flex justify-center pb-4">
                    <button onClick={() => setPart3Phase('decision')} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-700 transition shadow-lg animate-bounce z-30 relative">
                        Next Phase: Decision <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        )}

        {part3Phase === 'decision' && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 sm:p-8 rounded-2xl border-2 border-purple-100 shadow-xl text-center">
                <div className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold font-mono mb-6">
                    <Clock className="w-4 h-4 inline mr-1" /> 01:00
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-6">Time to Decide</h3>
                <p className="text-lg sm:text-xl text-gray-700 leading-relaxed font-serif mb-8 px-2">"{data.part3_decision_question}"</p>
                
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 mx-auto max-w-lg shadow-inner">
                    <p className="text-gray-500 text-sm mb-4">Discuss with your partner (or AI) and reach a conclusion.</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {data.part3_prompts?.map((p, i) => (
                            <span key={i} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs sm:text-sm">{p}</span>
                        ))}
                    </div>
                </div>

                <div className="mt-8">
                    <button onClick={() => setPart3Phase('part4')} className="text-purple-600 font-bold hover:underline">Proceed to Part 4 &rarr;</button>
                </div>
            </div>
        )}

        {part3Phase === 'part4' && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-emerald-100 shadow-xl">
                <div className="flex items-center gap-3 mb-6 border-b border-emerald-100 pb-4">
                    <div className="bg-emerald-100 p-2 rounded-lg"><Users className="w-6 h-6 text-emerald-700" /></div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Part 4: Discussion</h3>
                        <p className="text-emerald-600 text-sm font-medium">Broadening the topic (5 mins)</p>
                    </div>
                </div>
                
                <ul className="space-y-4">
                    {data.part4_questions?.map((q, i) => (
                        <li key={i} className="flex gap-4 p-4 bg-emerald-50/50 rounded-xl hover:bg-emerald-50 transition border border-transparent hover:border-emerald-200">
                            <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-emerald-600 shadow-sm flex-shrink-0">{i + 1}</div>
                            <p className="text-gray-800 font-medium text-base sm:text-lg">{q}</p>
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </div>
    );
  };


  // ==========================================================
  // 🌟 RENDER 1: SELECCIÓ DE TASCA (WRITING PART 2 CHOICE)
  // ==========================================================
  if (isChoiceMode && !selectedOption) {
    return (
        <div className="bg-slate-50 min-h-screen pb-20 animate-in fade-in">
             <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition"><ArrowLeft className="w-5 h-5" /> Back</button>
                <h2 className="font-bold text-gray-800">{data.title}</h2>
                <div className="w-8"></div>
             </div>

             <div className="max-w-4xl mx-auto p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-gray-900 mb-2">Choose Your Task</h1>
                    <p className="text-gray-500">Select one of the options below to start Writing Part 2.</p>
                </div>

                <div className="grid gap-6">
                    {data.options?.map((opt) => (
                        <button 
                            key={opt.id}
                            onClick={() => setSelectedOption(opt)}
                            className="bg-white p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-xl transition-all text-left group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-3 bg-gray-100 text-xs font-bold uppercase text-gray-500 rounded-bl-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                {opt.type}
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600">{opt.title}</h3>
                            <p className="text-gray-600 leading-relaxed mb-4">{opt.text}</p>
                            <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                                <LayoutList className="w-4 h-4" />
                                <span>Tip: {opt.tips}</span>
                            </div>
                        </button>
                    ))}
                </div>
             </div>
        </div>
    );
  }

  // ==========================================================
  // 🌟 RENDER 2: EDITOR D'ESCRIPTURA (PART 1 O PART 2 SELECCIONADA)
  // ==========================================================
  if (isEssayExam || selectedOption) {
    const taskTitle = selectedOption ? selectedOption.title : data.title;
    const taskContent = selectedOption ? selectedOption.text : (data.content?.input_text || data.text);
    useEffect(() => {
        const typeToPreload = selectedOption ? 'writing2' : data.type;
        preloadExercise(typeToPreload, data.level || "C1");
    }, [data.id, selectedOption]);
    const hasNotes = !selectedOption && data.content?.notes; 

    return (
      <div className="bg-white min-h-screen pb-20 animate-in fade-in">
        {/* FEEDBACK OVERLAY */}
        {feedback && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-300">
                    <button onClick={() => setFeedback(null)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"><XCircle className="w-6 h-6"/></button>
                    <div className="p-8">
                          <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Assessment Result</h2>
                            <div className="text-4xl font-black text-blue-600">{feedback.score}/20</div>
                          </div>
                          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-6">
                            <h4 className="font-bold text-blue-900 mb-2">Feedback</h4>
                            <p className="text-blue-800 leading-relaxed">{feedback.feedback}</p>
                          </div>
                          <div className="space-y-4">
                            <h4 className="font-bold text-gray-800 text-lg border-b pb-2">Corrections</h4>
                            {feedback.corrections?.map((corr: any, idx: number) => (
                                <div key={idx} className="bg-white border-l-4 border-red-400 p-4 shadow-sm rounded-r-lg">
                                    <div className="flex flex-col md:flex-row gap-4 mb-2">
                                        <div className="flex-1 bg-red-50 text-red-800 p-2 rounded line-through">{corr.original}</div>
                                        <div className="flex-1 bg-green-50 text-green-800 p-2 rounded font-medium">{corr.correction}</div>
                                    </div>
                                    <p className="text-sm text-gray-500 italic">💡 {corr.explanation}</p>
                                </div>
                            ))}
                          </div>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
          <button onClick={() => selectedOption ? setSelectedOption(null) : onBack()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition"><ArrowLeft className="w-5 h-5" /> <span className="hidden sm:inline">Back</span></button>
          <h2 className="font-bold text-gray-800 text-lg truncate max-w-[200px] sm:max-w-none">{taskTitle}</h2>
          <div className="flex items-center gap-2 text-sm font-mono bg-gray-100 px-3 py-1 rounded-full text-gray-600"><Clock className="w-4 h-4" /> 45:00</div>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* COLUMNA ESQUERRA: EXAMEN */}
          <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-100px)] custom-scrollbar pr-2">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div><h3 className="font-bold text-blue-900 text-sm uppercase tracking-wide mb-1">Instructions</h3><p className="text-blue-800 text-sm leading-relaxed">{data.instruction || "Write your answer below."}</p></div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 text-xl mb-4 font-serif">Task</h3>
              
              {hasNotes ? (
                  <>
                    <p className="text-gray-700 leading-relaxed text-lg mb-8 font-serif border-l-4 border-gray-300 pl-4 italic">{data.content?.input_text}</p>
                    <div className="font-bold text-gray-900 mb-6 text-base">{data.content?.question}</div>
                    <div className="border-2 border-gray-800 rounded-lg p-5 bg-white mb-6">
                        <h4 className="font-black text-gray-800 uppercase tracking-widest border-b-2 border-gray-200 pb-2 mb-3 text-sm">Notes</h4>
                        <ol className="list-decimal list-inside space-y-2 font-bold text-gray-800 ml-2">
                            {data.content?.notes?.map((note: string, i: number) => (<li key={i} className="pl-2">{note}</li>))}
                        </ol>
                    </div>
                    {data.content?.opinions && (
                        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                           <h4 className="font-bold text-gray-500 uppercase text-xs mb-3">Some opinions expressed in the discussion:</h4>
                           <ul className="space-y-3">
                              {data.content?.opinions.map((op: string, i: number) => (
                                  <li key={i} className="flex gap-3 text-gray-600 text-sm italic items-start"><span className="text-gray-300">"</span>{op}<span className="text-gray-300">"</span></li>
                              ))}
                           </ul>
                        </div>
                    )}
                  </>
              ) : (
                  <p className="text-gray-800 leading-relaxed text-lg font-serif whitespace-pre-line">{taskContent}</p>
              )}
            </div>
          </div>

          {/* COLUMNA DRETA: EDITOR */}
          <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden sticky top-24">
            <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-600"><PenTool className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Your {selectedOption?.type || "Essay"}</span></div>
              <div className={`text-xs font-mono px-2 py-1 rounded ${wordCount >= 220 && wordCount <= 260 ? 'bg-green-100 text-green-700' : wordCount > 260 ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'}`}>{wordCount} words</div>
            </div>
            
            <textarea
              className="flex-1 w-full p-6 resize-none focus:outline-none font-serif text-lg leading-relaxed text-gray-800"
              placeholder={`Start writing your ${selectedOption?.type || "essay"} here...`}
              value={essayAnswer}
              onChange={handleEssayChange}
              spellCheck={false} 
            />
            
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <button 
                  onClick={submitWritingTask}
                  disabled={loadingGrade}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                  {loadingGrade ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />} Submit for Correction
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // 🌟 RENDER 3: MODE ESTÀNDARD (Reading, Listening, Speaking)
  // ==========================================================
  return (
    <div className="max-w-4xl mx-auto bg-white min-h-screen shadow-2xl rounded-xl overflow-hidden flex flex-col animate-in fade-in duration-500">
      {/* HEADER */}
      <div className={`p-6 flex justify-between items-center sticky top-0 z-10 shadow-md text-white ${isSpeaking ? 'bg-purple-900' : isWriting ? 'bg-emerald-900' : isListening ? 'bg-orange-800' : 'bg-gray-900'}`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition"><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <h2 className="text-xl font-bold">{data.title}</h2>
            <p className="text-white/70 text-sm">C1 Advanced • {isWriting ? " Writing" : isSpeaking ? " Speaking" : isListening ? " Listening" : " Reading"}</p>
          </div>
        </div>
        <button onClick={handleDownloadPDF} disabled={isDownloading} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${isDownloading ? "bg-white/10 cursor-not-allowed opacity-70" : "bg-white/10 hover:bg-white/20"}`}>
          {isDownloading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Generating...</span></> : <><Download className="w-4 h-4" /><span>PDF</span></>}
        </button>
      </div>

      {/* CONTENT */}
      <div className="p-8 md:p-12 space-y-8 overflow-y-auto flex-1 relative">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg text-blue-900 leading-relaxed shadow-sm">
          <h3 className="font-bold mb-2 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Instructions</h3>
          {data.instructions}
        </div>

        {/* IMATGES (Part 2) */}
        {data.image_urls && data.image_urls.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-bold text-gray-700 flex items-center gap-2"><ImageIcon className="w-5 h-5" /> Visual Materials</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {data.image_urls.map((url: string, index: number) => (
                <div key={index} className="rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-gray-100 group hover:scale-[1.02] transition-transform">
                  <div className="aspect-square relative"><img src={url} alt={`Task picture ${index + 1}`} className="w-full h-full object-cover" loading="lazy" /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isListening && (
          <div className="bg-orange-50 p-6 rounded-xl border border-orange-200 shadow-sm flex flex-col items-center gap-4 sticky top-0 z-20">
            <div className="flex items-center gap-2 text-orange-800 font-bold text-lg"><Volume2 className="w-6 h-6" /> Audio Track</div>
            {loadingAudio ? <div className="flex items-center gap-2 text-orange-600"><Loader2 className="animate-spin w-5 h-5" /> Generating AI Voice...</div> : audioUrl ? (
                <AudioPlayerLocked isVip={user?.is_vip} audioUrl={audioUrl} onUnlock={onOpenPricing} />
            ) : <p className="text-red-500">Error loading audio.</p>}
            <button onClick={() => setShowTranscript(!showTranscript)} className="text-sm text-orange-700 underline flex items-center gap-1 hover:text-orange-900 mt-2"><FileText className="w-4 h-4" /> {showTranscript ? "Hide Transcript" : "Show Transcript (Cheating!)"}</button>
          </div>
        )}

        <div className="relative">
           {!user?.is_vip && isListening && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-white/70 backdrop-blur-[2px] rounded-xl h-full">
                  <div className="sticky top-20 bg-white p-8 rounded-3xl shadow-2xl border border-orange-100 max-w-sm text-center">
                      <div className="bg-gradient-to-br from-orange-100 to-orange-200 p-5 rounded-full mb-5 w-20 h-20 flex items-center justify-center mx-auto shadow-inner"><Lock className="w-10 h-10 text-orange-600" /></div>
                      <h3 className="font-black text-gray-900 text-2xl mb-3">Listening Locked</h3>
                      <p className="text-gray-600 mb-8 leading-relaxed">Upgrade to the <strong>Season Pass</strong> to unlock full audio tracks.</p>
                      <button onClick={onOpenPricing} className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl hover:scale-105 transition shadow-xl flex items-center justify-center gap-2"><Lock className="w-5 h-5" /> Unlock Listening</button>
                  </div>
              </div>
           )}

           <div className={!user?.is_vip && isListening ? "filter blur-sm pointer-events-none select-none opacity-50 transition-all duration-500" : ""}>
              
              {/* LOGICA DE RENDERITZAT (ARA SÍ CORRECTA) */}
              {isSpeakingPart3 ? (
                  renderSpeakingPart3()
              ) : isListeningPart2 ? (
                  // 👉 NOU: Renderitzador específic per Listening Part 2
                  <>
                    {renderListeningPart2()}
                    {data.text && showTranscript && (
                        <div className="mt-8 prose max-w-none bg-gray-50 p-6 rounded-xl border border-gray-200 leading-relaxed whitespace-pre-line font-serif text-lg text-gray-800 animate-in fade-in">
                            <h4 className="font-bold text-gray-500 mb-2 uppercase text-sm border-b pb-2">Transcript</h4>
                            {data.text}
                        </div>
                    )}
                  </>
              ) : isGapFill ? (
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">{renderInteractiveText()}</div>
              ) : (
                data.text && (!isListening || showTranscript) && (
                    <div className={`prose max-w-none bg-gray-50 p-6 rounded-xl border border-gray-200 leading-relaxed whitespace-pre-line font-serif text-lg text-gray-800 ${isListening && !showTranscript ? 'hidden' : ''}`}>{data.text}</div>
                )
              )}

              {isInteractive && !isGapFill && !isSpeakingPart3 && !isListeningPart2 && (
                <div className="space-y-8 mt-8">
                  {data.questions.map((q, idx) => {
                    const key = q.question || idx.toString();
                    const userAnswer = userAnswers[key];
                    const cleanCorrectAnswer = cleanOptionText(q.answer);
                    const isCorrect = showAnswers && (userAnswer === cleanCorrectAnswer.toLowerCase() || userAnswer === q.answer.trim().toLowerCase());
                    const isWrong = showAnswers && userAnswer && !isCorrect;
                    return (
                        <div key={idx} className={`p-6 rounded-xl border transition-all ${showAnswers ? (isCorrect ? 'bg-green-50 border-green-200' : isWrong ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200') : 'bg-white border-gray-100 hover:shadow-md'}`}>
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-4">
                                    <div className="flex justify-between items-start"><span className="font-bold text-gray-400 text-lg">{q.question}</span></div>
                                    {isPart4 ? (
                                        <div className="mb-4 bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
                                            <p className="text-gray-900 font-medium text-lg mb-3 leading-relaxed">{q.original_sentence || "Original missing"}</p>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                                                <div className="bg-gray-900 text-white px-3 py-1 rounded-md font-bold text-sm tracking-wider uppercase shadow-sm w-fit">{q.keyword || "KEYWORD"}</div>
                                                <p className="text-sm text-gray-500 italic">(Use 3-6 words)</p>
                                            </div>
                                            <p className="text-gray-800 text-lg">{q.second_sentence || "Second sentence missing"}</p>
                                        </div>
                                    ) : ( q.stem && <div className="mb-2"><p className="font-medium text-gray-900 text-lg">{q.stem}</p></div> )}

                                    {q.options && q.options.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {q.options.map((opt, i) => {
                                                const text = cleanOptionText(opt);
                                                const isSelected = userAnswer === text.toLowerCase();
                                                const isTheCorrectOption = text.toLowerCase() === cleanCorrectAnswer.toLowerCase();
                                                let divClass = "p-3 border rounded-lg cursor-pointer transition flex justify-between items-center select-none ";
                                                if (showAnswers) {
                                                    if (isTheCorrectOption) divClass += "bg-green-200 border-green-500 ring-1 ring-green-500 font-medium";
                                                    else if (isSelected && !isTheCorrectOption) divClass += "bg-red-100 border-red-400 text-red-800";
                                                    else divClass += "opacity-50";
                                                } else {
                                                    if (isSelected) divClass += "bg-blue-100 border-blue-600 ring-2 ring-blue-500 text-blue-900 font-medium";
                                                    else divClass += "bg-white hover:bg-gray-50 border-gray-200";
                                                }
                                                return (
                                                    <div key={i} onClick={() => handleSelect(key, text.toLowerCase())} className={divClass}>
                                                        <div className="flex items-center"><span className="font-bold mr-3 opacity-60">{String.fromCharCode(65 + i)}.</span>{text}</div>
                                                        {showAnswers && isTheCorrectOption && <CheckCircle className="w-5 h-5 text-green-700" />}
                                                        {showAnswers && isSelected && !isTheCorrectOption && <XCircle className="w-5 h-5 text-red-600" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <input type="text" value={userAnswer || ""} disabled={showAnswers} autoComplete="off" spellCheck="false" onChange={(e) => handleSelect(key, e.target.value)} placeholder="Type your answer..." className={`w-full p-3 border rounded-lg outline-none font-medium ${showAnswers ? (userAnswer?.trim().toLowerCase() === q.answer.trim().toLowerCase() ? "bg-green-100 border-green-500 text-green-900 font-bold" : "bg-red-50 border-red-300 text-red-900") : "focus:ring-2 focus:ring-blue-500 bg-gray-50 border-gray-300 text-gray-800"}`} />
                                            {showAnswers && !isCorrect && <div className="mt-2 text-sm text-green-700 font-bold flex items-center gap-1 animate-in slide-in-from-top-2"><CheckCircle className="w-4 h-4" /> Correct: <span className="uppercase">{cleanCorrectAnswer}</span></div>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                  })}
                </div>
              )}
           </div>
        </div>

        {/* Footer */}
        {isInteractive && (
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-center sticky bottom-0 z-20">
              {!showAnswers ? (
                <button onClick={checkScore} disabled={isListening && !user?.is_vip} className="flex items-center gap-2 px-8 py-3 rounded-full font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 shadow-lg transition-transform disabled:opacity-50 disabled:cursor-not-allowed"><Eye className="w-5 h-5" /> Check Answers</button>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-xl font-bold text-gray-800">Score: <span className={score! > (data.questions.length / 2) ? "text-green-600" : "text-orange-600"}>{score}</span> / {data.questions.length}</div>
                  <button onClick={onBack} className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-gray-600 bg-white border hover:bg-gray-100 transition"><RefreshCw className="w-4 h-4" /> Main Menu</button>
                </div>
              )}
            </div>
        )}
      </div>
    </div>
  );
}