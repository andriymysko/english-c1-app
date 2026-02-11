const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// --- EXERCISES ---
export async function fetchExercise(type: string, userId: string, level: string = "C1") {
  
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
        notes: [
          "Communication",
          "Privacy",
          "Social Equality"
        ],
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

  // PER A LA RESTA D'EXERCICIS
  const response = await fetch(`${API_URL}/get_exercise/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      level: level,
      exercise_type: type,
      completed_ids: []
    }),
  });

  if (response.status === 429) throw new Error("DAILY_LIMIT");
  if (!response.ok) throw new Error("Failed to fetch exercise");
  return response.json();
}

export async function generateFullExam(userId: string, level: string = "C1") {
  const response = await fetch(`${API_URL}/generate_full_exam/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, level: level }),
  });
  if (response.status === 429) throw new Error("DAILY_LIMIT");
  if (!response.ok) throw new Error("Failed to generate exam");
  return response.json();
}

export async function submitResult(data: any) {
  const response = await fetch(`${API_URL}/submit_result/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function getUserStats(userId: string) {
  const response = await fetch(`${API_URL}/user_stats/${userId}`);
  if (!response.ok) throw new Error("Failed to load stats");
  return response.json();
}

export async function generateReview(userId: string) {
  const response = await fetch(`${API_URL}/generate_review/${userId}`, { method: "POST" });
  if (response.status === 429) throw new Error("DAILY_LIMIT");
  if (response.status === 404) throw new Error("NO_MISTAKES");
  if (!response.ok) throw new Error("Failed");
  return response.json();
}

export async function getFlashcards(userId: string) {
  const response = await fetch(`${API_URL}/vocabulary_flashcards/${userId}`);
  if (!response.ok) throw new Error("Failed");
  return response.json();
}

export async function updateFlashcardStatus(userId: string, cardId: string, success: boolean) {
  await fetch(`${API_URL}/update_flashcard/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card_id: cardId, success: success }),
  });
}

export async function transcribeAudio(audioBlob: Blob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
  const response = await fetch(`${API_URL}/transcribe_audio/`, { method: "POST", body: formData });
  if (!response.ok) throw new Error("Failed");
  return response.json();
}

export async function fetchAudio(text: string) {
  const response = await fetch(`${API_URL}/generate_audio/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error("Failed");
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function gradeWriting(userId: string, task: string, text: string) {
    const response = await fetch(`${API_URL}/grade_writing/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, task_text: task, user_text: text, level: "C1" }),
    });
    if (!response.ok) throw new Error("Failed");
    return response.json();
}

export async function gradeSpeaking(userId: string, task: string, text: string) {
    const response = await fetch(`${API_URL}/grade_speaking/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, task_text: task, user_text: text, level: "C1" }),
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
  const res = await fetch(`${API_URL}/analyze_weaknesses/${userId}`);
  if (!res.ok) throw new Error("Coach failed");
  return res.json();
};

export async function reportIssue(userId: string, exerciseData: any, questionIndex: number, reason: string) {
  await fetch(`${API_URL}/report_issue/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      exercise_id: exerciseData.id || null,
      question_index: questionIndex,
      reason: reason,
      exercise_data: exerciseData
    }),
  });
}

// 👇 EXPORTS QUE FALTAVEN I SÓN NECESSARIS 👇

export const generateExercise = async (type: string, level: string = "C1") => {
  try {
    const response = await fetch(`${API_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, level }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to generate exercise");
    }

    return await response.json();
  } catch (error) {
    console.error("API Error generating exercise:", error);
    throw error;
  }
};

export async function preloadExercise(type: string, level: string = "C1") {
  try {
    fetch(`${API_URL}/preload_exercise/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            level: level, 
            exercise_type: type, 
            completed_ids: [], 
            user_id: "background" 
        }),
    });
  } catch (err) { 
      console.warn("Preload warning:", err); 
  }
}