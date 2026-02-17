import { auth } from "./firebase"; // Ensure this path is correct for your project structure

// Use your Render URL as the default production URL
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

// --- C1 TOPICS LIST ---
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
  
  // ---------------------------------------------------------
  // 🗣️ SPEAKING PART 1: IA GENERATION + RANDOM TOPIC INJECTION
  // ---------------------------------------------------------
  if (type === 'speaking1') {
    const randomTopic = C1_TOPICS[Math.floor(Math.random() * C1_TOPICS.length)];
    
    // Using the generic endpoint, assuming the backend handles topic generation internally 
    // or you can add ?topic=... if your backend supports it.
    // For now, we rely on the standard GET endpoint.
    try {
        const response = await fetch(`${API_URL}/exercise/speaking1?level=${level}`, {
            method: "GET",
            headers: await getHeaders(),
        });

        if (!response.ok) throw new Error("Failed to generate speaking task");
        
        const data = await response.json();
        
        // We enrich the data locally with the topic title for the UI
        return {
            ...data,
            title: `Speaking Part 1: ${randomTopic}`,
            instruction: "Answer the questions briefly but fully (20-30 seconds per answer). Avoid simple 'Yes/No' responses."
        };

    } catch (error) {
        console.error("Error generating speaking:", error);
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
  // ⚡ SIMULATED WRITING PART 1 (ESSAY)
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
  // ⚡ SIMULATED WRITING PART 2 (CHOICE)
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
  // 🚀 STANDARD EXERCISES (CONNECTS TO NEW BACKEND)
  // ---------------------------------------------------------
  try {
    // ⚠️ CRITICAL FIX: Changed from POST /get_exercise/ to GET /exercise/{type}
    const response = await fetch(`${API_URL}/exercise/${type}?level=${level}`, {
        method: "GET",
        headers: await getHeaders(),
    });

    if (response.status === 429) throw new Error("DAILY_LIMIT");
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch exercise: ${response.status} ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("API Error fetching exercise:", error);
    throw error;
  }
}

// ---------------------------------------------------------
// OTHER API FUNCTIONS
// ---------------------------------------------------------

// Start background generation for the next exercise
export async function preloadExercise(type: string, level: string = "C1") {
  try {
    // This triggers the GET request which, in your new backend logic, 
    // checks the DB and triggers a background generation task.
    // We don't need to wait for the result or use the data here.
    fetch(`${API_URL}/exercise/${type}?level=${level}`, {
        method: "GET",
        headers: await getHeaders(),
    }).catch(e => console.warn("Preload background fetch warning:", e));
  } catch (err) { 
      console.warn("Preload trigger failed:", err); 
  }
}

export async function generateFullExam(userId: string, level: string = "C1") {
  // Assuming you have or will implement this endpoint
  const response = await fetch(`${API_URL}/generate_full_exam`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ user_id: userId, level: level }),
  });
  if (response.status === 429) throw new Error("DAILY_LIMIT");
  if (!response.ok) throw new Error("Failed to generate exam");
  return response.json();
}

export async function submitResult(data: any) {
  // Ensure the endpoint matches your backend (no trailing slash is safer usually)
  const response = await fetch(`${API_URL}/submit_result`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function getUserStats(userId: string) {
  const response = await fetch(`${API_URL}/user_stats/${userId}`, {
      headers: await getHeaders()
  });
  if (!response.ok) throw new Error("Failed to load stats");
  return response.json();
}

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
  
  // Note: No headers here, FormData handles Content-Type boundary automatically
  const response = await fetch(`${API_URL}/transcribe`, { 
      method: "POST", 
      body: formData 
  });
  if (!response.ok) throw new Error("Failed");
  return response.json();
}

export async function fetchAudio(text: string) {
  // Using /tts endpoint if available, otherwise fallback to existing
  const response = await fetch(`${API_URL}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error("Failed");
  // Assuming backend returns { "audio_url": "..." } or directly the blob
  // Adjust based on your backend response. If it returns JSON with URL:
  const data = await response.json();
  return data.audio_url; 
  
  // If it returns raw blob:
  // const blob = await response.blob();
  // return URL.createObjectURL(blob);
}

export async function gradeWriting(userId: string, task: string, text: string) {
    const response = await fetch(`${API_URL}/grade/writing`, {
        method: "POST",
        headers: await getHeaders(),
        body: JSON.stringify({ user_id: userId, task_prompt: task, user_text: text, level: "C1" }),
    });
    if (!response.ok) throw new Error("Failed");
    return response.json();
}

export async function gradeSpeaking(userId: string, task: string, text: string) {
    // Assuming endpoint /grade/speaking exists
    const response = await fetch(`${API_URL}/grade/speaking`, {
        method: "POST",
        headers: await getHeaders(),
        body: JSON.stringify({ user_id: userId, task_prompt: task, transcript_text: text, level: "C1" }),
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
  await fetch(`${API_URL}/report_issue`, {
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

// Deprecated or alias function - mapping to fetchExercise for compatibility
export const generateExercise = async (type: string, level: string = "C1") => {
  return fetchExercise(type, "default", level);
};