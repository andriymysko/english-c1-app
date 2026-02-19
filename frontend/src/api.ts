// ⚠️ IMPORTANT: Ajusta la ruta "../firebase" si el fitxer està a la mateixa carpeta ("./firebase")
import { auth } from "./firebase"; 

const API_URL = import.meta.env.VITE_API_URL || "https://english-c1-api.onrender.com";

// --- HELPERS ---
const getHeaders = async () => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

// --- LLISTA DE TEMES C1 PER FORÇAR VARIETAT ---
const C1_TOPICS = [
  "Globalization & Cultural Identity",
  "The Impact of Artificial Intelligence",
  "Work-Life Balance & Remote Work",
  "Environmental Responsibility & Sustainability",
  "The Role of Arts in Society",
  "Education Systems & Future Skills",
  "Mass Tourism & Local Communities",
  "Privacy in the Digital Age",
  "Mental Health & Modern Lifestyle",
  "Consumerism & Ethics",
  "The Evolution of Communication",
  "Urban Planning & City Living"
];

// --- EXERCISES ---
export async function fetchExercise(type: string, userId: string, level: string = "C1") {
  
  console.log(`[API] Fetching ${type} for user: ${userId} at level ${level}`);

  // ---------------------------------------------------------
  // 🗣️ SPEAKING PART 1: IA GENERATION + RANDOM TOPIC INJECTION
  // ---------------------------------------------------------
  if (type === 'speaking1') {
    const randomTopic = C1_TOPICS[Math.floor(Math.random() * C1_TOPICS.length)];
    
    try {
        // ✅ FIX: Fem servir POST cap a /generate en lloc de GET
        const response = await fetch(`${API_URL}/generate`, {
            method: "POST",
            headers: await getHeaders(),
            body: JSON.stringify({ type: "speaking1", level: level, topic: randomTopic })
        });

        if (!response.ok) throw new Error("Failed to generate speaking task");
        
        const data = await response.json();
        
        return {
            ...data,
            title: `Speaking Part 1: ${randomTopic}`,
            instruction: "Answer the questions briefly but fully (20-30 seconds per answer). Avoid simple 'Yes/No' responses."
        };

    } catch (error) {
        console.error("Error generating speaking:", error);
        // Fallback d'emergència
        return {
            id: 'speaking1_fallback',
            type: 'speaking',
            title: "Speaking Part 1: General Interview",
            instruction: "Answer the questions briefly but fully.",
            text: "1. What do you find most challenging about learning English?\n2. How do you think technology has changed the way we communicate?\n3. Would you prefer to live in a city or the countryside? Why?"
        };
    }
  }

  // ---------------------------------------------------------
  // ⚡ SIMULACIÓ WRITING PART 1 (ESSAY)
  // ---------------------------------------------------------
  if (type === 'writing1') {
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      id: 'writing1',
      type: 'essay',
      title: "Part 1: The Essay",
      instruction: "You must answer this question. Write your answer in 220-260 words in an appropriate style.",
      content: {
        input_text: `Technological advancement has unprecedentedly transformed the way society functions, bringing both remarkable conveniences and significant challenges. While it bridges geographical gaps, it often exacerbates social isolation. Furthermore, as data becomes the new currency, the line between security and surveillance blurs. Society navigates these shifts, questioning whether the cost of progress is too high for the individual.`,
        question: "Write an essay discussing TWO of the areas in your notes. You should explain which area has been most affected by technological advancement, giving reasons in support of your answer.",
        notes: ["Communication", "Privacy", "Social Equality"],
        opinions: [
          "We are more connected than ever, yet we feel more lonely.",
          "It feels like someone is always watching what we do online.",
          "Only the rich can afford the newest devices, leaving others behind."
        ]
      }
    };
  }

  // ---------------------------------------------------------
  // ⚡ SIMULACIÓ WRITING PART 2 (CHOICE)
  // ---------------------------------------------------------
  if (type === 'writing2') {
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      id: 'writing2',
      type: 'writing_choice',
      title: "Part 2: Choose Your Task",
      instruction: "Choose one of the tasks below. Write your answer in 220-260 words in an appropriate style.",
      options: [
        {
            id: 'proposal_health',
            type: 'Proposal',
            title: "Task 1: Proposal",
            text: "You work for an international company that wants to improve the health and wellbeing of its staff. Your manager has asked you to write a proposal outlining current issues regarding employee health, suggesting specific improvements to the office environment or routine, and explaining how these changes would benefit the company’s productivity.",
            tips: "Remember to use headings and formal language."
        },
        {
            id: 'review_app',
            type: 'Review',
            title: "Task 2: Review",
            text: "You see this announcement on an English-language website: 'App of the Year? We are looking for reviews of mobile applications that have helped you learn a new skill or improve your daily routine. Describe the app and its features, explain why it is effective, and say whether you would recommend it to people of all ages.'",
            tips: "Use a catchy title and engage the reader."
        },
        {
            id: 'report_internship',
            type: 'Report',
            title: "Task 3: Report",
            text: "You have just completed a six-month internship at a large marketing firm. The Human Resources director has asked you to write a report on your experience. You should describe the training you received, explain which skills you developed most, and suggest how the internship program could be improved for future students.",
            tips: "Use passive voice and neutral tone. Headings are mandatory."
        }
      ]
    };
  }

  // ---------------------------------------------------------
  // 🚀 EXERCICIS ESTÀNDARD (LISTENING, READING) - NOU BACKEND
  // ---------------------------------------------------------
  try {
    // ✅ FIX: Tornem al POST de /get_exercise/ enviant dades pel body (Pool system)
    const response = await fetch(`${API_URL}/get_exercise/`, {
        method: "POST",
        headers: await getHeaders(),
        body: JSON.stringify({
            user_id: userId,
            exercise_type: type,
            level: level,
            completed_ids: [] // Preparat per enviar l'historial més endavant
        })
    });

    if (response.status === 429) throw new Error("DAILY_LIMIT");
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("API Error fetching exercise:", error);
    throw error;
  }
}

// ---------------------------------------------------------
// FUNCIONS ADICIONALS (PRELOAD, STATS, ETC.)
// ---------------------------------------------------------

export async function preloadExercise(type: string, level: string = "C1") {
  try {
    // ✅ FIX: Apunta al nou endpoint de background al router.py
    fetch(`${API_URL}/preload_exercise/`, {
        method: "POST",
        headers: await getHeaders(),
        body: JSON.stringify({
            user_id: "preload_system",
            exercise_type: type,
            level: level,
            completed_ids: []
        })
    }).then(() => console.log("🔄 Preload triggered for:", type)).catch(() => {});
  } catch (err) { 
      console.warn("Preload warning:", err); 
  }
}

export async function generateFullExam(userId: string, level: string = "C1") {
  const response = await fetch(`${API_URL}/generate_full_exam/`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ user_id: userId, level: level }),
  });
  if (response.status === 429) throw new Error("DAILY_LIMIT");
  if (!response.ok) throw new Error("Failed to generate exam");
  return response.json();
}

export async function submitResult(data: any) {
  try {
    const response = await fetch(`${API_URL}/submit_result`, {
        method: "POST",
        headers: await getHeaders(),
        body: JSON.stringify(data)
    });
    return await response.json();
  } catch(e) { console.error("Error submitting result:", e); }
}

export const getUserStats = async (userId: string) => {
  try {
    const response = await fetch(`${API_URL}/user_stats/${userId}`, {
      headers: await getHeaders(),
    });
    
    if (!response.ok) {
        console.warn("Stats not found, returning default");
        return { xp: 0, streak: 0, completed: 0 };
    }
    return await response.json();
  } catch (error) {
    console.error("Error getting stats:", error);
    return { xp: 0, streak: 0, completed: 0 }; 
  }
};

export async function generateReview(userId: string) {
  const response = await fetch(`${API_URL}/generate_review/${userId}`, { 
      method: "POST",
      headers: await getHeaders() 
  });
  if (response.status === 429) throw new Error("DAILY_LIMIT");
  if (response.status === 404) throw new Error("NO_MISTAKES");
  if (!response.ok) throw new Error("Failed");
  return response.json();
}

export async function getFlashcards(userId: string) {
  const response = await fetch(`${API_URL}/vocabulary_flashcards/${userId}`, {
      headers: await getHeaders()
  });
  if (!response.ok) throw new Error("Failed");
  return response.json();
}

export async function updateFlashcardStatus(userId: string, cardId: string, success: boolean) {
  await fetch(`${API_URL}/update_flashcard/${userId}`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ card_id: cardId, success: success }),
  });
}

export async function transcribeAudio(audioBlob: Blob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
  
  // ✅ FIX: El backend es diu /transcribe_audio/
  const response = await fetch(`${API_URL}/transcribe_audio/`, { 
      method: "POST", 
      body: formData 
  });
  if (!response.ok) throw new Error("Failed");
  return response.json();
}

export async function fetchAudio(text: string) {
  try {
    // ✅ FIX: El backend es diu /generate_audio/ i li passem json POST
    const response = await fetch(`${API_URL}/generate_audio/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) throw new Error("TTS Failed");

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}

export async function gradeWriting(userId: string, task: string, text: string) {
    // ✅ FIX: Sincronitzat amb els endpoints del teu router.py
    const response = await fetch(`${API_URL}/grade_writing/`, {
        method: "POST",
        headers: await getHeaders(),
        body: JSON.stringify({ user_id: userId, task_prompt: task, user_text: text, level: "C1" }),
    });
    if (!response.ok) throw new Error("Failed");
    return response.json();
}

export async function gradeSpeaking(userId: string, task: string, text: string) {
    // ✅ FIX: Sincronitzat amb els endpoints del teu router.py
    const response = await fetch(`${API_URL}/grade_speaking/`, {
        method: "POST",
        headers: await getHeaders(),
        body: JSON.stringify({ user_id: userId, task_prompt: task, user_text: text, level: "C1" }), // Utilitza user_text com el WritingSubmission model requereix
    });
    if (!response.ok) throw new Error("Failed");
    return response.json();
}

export const downloadOfflinePack = async (userId: string, level: string = "C1") => {
  const exercises = [];
  for (let i = 0; i < 5; i++) {
    try {
        const ex = await fetchExercise("reading_and_use_of_language1", userId, level); 
        exercises.push(ex);
    } catch(e) { console.warn("Skipped offline exercise due to error/limit"); }
  }
  localStorage.setItem("offline_pack", JSON.stringify(exercises));
  return true;
};

export const getOfflineExercise = () => {
  const pack = JSON.parse(localStorage.getItem("offline_pack") || "[]");
  if (pack.length > 0) {
    const ex = pack.pop();
    localStorage.setItem("offline_pack", JSON.stringify(pack));
    return ex;
  }
  return null;
};

export const getCoachAnalysis = async (userId: string) => {
  const res = await fetch(`${API_URL}/analyze_weaknesses/${userId}`, {
      headers: await getHeaders()
  });
  if (!res.ok) throw new Error("Coach failed");
  return res.json();
};

export async function reportIssue(userId: string, exerciseData: any, questionIndex: number, reason: string) {
  await fetch(`${API_URL}/report_issue/`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({
      user_id: userId,
      exercise_id: exerciseData.id || null,
      question_index: questionIndex,
      reason: reason,
      exercise_data: exerciseData
    }),
  });
}

// Deprecated or alias function
export const generateExercise = async (type: string, level: string = "C1") => {
  return fetchExercise(type, "default", level);
};