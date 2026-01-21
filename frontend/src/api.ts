const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// --- EXERCISES ---
// ARA DEMANA USER ID
export async function fetchExercise(type: string, userId: string, level: string = "C1") {
  const response = await fetch(`${API_URL}/get_exercise/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId, // <--- NOU
      level: level,
      exercise_type: type,
      completed_ids: []
    }),
  });
  if (response.status === 429) throw new Error("DAILY_LIMIT"); // Gestionem el límit
  if (!response.ok) throw new Error("Failed to fetch exercise");
  return response.json();
}

export async function generateFullExam(userId: string, level: string = "C1") {
  const response = await fetch(`${API_URL}/generate_full_exam/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
        user_id: userId, // <--- NOU
        level: level 
    }),
  });
  if (response.status === 429) throw new Error("DAILY_LIMIT");
  if (!response.ok) throw new Error("Failed to generate exam");
  return response.json();
}

// ... (La resta de funcions es mantenen iguals: preload, submit, report, audio...)
// Només assegura't que submitResult ja estava actualitzat del pas anterior
export async function submitResult(data: any) {
  const response = await fetch(`${API_URL}/submit_result/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

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

// ... (Copiar resta de funcions: getUserStats, generateReview, gradeWriting, etc. del teu fitxer actual)
// Poso aquí les imprescindibles per si de cas:

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

// Audio functions... (iguals que abans)
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

export async function downloadPDF(exerciseData: any) {
    // ... (igual que abans)
    const response = await fetch(`${API_URL}/generate_pdf/?level=${exerciseData.level || 'C1'}&exercise_type=${exerciseData.type}`);
    if (!response.ok) throw new Error("Error generating PDF");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${exerciseData.type}_C1.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
}

export async function preloadExercise(type: string, level: string = "C1") {
    // Aquest també hauria d'enviar UserID si volguéssim controlar quota en background, 
    // però com que fire-and-forget, ho deixem així o passem un fake ID.
    // De moment ho deixem com estava per no complicar.
    try {
        fetch(`${API_URL}/preload_exercise/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ level: level, exercise_type: type, completed_ids: [], user_id: "background" }),
        });
    } catch (err) { console.warn(err); }
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
  // Descarreguem 5 exercicis de cop (Reading Part 1)
  const exercises = [];
  for (let i = 0; i < 5; i++) {
    // Forcem type=reading1 per l'exemple, idealment seria variat
    const ex = await fetchExercise("reading_and_use_of_language1", userId); 
    exercises.push(ex);
  }
  localStorage.setItem("offline_pack", JSON.stringify(exercises));
  return true;
};

export const getOfflineExercise = () => {
  const pack = JSON.parse(localStorage.getItem("offline_pack") || "[]");
  if (pack.length > 0) {
    const ex = pack.pop(); // Treiem l'últim
    localStorage.setItem("offline_pack", JSON.stringify(pack)); // Guardem el pack restant
    return ex;
  }
  return null;
};

// Funció per cridar al Coach
export const getCoachAnalysis = async (userId: string) => {
  const res = await fetch(`${API_URL}/analyze_weaknesses/${userId}`);
  if (!res.ok) throw new Error("Coach failed");
  return res.json();
};