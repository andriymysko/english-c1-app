import { useState, useEffect, useRef } from "react";
import { ArrowLeft, CheckCircle, Download, Eye, XCircle, Send, Loader2, AlertCircle, Mic, StopCircle, Volume2, FileText, Sparkles, ChevronDown, Lock, PenTool, Clock, LayoutList, Users, ArrowRight } from "lucide-react";
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
  task1_heading?: string;
  task1_options?: string[];
  task2_heading?: string;
  task2_options?: string[];
}

interface Props {
  data: ExerciseData;
  onBack: () => void;
  onOpenPricing: () => void; 
}

export default function ExercisePlayer({ data, onBack, onOpenPricing }: Props) {
  const { user } = useAuth();

  const isChoiceMode = data.type === 'writing_choice';
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const isEssayExam = data.id === 'writing1' || data.type === 'essay' || (data.type === 'writing1' && data.content);
  const [essayAnswer, setEssayAnswer] = useState("");
  const [wordCount, setWordCount] = useState(0);

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
  const [part3Phase, setPart3Phase] = useState<'discussion' | 'decision' | 'part4'>('discussion');

  const isWriting = data.type.startsWith("writing") && !isChoiceMode; 
  const isSpeaking = data.type.startsWith("speaking");
  const isSpeakingPart3 = data.type === "speaking3";
  const isListening = data.type.startsWith("listening");
  const isListeningPart2 = data.type === "listening2";
  const isListeningPart4 = data.type === "listening4";
  const isGapFill = ["reading_and_use_of_language1", "reading_and_use_of_language2", "reading_and_use_of_language3"].includes(data.type);
  const isInteractive = !isWriting && !isSpeaking && !isEssayExam && !selectedOption && !isChoiceMode;

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://english-c1-api.onrender.com"; 
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
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    window.history.pushState({ page: "exercise" }, "", "");
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      if (selectedOption) { setSelectedOption(null); setEssayAnswer(""); } else { onBack(); }
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
    setPart3Phase('discussion');
  }, [data.id, data.title]);

  useEffect(() => {
    if (isInteractive) preloadExercise(data.type, data.level || "C1");
    if (isListening && data.text) {
      setLoadingAudio(true);
      fetchAudio(data.text).then(url => setAudioUrl(url)).finally(() => setLoadingAudio(false));
    }
  }, [data.type, data.level, isInteractive, isListening, data.text]);

  const handleEssayChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setEssayAnswer(text);
    setWordCount(text.trim().split(/\s+/).filter(w => w.length > 0).length);
  };

  const submitWritingTask = async () => {
     if (wordCount < 220) {
       toast.warning("Too short!", { description: "Aim for at least 220 words." });
       return;
     }
     setLoadingGrade(true);
     try {
       const taskPrompt = selectedOption ? selectedOption.title : (data.instruction || data.text);
       const result = await gradeWriting(user?.uid || "anon", taskPrompt, essayAnswer);
       setFeedback(result);
       playSuccessSound();
       confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
     } catch (e) {
       console.error(e);
     } finally {
       setLoadingGrade(false);
     }
  };

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
        } catch (err) { console.error(err); } finally { setIsTranscribing(false); }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { console.error(err); }
  };

  const handleSubmitCreative = async () => {
    if (!user || !inputText) return;
    setLoadingGrade(true);
    try {
      const fullTask = isSpeakingPart3 ? JSON.stringify({ q: data.part3_central_question }) : (data.instructions || "");
      let result;
      if (isWriting) result = await gradeWriting(user.uid, fullTask, inputText);
      else result = await gradeSpeaking(user.uid, fullTask, inputText);
      setFeedback(result);
      playSuccessSound();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (e) { console.error(e); } finally { setLoadingGrade(false); }
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
      
      if (isCorrect) {
          correct++;
      } else {
          // 🔥 EL FIX CRÍTIC: Construïm l'error complet pel teu AI Backend
          mistakes.push({
            type: data.type, 
            question: q.question, 
            stem: q.stem || q.original_sentence || (data.text ? data.text.substring(0, 150) + "..." : "Context unavailable"),
            user_answer: userAnswers[key] || "[Empty]", 
            correct_answer: q.answer
          });
      }
    });
    
    setScore(correct);
    setShowAnswers(true);
    
    if (correct > (data.questions.length / 2)) {
      playSuccessSound();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } else { 
      playErrorSound(); 
    }
    
    // 🔥 L'ENVIAMENT SEGUR
    if (user) {
      try {
          await submitResult({ 
              user_id: user.uid, 
              exercise_type: data.type, 
              score: correct, 
              total: data.questions.length, 
              mistakes: mistakes 
          });
          console.log("✅ Objectiu: Errors enviats a la BD ->", mistakes);
      } catch (err) {
          console.error("❌ Fallida crítica de connexió en guardar els resultats:", err);
      }
    }
  };

  const renderInteractiveText = () => {
    if (!data.text) return null;
    const parts = data.text.split(/\[\s*(\d+)\s*\]/g);
    return (
      <div className="leading-loose text-lg text-slate-800 font-serif text-justify">
        {parts.map((part, index) => {
          if (!isNaN(Number(part)) && part.trim() !== "") {
            const questionNumString = part.trim();
            const question = data.questions.find(q => q.question === questionNumString) || data.questions[parseInt(questionNumString) - 1];
            if (!question) return <span key={index}>[{part}]</span>;
            
            const qKey = question.question || index.toString();
            const userAnswer = userAnswers[qKey] || "";
            const isCorrect = showAnswers && (userAnswer.toLowerCase() === cleanOptionText(question.answer).toLowerCase());
            const isWrong = showAnswers && !isCorrect;

            let baseClass = "inline-flex items-center align-middle mx-1 my-1 rounded-sm border transition-colors ";
            if (showAnswers) {
                baseClass += isCorrect ? "bg-green-50 border-green-300 shadow-sm" : "bg-red-50 border-red-300 shadow-sm";
            } else {
                baseClass += "bg-white border-stone-300 shadow-sm";
            }

            return (
              <span key={index} className="group relative inline-block">
                <span className={baseClass}>
                  <span className={`px-2 py-1.5 text-[10px] font-black uppercase border-r ${showAnswers ? (isCorrect ? 'border-green-300 text-green-800' : 'border-red-300 text-red-800') : 'bg-stone-50 text-stone-500 border-stone-300'}`}>
                      {questionNumString}
                  </span>
                  {data.type === "reading_and_use_of_language1" && question.options ? (
                    <div className="relative">
                      <select value={userAnswer} onChange={(e) => handleSelect(qKey, e.target.value)} disabled={showAnswers} className={`outline-none bg-transparent px-2 py-1.5 text-sm font-bold appearance-none pr-6 cursor-pointer ${showAnswers && isWrong ? 'text-red-900' : 'text-slate-900'}`}>
                        <option value=""></option>
                        {question.options.map((opt: any, i: number) => (<option key={i} value={cleanOptionText(opt)}>{cleanOptionText(opt)}</option>))}
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-40"/>
                    </div>
                  ) : (
                    <input type="text" value={userAnswer} onChange={(e) => handleSelect(qKey, e.target.value)} disabled={showAnswers} autoComplete="off" className={`outline-none bg-transparent px-2 py-1.5 text-sm font-bold min-w-[80px] ${showAnswers && isWrong ? 'text-red-900' : 'text-slate-900'}`} />
                  )}
                </span>
              </span>
            );
          }
          return <span key={index}>{part.replace(/_+/g, "")}</span>;
        })}
      </div>
    );
  };

  const renderListeningPart2 = () => {
    return (
        <div className="space-y-4">
            {data.questions.map((q, idx) => {
                const cleanStem = (q.stem || q.question).replace(/^\d+[\.\-\)]?\s*/, '');
                const parts = cleanStem.split(/\[_*\]|\[\d+\]|________/); 
                const qKey = q.question || idx.toString();
                const userAnswer = userAnswers[qKey] || "";
                const cleanCorrectAnswer = cleanOptionText(q.answer);
                const isCorrect = showAnswers && (userAnswer.toLowerCase() === cleanCorrectAnswer.toLowerCase());
                
                return (
                    <div key={idx} className="bg-white p-6 rounded-sm border border-stone-200 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="bg-stone-100 text-stone-500 font-bold text-xs rounded-sm w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                                {idx + 7}
                            </div>
                            <div className="leading-loose text-lg text-slate-800 font-serif flex-1">
                                {parts.map((part, i) => (
                                    <span key={i}>
                                        {part}
                                        {i < parts.length - 1 && (
                                            <span className="inline-block mx-2 relative">
                                                <input type="text" value={userAnswer} onChange={(e) => handleSelect(qKey, e.target.value)} disabled={showAnswers} className={`border-b-2 font-sans font-bold text-sm outline-none px-2 py-1 w-48 text-center transition-colors ${showAnswers ? (isCorrect ? "border-green-500 bg-green-50 text-green-900" : "border-red-500 bg-red-50 text-red-900") : "border-stone-300 focus:border-slate-900 bg-transparent"}`} />
                                            </span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {showAnswers && !isCorrect && (
                            <div className="mt-4 pt-4 border-t border-stone-100">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Correct Answer</p>
                                <p className="font-bold text-slate-900">{cleanCorrectAnswer}</p>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
  };

  const renderSpeakingPart3 = () => {
    return (
      <div className="space-y-8 animate-in fade-in">
        <div className="flex justify-center mb-6">
            <div className="bg-stone-100 p-1 rounded-sm flex text-xs font-bold uppercase tracking-widest">
                <button onClick={() => setPart3Phase('discussion')} className={`px-4 py-2 rounded-sm transition-colors ${part3Phase === 'discussion' ? 'bg-white shadow-sm text-slate-900' : 'text-stone-400'}`}>1. Discussion</button>
                <button onClick={() => setPart3Phase('decision')} className={`px-4 py-2 rounded-sm transition-colors ${part3Phase === 'decision' ? 'bg-white shadow-sm text-slate-900' : 'text-stone-400'}`}>2. Decision</button>
                <button onClick={() => setPart3Phase('part4')} className={`px-4 py-2 rounded-sm transition-colors ${part3Phase === 'part4' ? 'bg-white shadow-sm text-slate-900' : 'text-stone-400'}`}>3. Part 4</button>
            </div>
        </div>
        {part3Phase === 'discussion' && (
            <div className="bg-white p-8 rounded-sm border border-stone-200 text-center shadow-sm">
                <h3 className="font-bold text-stone-400 mb-6 uppercase tracking-widest text-xs">Collaborative Task (2 mins)</h3>
                <div className="text-2xl font-serif font-black text-slate-900 mb-8 leading-tight">{data.part3_central_question}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.part3_prompts?.map((p,i) => <div key={i} className="bg-stone-50 p-4 rounded-sm border border-stone-200 font-medium text-slate-700 text-sm">{p}</div>)}
                </div>
            </div>
        )}
        {part3Phase === 'decision' && (
            <div className="bg-slate-900 p-8 rounded-sm text-center shadow-sm animate-in zoom-in-95">
                <h3 className="font-bold text-stone-400 mb-6 uppercase tracking-widest text-xs">Decision Phase (1 min)</h3>
                <p className="text-xl font-serif font-bold text-white leading-relaxed italic">"{data.part3_decision_question}"</p>
            </div>
        )}
        {part3Phase === 'part4' && (
            <div className="bg-white p-8 rounded-sm border border-stone-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-widest text-xs"><Users className="w-4 h-4"/> Part 4: Discussion</h3>
                <ul className="space-y-4">
                    {data.part4_questions?.map((q,i) => <li key={i} className="flex gap-3 text-slate-700 font-medium bg-stone-50 border border-stone-100 p-4 rounded-sm"><span className="text-stone-400 font-black">{i+1}.</span> {q}</li>)}
                </ul>
            </div>
        )}
      </div>
    );
  };

  const renderListeningPart4 = () => {
    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="bg-white p-8 rounded-sm border border-stone-200 shadow-sm flex flex-col">
                    <h4 className="font-serif font-black text-slate-900 mb-4">{data.task1_heading || "TASK 1"}</h4>
                    <ul className="space-y-3 mb-8 flex-1">
                        {data.task1_options?.map((opt: string, i: number) => (
                            <li key={i} className="text-stone-600 text-sm font-medium">{opt}</li>
                        ))}
                    </ul>
                    <div className="space-y-3 bg-stone-50 p-5 rounded-sm border border-stone-200">
                        {[1, 2, 3, 4, 5].map(speakerNum => {
                            const qIdx = speakerNum - 1; 
                            const q = data.questions[qIdx];
                            const qKey = q?.question || qIdx.toString();
                            const userAnswer = userAnswers[qKey] || "";
                            const isCorrect = showAnswers && (userAnswer.toUpperCase() === q?.answer.toUpperCase());

                            return (
                                <div key={`t1-s${speakerNum}`} className="flex items-center justify-between">
                                    <span className="font-bold text-slate-800 text-sm">Speaker {speakerNum} <span className="text-[10px] font-black text-stone-400 ml-1">[{20 + speakerNum}]</span></span>
                                    <div className="flex items-center gap-3">
                                        <select value={userAnswer} onChange={(e) => handleSelect(qKey, e.target.value)} disabled={showAnswers} className={`w-14 p-1.5 text-center font-bold text-sm border rounded-sm outline-none cursor-pointer ${showAnswers ? (isCorrect ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800") : "bg-white border-stone-300 focus:border-slate-900"}`}>
                                            <option value=""></option>
                                            {['A','B','C','D','E','F','G','H'].map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                        {showAnswers && !isCorrect && <span className="text-xs font-black text-slate-900 bg-stone-200 px-2 py-1 rounded-sm shadow-sm">{q?.answer}</span>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-sm border border-stone-200 shadow-sm flex flex-col">
                    <h4 className="font-serif font-black text-slate-900 mb-4">{data.task2_heading || "TASK 2"}</h4>
                    <ul className="space-y-3 mb-8 flex-1">
                        {data.task2_options?.map((opt: string, i: number) => (
                            <li key={i} className="text-stone-600 text-sm font-medium">{opt}</li>
                        ))}
                    </ul>
                    <div className="space-y-3 bg-stone-50 p-5 rounded-sm border border-stone-200">
                        {[1, 2, 3, 4, 5].map(speakerNum => {
                            const qIdx = speakerNum + 4; 
                            const q = data.questions[qIdx];
                            const qKey = q?.question || qIdx.toString();
                            const userAnswer = userAnswers[qKey] || "";
                            const isCorrect = showAnswers && (userAnswer.toUpperCase() === q?.answer.toUpperCase());

                            return (
                                <div key={`t2-s${speakerNum}`} className="flex items-center justify-between">
                                    <span className="font-bold text-slate-800 text-sm">Speaker {speakerNum} <span className="text-[10px] font-black text-stone-400 ml-1">[{25 + speakerNum}]</span></span>
                                    <div className="flex items-center gap-3">
                                        <select value={userAnswer} onChange={(e) => handleSelect(qKey, e.target.value)} disabled={showAnswers} className={`w-14 p-1.5 text-center font-bold text-sm border rounded-sm outline-none cursor-pointer ${showAnswers ? (isCorrect ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800") : "bg-white border-stone-300 focus:border-slate-900"}`}>
                                            <option value=""></option>
                                            {['A','B','C','D','E','F','G','H'].map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                        {showAnswers && !isCorrect && <span className="text-xs font-black text-slate-900 bg-stone-200 px-2 py-1 rounded-sm shadow-sm">{q?.answer}</span>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>
        </div>
    )
  };

  if (isChoiceMode && !selectedOption) {
    return (
        <div className="bg-stone-50 min-h-screen p-8 animate-in fade-in">
             <div className="max-w-4xl mx-auto">
                <button onClick={onBack} className="flex items-center gap-2 text-stone-500 mb-8 font-bold text-xs uppercase tracking-widest hover:text-slate-900 transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
                <h1 className="text-4xl font-serif font-black text-slate-900 mb-8">Choose Your Writing Task</h1>
                <div className="grid gap-6">
                    {data.options?.map((opt) => (
                        <button key={opt.id} onClick={() => setSelectedOption(opt)} className="bg-white p-8 rounded-sm border border-stone-200 hover:border-slate-900 text-left transition-all group shadow-sm">
                            <h3 className="text-xl font-serif font-bold text-slate-900 mb-3">{opt.title}</h3>
                            <p className="text-stone-500 mb-6 leading-relaxed">{opt.text}</p>
                            <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2 bg-stone-100 w-fit px-3 py-1.5 rounded-sm"><LayoutList className="w-3 h-3"/> {opt.tips}</span>
                        </button>
                    ))}
                </div>
             </div>
        </div>
    );
  }

  if (isEssayExam || selectedOption) {
    const taskTitle = selectedOption ? selectedOption.title : data.title;
    const taskContent = selectedOption ? selectedOption.text : (data.content?.input_text || data.text);
    return (
      <div className="bg-stone-50 min-h-screen flex flex-col animate-in fade-in">
        {feedback && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-sm shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-10 relative">
                    <button onClick={() => setFeedback(null)} className="absolute top-6 right-6 p-2 text-stone-400 hover:text-slate-900 transition-colors"><XCircle className="w-6 h-6"/></button>
                    <div className="flex items-center justify-between mb-8 border-b border-stone-200 pb-6">
                        <h2 className="text-3xl font-serif font-black text-slate-900">Assessment Result</h2>
                        <div className="text-4xl font-serif font-black text-slate-900">{feedback.score}/20</div>
                    </div>
                    <div className="bg-stone-50 p-8 rounded-sm border border-stone-200 mb-8">
                        <h4 className="font-bold text-slate-900 text-sm uppercase tracking-widest mb-4">Examiner Feedback</h4>
                        <p className="text-stone-700 leading-relaxed font-serif whitespace-pre-wrap">{feedback.feedback}</p>
                    </div>
                    {feedback.corrections?.length > 0 && (
                        <div className="space-y-4 mb-8">
                            <h4 className="font-bold text-sm text-slate-900 uppercase tracking-widest border-b border-stone-200 pb-3">Key Improvements</h4>
                            {feedback.corrections.map((corr: any, i: number) => (
                                <div key={i} className="bg-white border border-stone-200 p-5 shadow-sm rounded-sm">
                                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                                        <div className="flex-1 bg-red-50 p-3 rounded-sm line-through text-red-700 font-serif">{corr.original}</div>
                                        <div className="flex-1 bg-green-50 p-3 rounded-sm text-green-800 font-bold font-serif">{corr.correction}</div>
                                    </div>
                                    <p className="text-sm text-stone-500 italic">💡 {corr.explanation}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {feedback.model_answer && (
                        <div className="bg-slate-900 p-8 rounded-sm text-white">
                            <h4 className="font-bold text-stone-300 text-sm uppercase tracking-widest flex items-center gap-2 mb-6"><Sparkles className="w-4 h-4"/> Model Answer (C1 Level)</h4>
                            <div className="font-serif text-lg leading-relaxed whitespace-pre-wrap">{feedback.model_answer}</div>
                        </div>
                    )}
                    <button onClick={onBack} className="mt-8 w-full py-4 bg-white border border-slate-900 text-slate-900 uppercase tracking-widest text-xs font-bold rounded-sm hover:bg-slate-900 hover:text-white transition-colors">Main Menu</button>
                </div>
            </div>
        )}
        <div className="bg-white border-b border-stone-200 px-8 py-5 flex items-center justify-between shadow-sm">
            <button onClick={() => selectedOption ? setSelectedOption(null) : onBack()} className="flex items-center gap-2 text-stone-500 font-bold text-xs uppercase tracking-widest hover:text-slate-900 transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
            <h2 className="font-serif font-black text-xl truncate max-w-md text-slate-900">{taskTitle}</h2>
            <div className="text-xs font-bold bg-stone-100 px-3 py-1.5 rounded-sm text-slate-900 flex items-center gap-2 uppercase tracking-widest"><Clock className="w-3.5 h-3.5" /> 45:00</div>
        </div>
        <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden">
            <div className="overflow-y-auto pr-4 space-y-6 custom-scrollbar">
                <div className="bg-stone-900 p-6 rounded-sm flex gap-4 text-stone-300 shadow-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-white"/>
                    <p className="text-sm font-medium leading-relaxed">{data.instruction || "Follow the task instructions below."}</p>
                </div>
                <div className="bg-white border border-stone-200 rounded-sm p-8 shadow-sm font-serif leading-relaxed text-lg whitespace-pre-line text-slate-800">{taskContent}</div>
            </div>
            <div className="flex flex-col bg-white rounded-sm border border-stone-200 shadow-sm overflow-hidden">
                <div className="bg-stone-50 p-5 border-b border-stone-200 flex justify-between items-center text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                    <div className="flex items-center gap-2"><PenTool className="w-3.5 h-3.5"/> Your Response</div>
                    <div className={wordCount >= 220 && wordCount <= 260 ? "text-green-600 bg-green-50 px-2 py-1 rounded-sm border border-green-200" : "bg-white px-2 py-1 border border-stone-200 rounded-sm"}>{wordCount} words</div>
                </div>
                <textarea className="flex-1 p-8 outline-none resize-none font-serif text-xl leading-relaxed text-slate-900" placeholder="Start typing your answer here..." value={essayAnswer} onChange={handleEssayChange} spellCheck={false} />
                <div className="p-6 bg-stone-50 border-t border-stone-200">
                    <button onClick={submitWritingTask} disabled={loadingGrade} className="w-full py-4 bg-slate-900 text-white rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center">
                        {loadingGrade ? <Loader2 className="animate-spin w-5 h-5" /> : "Submit for Evaluation"}
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-screen shadow-sm border-x border-stone-200 flex flex-col animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="p-6 md:p-8 flex justify-between items-center sticky top-0 z-30 bg-slate-900 text-white shadow-md">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="text-stone-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <div>
              <h2 className="text-xl font-serif font-black tracking-wide">{data.title}</h2>
              <p className="text-stone-400 text-[10px] uppercase font-bold tracking-widest mt-1">C1 Advanced</p>
          </div>
        </div>
        <button onClick={handleDownloadPDF} disabled={isDownloading} className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-sm hover:bg-slate-700 transition-colors border border-slate-700 font-bold uppercase tracking-widest text-[10px]">
          {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5" />} PDF
        </button>
      </div>

      {/* CONTINGUT SCROLLABLE */}
      <div className="p-8 md:p-12 space-y-8 overflow-y-auto flex-1 relative custom-scrollbar bg-stone-50">
        
        <div className="bg-white border-l-4 border-slate-900 p-6 rounded-sm text-slate-800 leading-relaxed shadow-sm">
          <h3 className="font-bold mb-3 flex items-center gap-2 uppercase tracking-widest text-[10px] text-stone-400"><AlertCircle className="w-3.5 h-3.5" /> Instructions</h3>
          <p className="font-medium text-sm">{data.instructions}</p>
        </div>

        {data.image_urls && data.image_urls.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.image_urls.map((url, i) => (
              <div key={i} className="rounded-sm overflow-hidden shadow-sm border border-stone-200"><img src={url} alt="Task" className="w-full h-full object-cover aspect-square" /></div>
            ))}
          </div>
        )}

        {isListening && (
          <div className="bg-white p-6 rounded-sm border border-stone-200 shadow-sm flex flex-col items-center gap-4 sticky top-0 z-20">
            <div className="flex items-center gap-2 text-slate-900 font-serif font-bold text-lg"><Volume2 className="w-5 h-5 text-stone-400" /> Audio Track</div>
            {loadingAudio ? (
              <div className="flex items-center gap-2 text-stone-500 text-xs font-bold uppercase tracking-widest"><Loader2 className="animate-spin w-4 h-4" /> Generating...</div>
            ) : audioUrl ? (
              <AudioPlayerLocked isVip={user?.is_vip || false} audioUrl={audioUrl} onUnlock={onOpenPricing} />
            ) : <p className="text-red-500 text-sm font-bold">Error loading audio.</p>}
            
            <button onClick={() => setShowTranscript(!showTranscript)} className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1 hover:text-slate-900 transition-colors mt-2">
                <FileText className="w-3.5 h-3.5" /> {showTranscript ? "Hide Transcript" : "Show Transcript"}
            </button>
          </div>
        )}

        <div className="relative">
           {isListening && (!user || !user.is_vip) && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-white/60 backdrop-blur-sm">
                  <div className="bg-white p-10 rounded-sm shadow-xl border border-stone-200 max-w-sm text-center animate-in zoom-in-95">
                      <div className="bg-stone-100 p-5 rounded-sm mb-6 w-16 h-16 flex items-center justify-center mx-auto"><Lock className="w-6 h-6 text-slate-900" /></div>
                      <h3 className="font-serif font-black text-slate-900 text-2xl mb-3">Listening Locked</h3>
                      <p className="text-stone-500 text-sm mb-8 leading-relaxed font-medium">Upgrade to the <strong>Season Pass</strong> to unlock tracks.</p>
                      <button onClick={onOpenPricing} className="w-full py-4 bg-slate-900 text-white font-bold uppercase tracking-widest text-xs rounded-sm hover:bg-slate-800 transition-colors shadow-sm">Unlock Now</button>
                  </div>
              </div>
           )}

           <div className={isListening && (!user || !user.is_vip) ? "filter blur-md pointer-events-none select-none opacity-40" : ""}>
              {isSpeakingPart3 ? (
                  renderSpeakingPart3()
              ) : isListeningPart4 ? (
                  <>
                      {renderListeningPart4()}
                      {showTranscript && (
                          <div className="mt-8 prose max-w-none bg-white p-8 rounded-sm border border-stone-200 shadow-sm animate-in fade-in">
                              <h4 className="font-bold text-stone-400 mb-6 uppercase tracking-widest text-[10px] border-b border-stone-100 pb-4">
                                  Transcript
                              </h4>
                              <p className="whitespace-pre-line text-slate-800 font-serif leading-relaxed">
                                  {data.text || "Transcript not available."}
                              </p>
                          </div>
                      )}
                  </>
              ) : isListeningPart2 ? (
                  <>
                    {renderListeningPart2()}
                    {showTranscript && (
                        <div className="mt-8 prose max-w-none bg-white p-8 rounded-sm border border-stone-200 shadow-sm">
                            <h4 className="font-bold text-stone-400 mb-6 uppercase tracking-widest text-[10px] border-b border-stone-100 pb-4">
                                Transcript
                            </h4>
                            <p className="whitespace-pre-line text-slate-800 font-serif leading-relaxed">
                                {data.text || (data as any).script || "Transcript not available."}
                            </p>
                        </div>
                    )}
                  </>
              ) : isGapFill ? (
                <div className="bg-white p-8 md:p-12 rounded-sm border border-stone-200 shadow-sm">
                    {renderInteractiveText()}
                    
                    {/* 👇 EXPLANATIONS PEDAGÒGIQUES PER AL GAP FILL 👇 */}
                    {showAnswers && data.questions.some(q => q.explanation) && (
                        <div className="mt-12 pt-8 border-t border-stone-200 animate-in fade-in">
                            <h4 className="font-serif font-black text-xl text-slate-900 mb-6 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-stone-400"/> Examiner Feedback
                            </h4>
                            <div className="space-y-4">
                                {data.questions.map((q, i) => {
                                    const qKey = q.question || i.toString();
                                    const userAnswer = (userAnswers[qKey] || "").toLowerCase();
                                    const isCorrect = userAnswer === cleanOptionText(q.answer).toLowerCase();
                                    return (
                                        <div key={i} className={`p-5 rounded-sm border ${isCorrect ? 'bg-stone-50 border-stone-200' : 'bg-white border-red-200 shadow-sm'}`}>
                                            <div className="flex gap-4 items-start">
                                                <span className={`font-black text-lg ${isCorrect ? 'text-stone-300' : 'text-red-400'}`}>{q.question}</span>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="font-bold text-slate-900 text-sm uppercase tracking-widest">Correct: {q.answer}</span>
                                                        {!isCorrect && <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-1 rounded-sm">You: {userAnswers[qKey] || "Empty"}</span>}
                                                    </div>
                                                    {q.explanation ? (
                                                        <p className="text-stone-500 text-sm leading-relaxed">{q.explanation}</p>
                                                    ) : (
                                                        <p className="text-stone-400 text-sm italic">No specific feedback provided.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
              ) : (
                <>
                  {data.text && (!isListening || showTranscript) && (
                    <div className="prose max-w-none bg-white p-8 md:p-12 rounded-sm border border-stone-200 leading-loose font-serif text-lg text-slate-800 shadow-sm">
                        {data.text}
                    </div>
                  )}

                  {isInteractive && (
                    <div className="space-y-6 mt-8">
                      {data.questions.map((q, idx) => {
                         const key = q.question || idx.toString();
                         const userAnswer = userAnswers[key];
                         const cleanCorrectAnswer = cleanOptionText(q.answer);
                         const isCorrect = showAnswers && (userAnswer === cleanCorrectAnswer.toLowerCase() || userAnswer === q.answer.trim().toLowerCase());
                         const displayNum = data.type === 'listening3' ? idx + 15 : idx + 1;
                         return (
                            <div key={idx} className={`p-8 rounded-sm border transition-all ${showAnswers ? (isCorrect ? 'bg-stone-50 border-stone-200' : 'bg-white border-red-200 shadow-sm') : 'bg-white border-stone-200 shadow-sm hover:border-slate-900'}`}>
                                <div className="space-y-6">
                                    <div className="flex gap-4 items-start border-b border-stone-100 pb-4">
                                        <span className="font-serif font-black text-stone-300 text-3xl">{displayNum}</span>
                                        <p className="font-serif font-bold text-slate-900 text-xl pt-1 leading-relaxed">
                                            {q.question.replace(/^\d+[\.\-\)]?\s*/, '')}
                                        </p>
                                    </div>
                                    {data.type === "reading_and_use_of_language4" && q.original_sentence && (
                                        <div className="mb-6 bg-stone-50 p-6 rounded-sm border border-stone-200">
                                            <p className="text-slate-800 font-serif text-lg mb-4 leading-relaxed">{q.original_sentence}</p>
                                            <div className="bg-slate-900 text-white px-3 py-1.5 rounded-sm font-bold text-[10px] tracking-widest uppercase shadow-sm w-fit mb-4">{q.keyword}</div>
                                            <p className="text-stone-500 font-serif">{q.second_sentence}</p>
                                        </div>
                                    )}

                                    {q.options && q.options.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {q.options.map((opt, i) => {
                                                const text = cleanOptionText(opt);
                                                const isSelected = userAnswer === text.toLowerCase();
                                                const isTheCorrectOption = text.toLowerCase() === cleanCorrectAnswer.toLowerCase();
                                                let optClass = "p-5 border rounded-sm cursor-pointer transition-colors flex justify-between items-center select-none font-medium ";
                                                if (showAnswers) {
                                                    if (isTheCorrectOption) optClass += "bg-stone-100 border-stone-300 font-bold text-slate-900";
                                                    else if (isSelected) optClass += "bg-red-50 border-red-200 text-red-800";
                                                    else optClass += "opacity-50 grayscale border-stone-100";
                                                } else {
                                                    if (isSelected) optClass += "bg-slate-900 border-slate-900 text-white shadow-sm";
                                                    else optClass += "bg-white hover:bg-stone-50 border-stone-200 text-slate-700";
                                                }
                                                return (<div key={i} onClick={() => handleSelect(key, text.toLowerCase())} className={optClass}><div className="flex items-center"><span className={`font-black mr-4 text-[10px] uppercase tracking-widest ${isSelected && !showAnswers ? 'text-stone-400' : 'text-stone-300'}`}>{String.fromCharCode(65 + i)}</span>{text}</div>{showAnswers && isTheCorrectOption && <CheckCircle className="w-5 h-5 text-stone-500" />}{showAnswers && isSelected && !isTheCorrectOption && <XCircle className="w-5 h-5 text-red-500" />}</div>);
                                            })}
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <input type="text" value={userAnswer || ""} disabled={showAnswers} autoComplete="off" spellCheck="false" onChange={(e) => handleSelect(key, e.target.value)} placeholder="Type your answer..." className={`w-full p-5 border rounded-sm outline-none font-serif text-lg ${showAnswers ? (isCorrect ? "bg-stone-50 border-stone-300 text-slate-900" : "bg-white border-red-300 text-red-900") : "focus:border-slate-900 bg-white text-slate-900 border-stone-200"}`} />
                                            {showAnswers && !isCorrect && <div className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-900 bg-stone-100 px-3 py-2 rounded-sm w-fit border border-stone-200">Correct Output: <span className="font-black ml-1">{cleanCorrectAnswer}</span></div>}
                                        </div>
                                    )}

                                    {/* 👇 EXPLANATIONS PEDAGÒGIQUES PER PREGUNTES ESTÀNDARD 👇 */}
                                    {showAnswers && q.explanation && (
                                        <div className="mt-6 p-5 bg-stone-50 border border-stone-200 rounded-sm">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Examiner Note</p>
                                            <p className="text-sm text-stone-600 leading-relaxed font-medium">{q.explanation}</p>
                                        </div>
                                    )}

                                </div>
                            </div>
                         );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* CREATIVE MODE UI (SPEAKING / WRITING) */}
              {!isInteractive && !isEssayExam && !isChoiceMode && (
                <div className="space-y-6">
                    {!feedback ? (
                        <>
                            {isSpeaking && (
                                <div className="flex flex-col items-center justify-center py-10 gap-6">
                                    <button onClick={toggleRecording} disabled={isTranscribing} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-md ${isRecording ? 'bg-red-600 animate-pulse ring-4 ring-red-100' : 'bg-slate-900 hover:bg-slate-800'}`}>
                                        {isRecording ? <StopCircle className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
                                    </button>
                                    {isTranscribing && <div className="text-slate-900 font-bold text-xs uppercase tracking-widest flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4" /> Processing...</div>}
                                </div>
                            )}
                            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={isSpeaking && (!user || !user.is_vip)} placeholder={isSpeaking ? "Transcript will appear here..." : "Write response here..."} className="w-full h-80 p-8 border border-stone-200 bg-white rounded-sm outline-none text-xl font-serif leading-relaxed resize-none shadow-sm focus:border-slate-900 text-slate-900" />
                            <div className="flex justify-end pt-4">
                                <button onClick={handleSubmitCreative} disabled={loadingGrade || inputText.length < 10 || isTranscribing || isRecording} className="flex items-center gap-2 px-8 py-4 rounded-sm font-bold uppercase tracking-widest text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm">
                                    {loadingGrade ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />} Submit for Evaluation
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="animate-in slide-in-from-bottom-10 space-y-6 pb-20">
                            <div className="bg-white border border-stone-200 rounded-sm p-8 shadow-sm flex items-center justify-between">
                                <div><h3 className="text-2xl font-serif font-black text-slate-900">AI Assessment</h3><p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mt-1">Cambridge C1 criteria</p></div>
                                <div className="text-right flex flex-col items-center"><div className="text-4xl font-serif font-black text-slate-900">{feedback.score}/20</div></div>
                            </div>
                            <div className="bg-stone-50 p-8 rounded-sm border border-stone-200 shadow-sm"><h4 className="font-bold text-slate-900 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">Examiner Feedback</h4><p className="text-stone-700 font-serif leading-relaxed whitespace-pre-wrap">{feedback.feedback}</p></div>
                            {feedback.model_answer && (
                                <div className="mt-8 p-8 bg-slate-900 rounded-sm shadow-sm">
                                    <h3 className="text-sm font-bold text-stone-300 uppercase tracking-widest mb-6 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Model Answer</h3>
                                    <div className="prose text-white font-serif text-lg leading-relaxed whitespace-pre-wrap">{feedback.model_answer}</div>
                                </div>
                            )}
                            <button onClick={onBack} className="w-full py-4 bg-white border border-slate-900 text-slate-900 rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-slate-900 hover:text-white transition-colors">Main Menu</button>
                        </div>
                    )}
                </div>
              )}
           </div>

           {/* 👇 ACTION BAR DESENGANXADA I MOGUDA DINS L'SCROLL 👇 */}
           {isInteractive && (
             <div className="pt-12 mt-12 border-t border-stone-200 bg-transparent flex flex-col items-center justify-center pb-8">
               {!showAnswers ? (
                 <button onClick={checkScore} disabled={isListening && (!user || !user.is_vip)} className="flex items-center justify-center gap-3 w-full md:w-auto px-16 py-4 rounded-sm font-bold uppercase tracking-widest text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50">
                   <Eye className="w-4 h-4" /> Check Answers
                 </button>
               ) : (
                 <div className="flex flex-col items-center gap-6 w-full animate-in fade-in slide-in-from-bottom-4">
                   <div className="text-4xl font-serif font-black text-slate-900 bg-white px-10 py-6 rounded-sm border border-stone-200 shadow-sm">
                     Score: {score} / {data.questions.length}
                   </div>
                   <button onClick={onBack} className="flex items-center justify-center gap-2 w-full md:w-auto px-12 py-4 rounded-sm font-bold uppercase tracking-widest text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm">
                     Main Menu <ArrowRight className="w-4 h-4"/>
                   </button>
                 </div>
               )}
             </div>
           )}

        </div>
      </div>
    </div>
  );
}