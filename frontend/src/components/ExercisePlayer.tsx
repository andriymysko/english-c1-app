import { useState, useEffect, useRef } from "react";
import { ArrowLeft, CheckCircle, Download, Eye, RefreshCw, XCircle, Send, Loader2, AlertCircle, Mic, StopCircle, Volume2, FileText, Sparkles, Image as ImageIcon, Flag, PlayCircle } from "lucide-react"; // <--- PlayCircle NOU
import { downloadPDF, preloadExercise, submitResult, gradeWriting, gradeSpeaking, transcribeAudio, fetchAudio, reportIssue } from "../api"; 
import { useAuth } from "../context/AuthContext";
import confetti from 'canvas-confetti'; 
import { playSuccessSound, playErrorSound } from "../utils/audioFeedback"; 

interface Question {
  question: string;
  stem?: string;
  options?: any[];
  answer: string;
  answer_type: string;
  explanation?: string;
  timestamp?: string; // <--- NOU CAMP
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
}

export default function ExercisePlayer({ data, onBack }: Props) {
  const { user } = useAuth(); 
  
  // REFS
  const audioRef = useRef<HTMLAudioElement | null>(null); // <--- REFERÈNCIA D'ÀUDIO
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Estats generals
  const [loadingGrade, setLoadingGrade] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // Estats Standard
  const [showAnswers, setShowAnswers] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [reporting, setReporting] = useState<number | null>(null);

  // Estats Writing/Speaking
  const [inputText, setInputText] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Estats Listening
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false); 

  const isWriting = data.type.startsWith("writing");
  const isSpeaking = data.type.startsWith("speaking");
  const isListening = data.type.startsWith("listening");
  const isInteractive = !isWriting && !isSpeaking; 

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

  // --- AUDIO JUMP HELPER (NOU) ---
  const jumpToTimestamp = (timeStr: string) => {
    if (!audioRef.current) return;
    
    // Convertir "01:30" -> 90 segons
    const parts = timeStr.split(':');
    let seconds = 0;
    if (parts.length === 2) {
        seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else {
        seconds = parseInt(parts[0]);
    }
    
    // Saltar i reproduir
    audioRef.current.currentTime = seconds;
    audioRef.current.play();
  };

  const handleReport = async (idx: number, reason: string) => {
    if(!user) return;
    try {
        await reportIssue(user.uid, data, idx, reason);
        alert("Thanks for your feedback! We will review this question.");
    } catch (e) {
        alert("Failed to send report.");
    } finally {
        setReporting(null);
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
            console.error("Whisper error", err);
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
        
        // FEEDBACK AUDITIU: Èxit quan reps la nota!
        playSuccessSound();
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });

    } catch (e) {
        alert("Error grading submission");
    } finally {
        setLoadingGrade(false);
    }
  };

  const handleSelect = (qIndex: number, value: string) => {
    if (showAnswers) return; 
    setUserAnswers(prev => ({ ...prev, [qIndex]: value }));
  };

  const checkScore = async () => {
    let correct = 0;
    const mistakes: any[] = []; 
    data.questions.forEach((q, idx) => {
      const userAns = (userAnswers[idx] || "").trim().toLowerCase();
      const correctAns = q.answer.trim().toLowerCase();
      if (userAns === correctAns) correct++;
      else mistakes.push({
          question: q.question,
          stem: q.stem || "",
          user_answer: userAnswers[idx] || "",
          correct_answer: q.answer,
          type: data.type
        });
    });
    setScore(correct);
    setShowAnswers(true);

    // --- FEEDBACK AUDITIU I VISUAL ---
    if (correct > (data.questions.length / 2)) {
        playSuccessSound();
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#2563eb', '#3b82f6', '#60a5fa'] // Tons blaus
        });
    } else {
        playErrorSound(); // So d'ànims
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

  const getOptionText = (opt: any) => {
    if (typeof opt === 'string') return opt;
    return opt.text || JSON.stringify(opt);
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
          onClick={() => downloadPDF(data)}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition"
        >
          <Download className="w-4 h-4" />
          PDF
        </button>
      </div>

      {/* CONTINGUT */}
      <div className="p-8 md:p-12 space-y-8 overflow-y-auto flex-1">
        
        {/* INSTRUCTIONS */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg text-blue-900 leading-relaxed shadow-sm">
          <h3 className="font-bold mb-2 flex items-center gap-2"><AlertCircle className="w-5 h-5"/> Instructions</h3>
          {data.instructions}
        </div>

        {/* SPEAKING IMAGES */}
        {data.image_urls && data.image_urls.length > 0 && (
          <div className="space-y-2">
             <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <ImageIcon className="w-5 h-5"/> Visual Materials
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {data.image_urls.map((url: string, index: number) => (
                  <div key={index} className="rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-gray-100 group hover:scale-[1.02] transition-transform">
                    <div className="aspect-square relative">
                        <img 
                            src={url} 
                            alt={`Task picture ${index + 1}`} 
                            className="w-full h-full object-cover" 
                            loading="lazy"
                        />
                    </div>
                    <div className="p-3 bg-white border-t flex flex-col items-center gap-1">
                      <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Picture {String.fromCharCode(65 + index)}
                      </span>
                      {data.image_prompts && data.image_prompts[index] && (
                        <p className="text-xs text-gray-500 text-center italic leading-tight px-2">
                          "{data.image_prompts[index]}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* --- LISTENING AUDIO PLAYER (AMB REF) --- */}
        {isListening && (
            <div className="bg-orange-50 p-6 rounded-xl border border-orange-200 shadow-sm flex flex-col items-center gap-4 sticky top-0 z-0">
                <div className="flex items-center gap-2 text-orange-800 font-bold text-lg">
                    <Volume2 className="w-6 h-6" />
                    Audio Track
                </div>
                
                {loadingAudio ? (
                    <div className="flex items-center gap-2 text-orange-600">
                        <Loader2 className="animate-spin w-5 h-5" />
                        Generating AI Voice...
                    </div>
                ) : audioUrl ? (
                    // AFEGIT REF AQUÍ
                    <audio 
                        ref={audioRef} 
                        controls 
                        src={audioUrl} 
                        className="w-full max-w-md shadow-lg rounded-full" 
                        autoPlay 
                    />
                ) : (
                    <p className="text-red-500">Error loading audio.</p>
                )}

                <button 
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="text-sm text-orange-700 underline flex items-center gap-1 hover:text-orange-900 mt-2"
                >
                    <FileText className="w-4 h-4" />
                    {showTranscript ? "Hide Transcript" : "Show Transcript (Cheating!)"}
                </button>
            </div>
        )}

        {/* TEXT */}
        {data.text && (!isListening || showTranscript || (isListening && !isWriting && !isSpeaking)) && (
           <div className={`prose max-w-none bg-gray-50 p-6 rounded-xl border border-gray-200 leading-relaxed whitespace-pre-line font-serif text-lg text-gray-800 
               ${isListening && !showTranscript ? 'hidden' : ''}`}>
             {isListening && showTranscript && <div className="text-red-500 font-bold mb-2 text-sm uppercase tracking-wide">Transcript Visible</div>}
             {data.text}
           </div>
        )}

        {/* --- INTERACTIVE MODE (READING & LISTENING) --- */}
        {isInteractive && (
            <div className="space-y-8">
              {data.questions.map((q, idx) => {
                const userAnswer = userAnswers[idx];
                const isCorrect = showAnswers && (userAnswer === q.answer);
                const isWrong = showAnswers && userAnswer && (userAnswer !== q.answer);
                
                return (
                  <div key={idx} className={`p-6 rounded-xl border transition-all ${
                    showAnswers 
                      ? (isCorrect ? 'bg-green-50 border-green-200' : isWrong ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200')
                      : 'bg-white border-gray-100 hover:shadow-md'
                  }`}>
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-4">
                        
                        {/* HEADER: Pregunta + Botó Report (VERMELL I VISIBLE) */}
                        <div className="flex justify-between items-start">
                            <span className="font-bold text-gray-400 text-lg">{q.question}</span>
                            
                            <div className="relative">
                                <button 
                                    onClick={() => setReporting(reporting === idx ? null : idx)}
                                    className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition border border-red-100"
                                    title="Report this question"
                                >
                                    <Flag className="w-3 h-3 fill-current" />
                                    Report
                                </button>
                                
                                {reporting === idx && (
                                    <div className="absolute right-0 top-8 bg-white shadow-xl border rounded-lg p-2 z-20 w-48 text-sm animate-in fade-in zoom-in-95">
                                        <p className="font-bold text-gray-700 mb-2 px-2 text-xs uppercase">What's wrong?</p>
                                        {["Wrong Answer", "Bad Grammar", "Confusing", "Other"].map(reason => (
                                            <button
                                                key={reason}
                                                onClick={() => handleReport(idx, reason)}
                                                className="block w-full text-left px-3 py-2 hover:bg-red-50 text-gray-600 rounded-md text-xs transition"
                                            >
                                                {reason}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {q.stem && <p className="font-medium text-gray-900 text-lg">{q.stem}</p>}
                        
                        {q.options && q.options.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options.map((opt, i) => {
                              const text = getOptionText(opt); 
                              const isSelected = userAnswer === text;
                              const isTheCorrectOption = text === q.answer;
                              
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
                                <div key={i} onClick={() => handleSelect(idx, text)} className={divClass}>
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
                              onChange={(e) => handleSelect(idx, e.target.value)}
                              placeholder="Type your answer..."
                              className={`w-full p-3 border rounded-lg outline-none ${
                                showAnswers
                                  ? (userAnswer?.trim().toLowerCase() === q.answer.trim().toLowerCase() 
                                    ? "bg-green-100 border-green-500 text-green-900 font-bold"
                                    : "bg-red-50 border-red-300 text-red-900")
                                  : "focus:ring-2 focus:ring-blue-500 bg-gray-50 border-gray-300"
                              }`}
                            />
                             {showAnswers && userAnswer?.trim().toLowerCase() !== q.answer.trim().toLowerCase() && (
                                <div className="mt-2 text-sm text-green-700 font-bold flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4" /> Correct: {q.answer}
                                </div>
                             )}
                          </div>
                        )}

                        {/* EXPLANATION & AUDIO JUMP (NOU) */}
                        {showAnswers && (
                          <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 text-sm animate-in fade-in">
                            <div className="flex gap-3 items-start">
                              <div className="mt-0.5 bg-blue-100 p-1.5 rounded-full text-blue-600 shrink-0">
                                <Eye className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <span className="block font-bold text-gray-900 mb-1">
                                  {isCorrect ? "Well done!" : `Correct Answer: ${q.answer}`}
                                </span>
                                <p className="leading-relaxed text-gray-600 mb-2">
                                  {q.explanation || "No specific explanation available."}
                                </p>
                                
                                {/* BOTÓ MÀGIC: JUMP TO AUDIO */}
                                {isListening && isWrong && q.timestamp && (
                                    <button 
                                        onClick={() => jumpToTimestamp(q.timestamp!)}
                                        className="mt-2 flex items-center gap-2 text-xs font-bold bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full hover:bg-orange-200 transition"
                                    >
                                        <PlayCircle className="w-4 h-4" />
                                        Listen at {q.timestamp}
                                    </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
        )}
        
        {/* --- CREATIVE MODE UI (WRITING & SPEAKING) --- */}
        {!isInteractive && (
           <div className="space-y-6">
               {!feedback ? (
                   <>
                       {isSpeaking && (
                         <div className="flex flex-col items-center justify-center py-4 gap-2">
                            <button 
                               onClick={toggleRecording}
                               disabled={isTranscribing}
                               className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl
                                 ${isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400'}`}
                            >
                               {isRecording ? <StopCircle className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-white" />}
                            </button>
                            {isRecording && <p className="text-red-500 font-bold animate-pulse text-sm">Recording... Click to finish</p>}
                            {isTranscribing && <p className="text-purple-600 font-bold flex items-center gap-2 text-sm"><Loader2 className="animate-spin w-4 h-4"/> Converting Audio to Text...</p>}
                         </div>
                       )}

                       <div className="relative">
                         <textarea 
                             value={inputText}
                             onChange={(e) => setInputText(e.target.value)}
                             placeholder={isSpeaking ? "Your speech will appear here automatically after recording..." : "Write your essay here... (Minimum 150 words)"}
                             className={`w-full h-80 p-6 border-2 rounded-xl outline-none text-lg font-serif leading-relaxed resize-none shadow-inner
                               ${isSpeaking ? 'border-purple-200 focus:border-purple-500 bg-purple-50/30' : 'border-emerald-200 focus:border-emerald-500'}`}
                         />
                       </div>

                       <div className="flex justify-end">
                            <button
                               onClick={handleSubmitCreative}
                               disabled={loadingGrade || inputText.length < 10 || isTranscribing || isRecording}
                               className="flex items-center gap-2 px-8 py-3 rounded-full font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 shadow-lg transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                               {loadingGrade ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5" />}
                               Submit for Feedback
                           </button>
                       </div>
                   </>
               ) : (
                   // RESULTATS (FEEDBACK)
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
                                       <div className="flex-1 bg-red-50 text-red-800 p-2 rounded line-through decoration-red-400 decoration-2">
                                           {corr.original}
                                       </div>
                                       <div className="flex-1 bg-green-50 text-green-800 p-2 rounded font-medium">
                                           {corr.correction}
                                       </div>
                                   </div>
                                   <p className="text-sm text-gray-500 italic">💡 {corr.explanation}</p>
                               </div>
                           ))}
                       </div>

                       {/* MODEL ANSWER */}
                       {feedback.model_answer && (
                         <div className="mt-8 p-6 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm">
                           <h3 className="text-lg font-bold text-emerald-800 mb-3 flex items-center gap-2">
                             <Sparkles className="w-5 h-5" />
                             Model Answer (C1 Level)
                           </h3>
                           <div className="prose text-emerald-900 whitespace-pre-wrap font-serif leading-relaxed">
                             {feedback.model_answer}
                           </div>
                         </div>
                       )}
                       
                       <div className="flex justify-center pt-8">
                           <button
                               onClick={onBack}
                               className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-gray-600 bg-white border hover:bg-gray-100 transition"
                           >
                               <RefreshCw className="w-4 h-4" />
                               Try Another Task
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
                className="flex items-center gap-2 px-8 py-3 rounded-full font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 shadow-lg transition-transform"
              >
                <Eye className="w-5 h-5" />
                Check Answers
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="text-xl font-bold text-gray-800">
                  Score: <span className={score! > (data.questions.length / 2) ? "text-green-600" : "text-orange-600"}>{score}</span> / {data.questions.length}
                </div>
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-gray-600 bg-white border hover:bg-gray-100 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Main Menu
                </button>
              </div>
            )}
          </div>
      )}
    </div>
  );
}