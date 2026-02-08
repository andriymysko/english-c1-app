import { useState, useEffect, useRef } from "react";
import { ArrowLeft, CheckCircle, Download, Eye, RefreshCw, XCircle, Send, Loader2, AlertCircle, Mic, StopCircle, Volume2, FileText, Sparkles, Image as ImageIcon, ChevronDown, Lock } from "lucide-react";
// 👇 HE ELIMINAT 'reportIssue' D'AQUESTA IMPORTACIÓ PER CORREGIR L'ERROR
import { preloadExercise, submitResult, gradeWriting, gradeSpeaking, transcribeAudio, fetchAudio } from "../api";
import { useAuth } from "../context/AuthContext";
import confetti from 'canvas-confetti';
import { playSuccessSound, playErrorSound } from "../utils/audioFeedback";
import AudioPlayerLocked from './AudioPlayerLocked';

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
}

interface Props {
  data: ExerciseData;
  onBack: () => void;
  onOpenPricing: () => void; 
}

export default function ExercisePlayer({ data, onBack, onOpenPricing }: Props) {
  const { user } = useAuth();

  // REFS
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // GENERAL STATES
  const [loadingGrade, setLoadingGrade] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false); 

  // STANDARD STATES
  const [showAnswers, setShowAnswers] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);

  // WRITING/SPEAKING STATES
  const [inputText, setInputText] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);

  // LISTENING STATES
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // --- EXERCISE TYPE FLAGS ---
  const isWriting = data.type.startsWith("writing");
  const isSpeaking = data.type.startsWith("speaking");
  const isListening = data.type.startsWith("listening");
  const isPart4 = data.type === "reading_and_use_of_language4";

  // 🌟 DETECT INLINE GAP EXERCISE
  const isGapFill = [
    "reading_and_use_of_language1",
    "reading_and_use_of_language2",
    "reading_and_use_of_language3",
    "listening2"
  ].includes(data.type);

  const isInteractive = !isWriting && !isSpeaking;

  // --- PDF GENERATION FUNCTION ---
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

      if (!response.ok) throw new Error("Server failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (data.title || "Exercise").replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `${safeTitle}_task.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("PDF download error:", error);
      alert("Failed to generate high-quality PDF. Please check backend connection.");
    } finally {
      setIsDownloading(false);
    }
  };

  // --- BROWSER BACK BUTTON HANDLING ---
  useEffect(() => {
    window.history.pushState({ page: "exercise" }, "", "");
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      onBack();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [onBack]);

  // --- RESET STATE ON DATA CHANGE ---
  useEffect(() => {
    setShowAnswers(false);
    setUserAnswers({});
    setScore(null);
    setFeedback(null);
    setInputText("");
    setShowTranscript(false);
  }, [data.id, data.title]);

  useEffect(() => {
    if (isInteractive) {
      preloadExercise(data.type, data.level || "C1");
    }

    if (isListening && data.text) {
      setLoadingAudio(true);
      fetchAudio(data.text)
        .then(url => setAudioUrl(url))
        .catch(err => console.error("Audio error", err))
        .finally(() => setLoadingAudio(false));
    }
  }, [data.type, data.level, isInteractive, isListening, data.text]);

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

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        setIsTranscribing(true);
        try {
          const result = await transcribeAudio(audioBlob);
          setInputText(prev => prev + " " + result.text);
        } catch (err) {
          alert("Could not transcribe audio.");
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone denied.");
    }
  };

  const handleSubmitCreative = async () => {
    if (!user || !inputText) return;
    setLoadingGrade(true);
    try {
      let result;
      const fullTask = data.instructions + " " + (data.text || "");
      if (isWriting) result = await gradeWriting(user.uid, fullTask, inputText);
      else result = await gradeSpeaking(user.uid, fullTask, inputText);
      setFeedback(result);

      playSuccessSound();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    } catch (e) {
      alert("Error grading submission");
    } finally {
      setLoadingGrade(false);
    }
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
        question: q.question,
        stem: q.stem || "",
        user_answer: userAnswers[key] || "",
        correct_answer: q.answer,
        type: data.type
      });
    });
    setScore(correct);
    setShowAnswers(true);

    if (correct > (data.questions.length / 2)) {
      playSuccessSound();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#2563eb', '#3b82f6', '#60a5fa'] });
    } else {
      playErrorSound();
    }

    if (user) {
      submitResult({
        user_id: user.uid,
        exercise_type: data.type,
        exercise_id: data.id || null,
        score: correct,
        total: data.questions.length,
        mistakes: mistakes
      });
    }
  };

  // --- RENDER HELPERS ---

  const renderInteractiveText = () => {
    if (!data.text) return null;
    const parts = data.text.split(/\[\s*(\d+)\s*\]/g);

    return (
      <div className="leading-loose text-lg text-gray-800 font-serif text-justify">
        {parts.map((part, index) => {
          if (!isNaN(Number(part)) && part.trim() !== "") {
            const questionNumString = part.trim();
            const question = data.questions.find(q => q.question === questionNumString)
              || data.questions[parseInt(questionNumString) - 1];

            if (!question) return <span key={index} className="text-red-500 font-bold">[{part}]</span>;

            const qKey = question.question || index.toString();
            const userAnswer = userAnswers[qKey] || "";
            const isCorrect = showAnswers && (userAnswer.toLowerCase() === cleanOptionText(question.answer).toLowerCase());
            const isWrong = showAnswers && !isCorrect;

            const wrapperClass = `inline-flex items-center align-middle mx-1 my-1 rounded-md border shadow-sm transition-all overflow-hidden relative
                ${showAnswers
                ? (isCorrect ? "border-green-500 ring-1 ring-green-500" : "border-red-500 ring-1 ring-red-500")
                : "border-gray-300 bg-white hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200"
              }`;

            const badgeClass = `px-2 py-1.5 text-xs font-bold border-r select-none h-full flex items-center justify-center
                ${showAnswers
                ? (isCorrect ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300")
                : "bg-slate-100 text-slate-500 border-gray-200"
              }`;

            const inputClass = "outline-none bg-transparent px-2 py-1 text-base min-w-[80px] text-gray-800 font-sans h-full";

            return (
              <span key={index} className="group relative inline-block">
                <span className={wrapperClass}>
                  <span className={badgeClass}>{questionNumString}</span>
                  {data.type === "reading_and_use_of_language1" && question.options ? (
                    <div className="relative h-full">
                      <select
                        value={userAnswer}
                        onChange={(e) => handleSelect(qKey, e.target.value)}
                        disabled={showAnswers}
                        className={`${inputClass} appearance-none pr-7 cursor-pointer`}
                      >
                        <option value="">Choose...</option>
                        {question.options.map((opt: any, i: number) => (
                          <option key={i} value={cleanOptionText(opt)}>{cleanOptionText(opt)}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={userAnswer}
                      onChange={(e) => handleSelect(qKey, e.target.value)}
                      disabled={showAnswers}
                      autoComplete="off"
                      className={inputClass}
                      style={{ width: `${Math.max(80, userAnswer.length * 10)}px` }}
                    />
                  )}
                </span>
                {data.type === "reading_and_use_of_language3" && question.stem && (
                  <span className="ml-1 text-xs font-bold text-gray-500 tracking-wider font-mono border border-gray-200 bg-gray-50 px-1 rounded align-middle">
                    {question.stem}
                  </span>
                )}
                {isWrong && (
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg animate-in fade-in slide-in-from-top-1 pointer-events-none">
                    <span className="text-green-300 font-bold mr-1">✓</span> {cleanOptionText(question.answer)}
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></span>
                  </span>
                )}
              </span>
            );
          }
          const cleanPart = part.replace(/_+/g, "");
          return <span key={index}>{cleanPart}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-screen shadow-2xl rounded-xl overflow-hidden flex flex-col animate-in fade-in duration-500">

      {/* HEADER */}
      <div className={`p-6 flex justify-between items-center sticky top-0 z-10 shadow-md text-white
        ${isSpeaking ? 'bg-purple-900' : isWriting ? 'bg-emerald-900' : isListening ? 'bg-orange-800' : 'bg-gray-900'}`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl font-bold">{data.title}</h2>
            <p className="text-white/70 text-sm">C1 Advanced •
              {isWriting ? " Writing" : isSpeaking ? " Speaking" : isListening ? " Listening" : " Reading"}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
             isDownloading ? "bg-white/10 cursor-not-allowed opacity-70" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          {isDownloading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Generating...</span></> : <><Download className="w-4 h-4" /><span>PDF</span></>}
        </button>
      </div>

      {/* CONTENT */}
      <div className="p-8 md:p-12 space-y-8 overflow-y-auto flex-1 relative">
        
        {/* INSTRUCTIONS */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg text-blue-900 leading-relaxed shadow-sm">
          <h3 className="font-bold mb-2 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Instructions</h3>
          {data.instructions}
        </div>

        {/* SPEAKING IMAGES */}
        {data.image_urls && data.image_urls.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" /> Visual Materials
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {data.image_urls.map((url: string, index: number) => (
                <div key={index} className="rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-gray-100 group hover:scale-[1.02] transition-transform">
                  <div className="aspect-square relative">
                    <img src={url} alt={`Task picture ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-3 bg-white border-t flex flex-col items-center gap-1">
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Picture {String.fromCharCode(65 + index)}</span>
                    {data.image_prompts && data.image_prompts[index] && (
                      <p className="text-xs text-gray-500 text-center italic leading-tight px-2">"{data.image_prompts[index]}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LISTENING PLAYER (LOCK VIP) */}
        {isListening && (
          <div className="bg-orange-50 p-6 rounded-xl border border-orange-200 shadow-sm flex flex-col items-center gap-4 sticky top-0 z-20">
            <div className="flex items-center gap-2 text-orange-800 font-bold text-lg">
              <Volume2 className="w-6 h-6" /> Audio Track
            </div>
            {loadingAudio ? (
              <div className="flex items-center gap-2 text-orange-600"><Loader2 className="animate-spin w-5 h-5" /> Generating AI Voice...</div>
            ) : audioUrl ? (
                // 🔒 REPRODUCTOR BLOQUEJAT (Ara passem la funció correcta)
                <AudioPlayerLocked isVip={user?.is_vip} audioUrl={audioUrl} onUnlock={onOpenPricing} />
            ) : (
              <p className="text-red-500">Error loading audio.</p>
            )}
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="text-sm text-orange-700 underline flex items-center gap-1 hover:text-orange-900 mt-2"
            >
              <FileText className="w-4 h-4" /> {showTranscript ? "Hide Transcript" : "Show Transcript (Cheating!)"}
            </button>
          </div>
        )}

        {/* ========================================================== */}
        {/* 🔒 ZONA INTERACTIVA AMB BLOQUEIG PER LISTENING (MILLORAT) */}
        {/* ========================================================== */}
        <div className="relative">
            
            {/* OVERLAY BLOQUEIG PER LISTENING NO VIP */}
            {!user?.is_vip && isListening && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-white/70 backdrop-blur-[2px] rounded-xl h-full">
                    <div className="sticky top-20 bg-white p-8 rounded-3xl shadow-2xl border border-orange-100 max-w-sm text-center animate-in zoom-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-gradient-to-br from-orange-100 to-orange-200 p-5 rounded-full mb-5 w-20 h-20 flex items-center justify-center mx-auto shadow-inner">
                            <Lock className="w-10 h-10 text-orange-600" />
                        </div>
                        <h3 className="font-black text-gray-900 text-2xl mb-3">Listening Locked</h3>
                        <p className="text-gray-600 mb-8 leading-relaxed">
                            Upgrade to the <strong>Season Pass</strong> to unlock full audio tracks and interactive questions.
                        </p>
                        <button 
                            onClick={onOpenPricing} // 👈 ARA SÍ: CRIDA LA FUNCIÓ DEL PARE
                            className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl hover:scale-105 transition shadow-xl hover:shadow-orange-200 flex items-center justify-center gap-2"
                        >
                            <Lock className="w-5 h-5" /> Unlock Listening
                        </button>
                    </div>
                </div>
            )}

            {/* CONTINGUT REAL (BORRÓS I DESACTIVAT) */}
            <div className={!user?.is_vip && isListening ? "filter blur-sm pointer-events-none select-none opacity-50 transition-all duration-500" : ""}>
                
                {/* INLINE GAP MODE */}
                {isGapFill ? (
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                    {renderInteractiveText()}
                </div>
                ) : (
                data.text && (!isListening || showTranscript || (isListening && !isWriting && !isSpeaking)) && (
                    <div className={`prose max-w-none bg-gray-50 p-6 rounded-xl border border-gray-200 leading-relaxed whitespace-pre-line font-serif text-lg text-gray-800 
                        ${isListening && !showTranscript ? 'hidden' : ''}`}>
                    {isListening && showTranscript && <div className="text-red-500 font-bold mb-2 text-sm uppercase tracking-wide">Transcript Visible</div>}
                    {data.text}
                    </div>
                )
                )}

                {/* QUESTIONS LIST */}
                {isInteractive && !isGapFill && (
                <div className="space-y-8 mt-8">
                    {data.questions.map((q, idx) => {
                    const key = q.question || idx.toString();
                    const userAnswer = userAnswers[key];
                    const cleanCorrectAnswer = cleanOptionText(q.answer);
                    const isCorrect = showAnswers && (
                        userAnswer === cleanCorrectAnswer.toLowerCase() ||
                        userAnswer === q.answer.trim().toLowerCase()
                    );
                    const isWrong = showAnswers && userAnswer && !isCorrect;

                    return (
                        <div key={idx} className={`p-6 rounded-xl border transition-all ${showAnswers
                        ? (isCorrect ? 'bg-green-50 border-green-200' : isWrong ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200')
                        : 'bg-white border-gray-100 hover:shadow-md'
                        }`}>
                        <div className="flex gap-4">
                            <div className="flex-1 space-y-4">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-gray-400 text-lg">{q.question}</span>
                            </div>

                            {isPart4 ? (
                                <div className="mb-4 bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
                                <p className="text-gray-900 font-medium text-lg mb-3 leading-relaxed">
                                    {q.original_sentence || "Original sentence missing"}
                                </p>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                                    <div className="bg-gray-900 text-white px-3 py-1 rounded-md font-bold text-sm tracking-wider uppercase shadow-sm w-fit">
                                    {q.keyword || "KEYWORD"}
                                    </div>
                                    <p className="text-sm text-gray-500 italic">(Use 3-6 words)</p>
                                </div>
                                <p className="text-gray-800 text-lg">
                                    {q.second_sentence || "Second sentence missing"}
                                </p>
                                </div>
                            ) : (
                                q.stem && <div className="mb-2"><p className="font-medium text-gray-900 text-lg">{q.stem}</p></div>
                            )}

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
                                        <div className="flex items-center">
                                        <span className="font-bold mr-3 opacity-60">{String.fromCharCode(65 + i)}.</span>
                                        {text}
                                        </div>
                                        {showAnswers && isTheCorrectOption && <CheckCircle className="w-5 h-5 text-green-700" />}
                                        {showAnswers && isSelected && !isTheCorrectOption && <XCircle className="w-5 h-5 text-red-600" />}
                                    </div>
                                    );
                                })}
                                </div>
                            ) : (
                                <div className="relative">
                                <input
                                    type="text"
                                    value={userAnswer || ""}
                                    disabled={showAnswers}
                                    autoComplete="off"
                                    spellCheck="false"
                                    onChange={(e) => handleSelect(key, e.target.value)}
                                    placeholder="Type your answer..."
                                    className={`w-full p-3 border rounded-lg outline-none font-medium ${showAnswers
                                    ? (userAnswer?.trim().toLowerCase() === q.answer.trim().toLowerCase()
                                        ? "bg-green-100 border-green-500 text-green-900 font-bold"
                                        : "bg-red-50 border-red-300 text-red-900")
                                    : "focus:ring-2 focus:ring-blue-500 bg-gray-50 border-gray-300 text-gray-800"
                                    }`}
                                />
                                {showAnswers && !isCorrect && (
                                    <div className="mt-2 text-sm text-green-700 font-bold flex items-center gap-1 animate-in slide-in-from-top-2">
                                    <CheckCircle className="w-4 h-4" /> Correct: <span className="uppercase">{cleanCorrectAnswer}</span>
                                    </div>
                                )}
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


        {/* --- CREATIVE MODE UI (SPEAKING & WRITING) --- */}
        {!isInteractive && (
          <div className="space-y-6">
            {!feedback ? (
              <>
                {isSpeaking && (
                  <div className="flex flex-col items-center justify-center py-4 gap-2 relative">
                      
                      {/* 🔒 SPEAKING OVERLAY LOCK */}
                      {!user?.is_vip && (
                        <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl text-center p-4 border border-white/50">
                            <div className="bg-purple-100 p-4 rounded-full mb-3 shadow-lg">
                                <Lock className="w-8 h-8 text-purple-600" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg">Speaking Mode is Locked</h3>
                            <p className="text-sm text-gray-600 mb-4 max-w-xs">
                                Upgrade to the Season Pass to get instant AI analysis.
                            </p>
                            <button 
                                onClick={onOpenPricing} // 👈 FUNCIÓ PARE CORRECTA
                                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-full hover:scale-105 transition shadow-lg"
                            >
                                Unlock Speaking
                            </button>
                        </div>
                      )}

                    <button
                      onClick={toggleRecording}
                      disabled={isTranscribing || !user?.is_vip} 
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl
                          ${isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed'}`}
                    >
                      {isRecording ? <StopCircle className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-white" />}
                    </button>
                    {isRecording && <p className="text-red-500 font-bold animate-pulse text-sm">Recording... Click to finish</p>}
                    {isTranscribing && <p className="text-purple-600 font-bold flex items-center gap-2 text-sm"><Loader2 className="animate-spin w-4 h-4" /> Converting Audio to Text...</p>}
                  </div>
                )}

                <div className="relative">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isSpeaking && !user?.is_vip}
                    placeholder={isSpeaking ? "Your speech will appear here automatically after recording..." : "Write your essay here... (Minimum 150 words)"}
                    className={`w-full h-80 p-6 border-2 rounded-xl outline-none text-lg font-serif leading-relaxed resize-none shadow-inner
                                ${isSpeaking ? 'border-purple-200 focus:border-purple-500 bg-purple-50/30' : 'border-emerald-200 focus:border-emerald-500'}`}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSubmitCreative}
                    disabled={loadingGrade || inputText.length < 10 || isTranscribing || isRecording || (!user?.is_vip && isSpeaking)}
                    className="flex items-center gap-2 px-8 py-3 rounded-full font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 shadow-lg transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingGrade ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5" />}
                    Submit for Feedback
                  </button>
                </div>
              </>
            ) : (
              <div className="animate-in slide-in-from-bottom-10 space-y-6">
                <div className="bg-white border rounded-2xl p-6 shadow-lg flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Assessment Result</h3>
                    <p className="text-gray-500">Based on Cambridge C1 Criteria</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-blue-600">{feedback.score}/20</div>
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-wide">Score</div>
                  </div>
                </div>
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                  <h4 className="font-bold text-blue-900 mb-2">Feedback</h4>
                  <p className="text-blue-800 leading-relaxed">{feedback.feedback}</p>
                </div>
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-800 text-lg border-b pb-2">Key Improvements</h4>
                  {feedback.corrections?.map((corr: any, idx: number) => (
                    <div key={idx} className="bg-white border-l-4 border-red-400 p-4 shadow-sm rounded-r-lg">
                      <div className="flex flex-col md:flex-row gap-4 mb-2">
                        <div className="flex-1 bg-red-50 text-red-800 p-2 rounded line-through decoration-red-400 decoration-2">{corr.original}</div>
                        <div className="flex-1 bg-green-50 text-green-800 p-2 rounded font-medium">{corr.correction}</div>
                      </div>
                      <p className="text-sm text-gray-500 italic">💡 {corr.explanation}</p>
                    </div>
                  ))}
                </div>
                {feedback.model_answer && (
                  <div className="mt-8 p-6 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm">
                    <h3 className="text-lg font-bold text-emerald-800 mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5" /> Model Answer (C1 Level)</h3>
                    <div className="prose text-emerald-900 whitespace-pre-wrap font-serif leading-relaxed">{feedback.model_answer}</div>
                  </div>
                )}
                <div className="flex justify-center pt-8">
                  <button onClick={onBack} className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-gray-600 bg-white border hover:bg-gray-100 transition">
                    <RefreshCw className="w-4 h-4" /> Try Another Task
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* FOOTER STANDARD */}
      {isInteractive && (
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-center sticky bottom-0 z-20">
          {!showAnswers ? (
            <button
              onClick={checkScore}
              // 🔒 DESHABILITEM EL BOTÓ CHECK SI ÉS LISTENING NO VIP
              disabled={isListening && !user?.is_vip}
              className="flex items-center gap-2 px-8 py-3 rounded-full font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 shadow-lg transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="w-5 h-5" /> Check Answers
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="text-xl font-bold text-gray-800">
                Score: <span className={score! > (data.questions.length / 2) ? "text-green-600" : "text-orange-600"}>{score}</span> / {data.questions.length}
              </div>
              <button onClick={onBack} className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-gray-600 bg-white border hover:bg-gray-100 transition">
                <RefreshCw className="w-4 h-4" /> Main Menu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}