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
}

interface Props {
  data: ExerciseData;
  onBack: () => void;
  onOpenPricing: () => void; 
}

export default function ExercisePlayer({ data, onBack, onOpenPricing }: Props) {
  const { user } = useAuth();

  // -----------------------------------------------------------
  // 🔍 DEBUGGING LOGS
  // -----------------------------------------------------------
  useEffect(() => {
    console.log("🚀 [ExercisePlayer] Iniciat tipus:", data.type);
  }, [data.type]);

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

  // FLAGS
  const isWriting = data.type.startsWith("writing") && !isChoiceMode; 
  const isSpeaking = data.type.startsWith("speaking");
  const isSpeakingPart3 = data.type === "speaking3";
  const isListening = data.type.startsWith("listening");
  const isListeningPart2 = data.type === "listening2";
  const isGapFill = ["reading_and_use_of_language1", "reading_and_use_of_language2", "reading_and_use_of_language3"].includes(data.type);
  const isInteractive = !isWriting && !isSpeaking && !isEssayExam && !selectedOption && !isChoiceMode;

  // HANDLERS
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
      if (isCorrect) correct++;
      else mistakes.push({
        question: q.question, user_answer: userAnswers[key] || "", correct_answer: q.answer
      });
    });
    setScore(correct);
    setShowAnswers(true);
    if (correct > (data.questions.length / 2)) {
      playSuccessSound();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } else { playErrorSound(); }
    if (user) {
      submitResult({ user_id: user.uid, exercise_type: data.type, score: correct, total: data.questions.length, mistakes: mistakes });
    }
  };

  const renderInteractiveText = () => {
    if (!data.text) return null;
    const parts = data.text.split(/\[\s*(\d+)\s*\]/g);
    return (
      <div className="leading-loose text-lg text-gray-800 font-serif text-justify">
        {parts.map((part, index) => {
          if (!isNaN(Number(part)) && part.trim() !== "") {
            const questionNumString = part.trim();
            const question = data.questions.find(q => q.question === questionNumString) || data.questions[parseInt(questionNumString) - 1];
            if (!question) return <span key={index}>[{part}]</span>;
            const qKey = question.question || index.toString();
            const userAnswer = userAnswers[qKey] || "";
            const isCorrect = showAnswers && (userAnswer.toLowerCase() === cleanOptionText(question.answer).toLowerCase());
            const isWrong = showAnswers && !isCorrect;
            return (
              <span key={index} className="group relative inline-block">
                <span className="inline-flex items-center align-middle mx-1 my-1 rounded-md border shadow-sm bg-white">
                  <span className="px-2 py-1.5 text-xs font-bold border-r bg-slate-100 text-slate-500">{questionNumString}</span>
                  {data.type === "reading_and_use_of_language1" && question.options ? (
                    <div className="relative">
                      <select value={userAnswer} onChange={(e) => handleSelect(qKey, e.target.value)} disabled={showAnswers} className="outline-none bg-transparent px-2 py-1 appearance-none pr-6">
                        <option value="">Choose...</option>
                        {question.options.map((opt: any, i: number) => (<option key={i} value={cleanOptionText(opt)}>{cleanOptionText(opt)}</option>))}
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-40"/>
                    </div>
                  ) : (
                    <input type="text" value={userAnswer} onChange={(e) => handleSelect(qKey, e.target.value)} disabled={showAnswers} autoComplete="off" className="outline-none bg-transparent px-2 py-1 min-w-[80px]" />
                  )}
                </span>
                {isWrong && <span className="absolute -bottom-8 left-0 z-20 bg-gray-900 text-white text-xs px-2 py-1 rounded">✓ {cleanOptionText(question.answer)}</span>}
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
                                                <input type="text" value={userAnswer} onChange={(e) => handleSelect(qKey, e.target.value)} disabled={showAnswers} className={`border-b-2 outline-none px-2 py-1 w-48 text-center transition-colors ${showAnswers ? (isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50") : "border-gray-300 focus:border-blue-500"}`} />
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

  const renderSpeakingPart3 = () => {
    return (
      <div className="space-y-8 animate-in fade-in">
        <div className="flex justify-center mb-6">
            <div className="bg-gray-100 p-1 rounded-full flex text-sm font-medium">
                <button onClick={() => setPart3Phase('discussion')} className={`px-4 py-2 rounded-full ${part3Phase === 'discussion' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>1. Discussion</button>
                <button onClick={() => setPart3Phase('decision')} className={`px-4 py-2 rounded-full ${part3Phase === 'decision' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}>2. Decision</button>
                <button onClick={() => setPart3Phase('part4')} className={`px-4 py-2 rounded-full ${part3Phase === 'part4' ? 'bg-white shadow text-emerald-700' : 'text-gray-500'}`}>3. Part 4</button>
            </div>
        </div>
        {part3Phase === 'discussion' && (
            <div className="bg-white p-8 rounded-2xl border-2 border-blue-100 text-center shadow-lg">
                <h3 className="font-bold text-gray-400 mb-6 uppercase tracking-widest text-sm">Collaborative Task (2 mins)</h3>
                <div className="text-2xl font-black text-blue-600 mb-8 leading-tight">{data.part3_central_question}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.part3_prompts?.map((p,i) => <div key={i} className="bg-blue-50 p-4 rounded-xl border border-blue-200 font-medium text-blue-900">{p}</div>)}
                </div>
            </div>
        )}
        {part3Phase === 'decision' && (
            <div className="bg-purple-50 p-8 rounded-2xl border-2 border-purple-100 text-center shadow-lg animate-in zoom-in-95">
                <h3 className="font-bold text-purple-400 mb-6 uppercase tracking-widest text-sm">Decision Phase (1 min)</h3>
                <p className="text-xl font-bold text-purple-900 leading-relaxed italic">"{data.part3_decision_question}"</p>
            </div>
        )}
        {part3Phase === 'part4' && (
            <div className="bg-emerald-50 p-8 rounded-2xl border-2 border-emerald-100 shadow-lg">
                <h3 className="font-bold text-emerald-600 mb-6 flex items-center gap-2 uppercase tracking-widest text-sm"><Users className="w-5 h-5"/> Part 4: Discussion</h3>
                <ul className="space-y-4">
                    {data.part4_questions?.map((q,i) => <li key={i} className="flex gap-3 text-emerald-900 font-medium bg-white/50 p-3 rounded-lg"><span className="text-emerald-400 font-black">{i+1}.</span> {q}</li>)}
                </ul>
            </div>
        )}
      </div>
    );
  };

  if (isChoiceMode && !selectedOption) {
    return (
        <div className="bg-slate-50 min-h-screen p-8 animate-in fade-in">
             <div className="max-w-4xl mx-auto">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-500 mb-8"><ArrowLeft className="w-5 h-5" /> Back</button>
                <h1 className="text-3xl font-black mb-8">Choose Your Writing Task</h1>
                <div className="grid gap-6">
                    {data.options?.map((opt) => (
                        <button key={opt.id} onClick={() => setSelectedOption(opt)} className="bg-white p-6 rounded-2xl border-2 hover:border-blue-500 text-left transition-all group shadow-sm">
                            <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600">{opt.title}</h3>
                            <p className="text-gray-600 mb-4">{opt.text}</p>
                            <span className="text-sm font-bold text-blue-500 flex items-center gap-2"><LayoutList className="w-4 h-4"/> Tip: {opt.tips}</span>
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
      <div className="bg-white min-h-screen flex flex-col animate-in fade-in">
        {feedback && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 relative">
                    <button onClick={() => setFeedback(null)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full"><XCircle className="w-6 h-6"/></button>
                    <div className="flex items-center justify-between mb-8 border-b pb-6">
                        <h2 className="text-3xl font-black">Assessment Result</h2>
                        <div className="text-5xl font-black text-blue-600">{feedback.score}/20</div>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8"><h4 className="font-bold text-blue-900 mb-2">Examiner Feedback</h4><p className="text-blue-800 leading-relaxed whitespace-pre-wrap">{feedback.feedback}</p></div>
                    {feedback.corrections?.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="font-bold text-lg border-b pb-2">Key Improvements</h4>
                            {feedback.corrections.map((corr: any, i: number) => (
                                <div key={i} className="bg-white border-l-4 border-red-400 p-4 shadow-sm rounded-r-lg">
                                    <div className="flex gap-4 mb-2">
                                        <div className="flex-1 bg-red-50 p-2 rounded line-through text-red-700">{corr.original}</div>
                                        <div className="flex-1 bg-green-50 p-2 rounded text-green-700 font-bold">{corr.correction}</div>
                                    </div>
                                    <p className="text-sm text-gray-500 italic">💡 {corr.explanation}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {feedback.model_answer && <div className="mt-8 bg-emerald-50 p-6 rounded-2xl border border-emerald-100"><h4 className="font-bold text-emerald-900 flex items-center gap-2 mb-4"><Sparkles className="w-5 h-5"/> Model Answer (C1 Level)</h4><div className="text-emerald-800 font-serif leading-relaxed whitespace-pre-wrap">{feedback.model_answer}</div></div>}
                    <button onClick={onBack} className="mt-8 w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-lg">Main Menu</button>
                </div>
            </div>
        )}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
            <button onClick={() => selectedOption ? setSelectedOption(null) : onBack()} className="flex items-center gap-2 text-gray-500"><ArrowLeft className="w-5 h-5" /> Back</button>
            <h2 className="font-bold text-lg truncate max-w-md">{taskTitle}</h2>
            <div className="text-sm font-bold bg-gray-100 px-3 py-1 rounded-full text-gray-600 flex items-center gap-2"><Clock className="w-4 h-4" /> 45:00</div>
        </div>
        <div className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden">
            <div className="overflow-y-auto pr-2 space-y-6">
                <div className="bg-blue-50 p-4 rounded-xl flex gap-3 text-blue-800 text-sm border border-blue-100"><AlertCircle className="w-5 h-5 flex-shrink-0"/><p>{data.instruction || "Follow the task instructions below."}</p></div>
                <div className="bg-white border-2 rounded-2xl p-8 shadow-sm font-serif leading-relaxed text-lg whitespace-pre-line text-gray-800">{taskContent}</div>
            </div>
            <div className="flex flex-col bg-white rounded-2xl border-2 shadow-xl overflow-hidden">
                <div className="bg-gray-50 p-4 border-b flex justify-between items-center text-sm font-bold text-gray-500 uppercase tracking-widest"><div className="flex items-center gap-2"><PenTool className="w-4 h-4"/> Your Response</div><div className={wordCount >= 220 && wordCount <= 260 ? "text-green-600" : "text-gray-400"}>{wordCount} words</div></div>
                <textarea className="flex-1 p-8 outline-none resize-none font-serif text-xl leading-relaxed" placeholder="Start typing your answer here..." value={essayAnswer} onChange={handleEssayChange} spellCheck={false} />
                <div className="p-4 bg-gray-50 border-t"><button onClick={submitWritingTask} disabled={loadingGrade} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:scale-100">{loadingGrade ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : "Submit for Grading"}</button></div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-screen shadow-2xl rounded-xl overflow-hidden flex flex-col animate-in fade-in duration-500">
      <div className={`p-6 flex justify-between items-center sticky top-0 z-10 shadow-md text-white ${isSpeaking ? 'bg-purple-900' : isWriting ? 'bg-emerald-900' : isListening ? 'bg-orange-800' : 'bg-gray-900'}`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition"><ArrowLeft className="w-6 h-6" /></button>
          <div><h2 className="text-xl font-bold">{data.title}</h2><p className="text-white/70 text-sm">C1 Advanced</p></div>
        </div>
        <button onClick={handleDownloadPDF} disabled={isDownloading} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-all border border-white/20">
          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />} PDF
        </button>
      </div>

      <div className="p-8 md:p-12 space-y-8 overflow-y-auto flex-1 relative custom-scrollbar">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg text-blue-900 leading-relaxed shadow-sm">
          <h3 className="font-bold mb-2 flex items-center gap-2 uppercase tracking-wider text-xs"><AlertCircle className="w-4 h-4" /> Instructions</h3>
          {data.instructions}
        </div>

        {data.image_urls && data.image_urls.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.image_urls.map((url, i) => (
              <div key={i} className="rounded-xl overflow-hidden shadow-lg border-2 border-gray-100 hover:scale-105 transition-transform"><img src={url} alt="Task" className="w-full h-full object-cover aspect-square" /></div>
            ))}
          </div>
        )}

        {isListening && (
          <div className="bg-orange-50 p-6 rounded-2xl border-2 border-orange-100 shadow-sm flex flex-col items-center gap-4 sticky top-0 z-20">
            <div className="flex items-center gap-2 text-orange-800 font-bold text-lg"><Volume2 className="w-6 h-6" /> Audio Track</div>
            {loadingAudio ? (
              <div className="flex items-center gap-2 text-orange-600 font-medium"><Loader2 className="animate-spin w-5 h-5" /> Generating...</div>
            ) : audioUrl ? (
              <AudioPlayerLocked isVip={user?.is_vip || false} audioUrl={audioUrl} onUnlock={onOpenPricing} />
            ) : <p className="text-red-500 text-sm">Error loading audio.</p>}
            
            <button onClick={() => setShowTranscript(!showTranscript)} className="text-sm font-bold text-orange-700 underline flex items-center gap-1 hover:text-orange-900 mt-2">
                <FileText className="w-4 h-4" /> {showTranscript ? "Hide Transcript" : "Show Transcript"}
            </button>
          </div>
        )}

        <div className="relative">
           {isListening && (!user || !user.is_vip) && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-white/70 backdrop-blur-[2px] rounded-2xl">
                  <div className="bg-white p-8 rounded-3xl shadow-2xl border-2 border-orange-100 max-w-sm text-center animate-in zoom-in-95">
                      <div className="bg-orange-100 p-5 rounded-full mb-5 w-20 h-20 flex items-center justify-center mx-auto shadow-inner"><Lock className="w-10 h-10 text-orange-600" /></div>
                      <h3 className="font-black text-gray-900 text-2xl mb-3">Listening Locked</h3>
                      <p className="text-gray-600 mb-8 leading-relaxed">Upgrade to the <strong>Season Pass</strong> to unlock tracks.</p>
                      <button onClick={onOpenPricing} className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl hover:scale-105 transition shadow-xl">Unlock Now</button>
                  </div>
              </div>
           )}

           <div className={isListening && (!user || !user.is_vip) ? "filter blur-sm pointer-events-none select-none opacity-50" : ""}>
              {isSpeakingPart3 ? (
                  renderSpeakingPart3()
              ) : isListeningPart2 ? (
                  <>
                    {renderListeningPart2()}
                    {showTranscript && (
                        <div className="mt-8 prose max-w-none bg-gray-50 p-8 rounded-2xl border-2 border-gray-200 leading-relaxed font-serif text-xl text-gray-800">
                            <h4 className="font-bold text-gray-400 mb-6 uppercase tracking-widest text-sm border-b pb-4">Transcript</h4>
                            {data.text || "No text available"}
                        </div>
                    )}
                  </>
              ) : isGapFill ? (
                <div className="bg-white p-8 rounded-2xl border-2 border-gray-100 shadow-sm">{renderInteractiveText()}</div>
              ) : (
                <>
                  {data.text && (!isListening || showTranscript) && (
                    <div className="prose max-w-none bg-gray-50 p-8 rounded-2xl border-2 border-gray-200 leading-relaxed font-serif text-xl text-gray-800 shadow-inner">
                        {data.text}
                    </div>
                  )}

                  {isInteractive && (
                    <div className="space-y-8 mt-8">
                      {data.questions.map((q, idx) => {
                         const key = q.question || idx.toString();
                         const userAnswer = userAnswers[key];
                         const cleanCorrectAnswer = cleanOptionText(q.answer);
                         const isCorrect = showAnswers && (userAnswer === cleanCorrectAnswer.toLowerCase() || userAnswer === q.answer.trim().toLowerCase());
                         const isWrong = showAnswers && userAnswer && !isCorrect;
                         return (
                            <div key={idx} className={`p-6 rounded-2xl border-2 transition-all ${showAnswers ? (isCorrect ? 'bg-green-50 border-green-200' : isWrong ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100') : 'bg-white border-gray-100 hover:shadow-lg'}`}>
                                <div className="space-y-6">
                                    <div className="flex gap-4 items-start"><span className="font-black text-gray-200 text-3xl">{idx + 1}</span><p className="font-bold text-gray-900 text-lg pt-1">{q.question}</p></div>
                                    
                                    {data.type === "reading_and_use_of_language4" && q.original_sentence && (
                                        <div className="mb-4 bg-slate-50 p-4 rounded-lg border">
                                            <p className="text-gray-900 font-medium mb-3">{q.original_sentence}</p>
                                            <div className="bg-gray-900 text-white px-3 py-1 rounded-md font-bold text-sm tracking-wider uppercase shadow-sm w-fit mb-3">{q.keyword}</div>
                                            <p className="text-gray-800">{q.second_sentence}</p>
                                        </div>
                                    )}

                                    {q.options && q.options.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {q.options.map((opt, i) => {
                                                const text = cleanOptionText(opt);
                                                const isSelected = userAnswer === text.toLowerCase();
                                                const isTheCorrectOption = text.toLowerCase() === cleanCorrectAnswer.toLowerCase();
                                                let optClass = "p-4 border-2 rounded-xl cursor-pointer transition-all flex justify-between items-center select-none ";
                                                if (showAnswers) {
                                                    if (isTheCorrectOption) optClass += "bg-green-100 border-green-500 font-bold text-green-900";
                                                    else if (isSelected) optClass += "bg-red-100 border-red-400 text-red-800";
                                                    else optClass += "opacity-40 grayscale-[0.5]";
                                                } else {
                                                    if (isSelected) optClass += "bg-blue-100 border-blue-600 text-blue-900 shadow-md ring-4 ring-blue-500/10";
                                                    else optClass += "bg-white hover:bg-gray-50 border-gray-200";
                                                }
                                                return (<div key={i} onClick={() => handleSelect(key, text.toLowerCase())} className={optClass}><div className="flex items-center"><span className="font-black mr-3 opacity-30">{String.fromCharCode(65 + i)}.</span>{text}</div>{showAnswers && isTheCorrectOption && <CheckCircle className="w-5 h-5 text-green-700" />}{showAnswers && isSelected && !isTheCorrectOption && <XCircle className="w-5 h-5 text-red-600" />}</div>);
                                            })}
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <input type="text" value={userAnswer || ""} disabled={showAnswers} autoComplete="off" spellCheck="false" onChange={(e) => handleSelect(key, e.target.value)} placeholder="Type answer..." className={`w-full p-4 border-2 rounded-xl outline-none font-bold ${showAnswers ? (isCorrect ? "bg-green-100 border-green-500 text-green-900" : "bg-red-50 border-red-300 text-red-900") : "focus:border-blue-500 bg-gray-50 text-gray-800"}`} />
                                            {showAnswers && !isCorrect && <div className="mt-3 text-sm font-black text-green-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> CORRECT: <span className="uppercase">{cleanCorrectAnswer}</span></div>}
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
                                <div className="flex flex-col items-center justify-center py-6 gap-4">
                                    <button onClick={toggleRecording} disabled={isTranscribing} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl ${isRecording ? 'bg-red-500 animate-pulse ring-8 ring-red-100' : 'bg-purple-600 ring-8 ring-purple-100'}`}>
                                        {isRecording ? <StopCircle className="w-12 h-12 text-white" /> : <Mic className="w-12 h-12 text-white" />}
                                    </button>
                                    {isTranscribing && <div className="text-purple-600 font-bold flex items-center gap-2"><Loader2 className="animate-spin w-5 h-5" /> Processing...</div>}
                                </div>
                            )}
                            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={isSpeaking && (!user || !user.is_vip)} placeholder={isSpeaking ? "Transcript will appear here..." : "Write response here..."} className="w-full h-80 p-8 border-2 rounded-3xl outline-none text-xl font-serif leading-relaxed resize-none shadow-inner focus:border-blue-500" />
                            <div className="flex justify-end pt-4">
                                <button onClick={handleSubmitCreative} disabled={loadingGrade || inputText.length < 10 || isTranscribing || isRecording} className="flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 transition-all disabled:opacity-50">
                                    {loadingGrade ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5" />} Submit for Feedback
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="animate-in slide-in-from-bottom-10 space-y-6 pb-20">
                            <div className="bg-white border-2 rounded-3xl p-8 shadow-xl flex items-center justify-between border-blue-50">
                                <div><h3 className="text-2xl font-black text-gray-900">AI Assessment</h3><p className="text-gray-500">Cambridge C1 criteria</p></div>
                                <div className="text-right flex flex-col items-center"><div className="text-5xl font-black text-blue-600">{feedback.score}/20</div></div>
                            </div>
                            <div className="bg-blue-50 p-8 rounded-3xl border-2 border-blue-100 shadow-inner"><h4 className="font-black text-blue-900 mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5"/> Feedback</h4><p className="text-blue-800 leading-relaxed">{feedback.feedback}</p></div>
                            {feedback.model_answer && (
                                <div className="mt-8 p-8 bg-emerald-50 rounded-3xl border-2 border-emerald-100">
                                    <h3 className="text-xl font-black text-emerald-900 mb-6 flex items-center gap-2"><Sparkles className="w-6 h-6" /> Perfect Answer</h3>
                                    <div className="prose text-emerald-900 font-serif text-lg leading-relaxed whitespace-pre-wrap">{feedback.model_answer}</div>
                                </div>
                            )}
                            <button onClick={onBack} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold">Main Menu</button>
                        </div>
                    )}
                </div>
              )}
           </div>
        </div>
      </div>

      {isInteractive && (
        <div className="p-6 border-t bg-gray-50/80 backdrop-blur-md flex justify-center sticky bottom-0 z-20">
          {!showAnswers ? (
            <button onClick={checkScore} disabled={isListening && (!user || !user.is_vip)} className="flex items-center gap-3 px-16 py-4 rounded-2xl font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
              <Eye className="w-5 h-5" /> Check Answers
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="text-2xl font-black">Score: {score} / {data.questions.length}</div>
              <button onClick={onBack} className="flex items-center gap-2 px-10 py-3 rounded-full font-black text-gray-600 bg-white border-2 hover:bg-gray-100 transition-all shadow-md">Menu <ArrowRight className="w-5 h-5"/></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}