from openai import OpenAI
import os
import json
from dotenv import load_dotenv
from app.services.image import ImageService

# Carreguem variables d'entorn
load_dotenv()

class ExerciseFactory:
    @staticmethod
    def create_exercise(exercise_type: str, level: str = "C1"):
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        type_instructions = ""
        
        # ==========================================
        #       READING & USE OF ENGLISH
        # ==========================================
        
        if exercise_type == "reading_and_use_of_language1":
            type_instructions = """
            - Create a "Part 1: Multiple Choice Cloze" exercise.
            - Write a text (at least 300 words) with 8 gaps marked [1] to [8].
            - For each gap, provide 4 options (A, B, C, D).
            - Focus on collocations, idioms, and vocabulary nuances suitable for C1.
            """

        elif exercise_type == "reading_and_use_of_language2":
             type_instructions = """
            - Create a "Part 2: Open Cloze" exercise.
            - Write a coherent text (approx 300 words) with 8 gaps marked [1] to [8].
            - The student must fill each gap with ONE grammar word (preposition, article, auxiliary, relative pronoun).
            - Do NOT provide options. The 'options' list in JSON must be empty [].
            """

        elif exercise_type == "reading_and_use_of_language3":
             type_instructions = """
            - Create a "Part 3: Word Formation" exercise.
            - Write a text (approx 300 words) with 8 gaps numbered 17-24.
            - For each gap, provide a STEM word in CAPITALS (e.g., 'HAPPY') that needs to be transformed.
            - Store the STEM word in a field called 'keyword' inside the question object.
            """

        elif exercise_type == "reading_and_use_of_language4":
             type_instructions = """
            - Create a "Part 4: Key Word Transformation" exercise.
            - Create 6 items numbered 25-30.
            - For each item, provide:
              1. 'original_sentence': A complete sentence.
              2. 'second_sentence': A sentence with a GAP.
              3. 'keyword': A specific word in CAPITALS that MUST be used.
            - The gap must be filled with 3-6 words.
            - CRITICAL JSON FORMAT: Inside 'questions', each object must have 'original_sentence', 'second_sentence', 'keyword', and 'answer'.
            """

        elif exercise_type == "reading_and_use_of_language5":
             type_instructions = """
            - Create a "Part 5: Multiple Choice Reading" exercise.
            - Write a long, complex text (approx 650 words) titled "Stimulus".
            - Create 6 multiple-choice questions numbered 31-36 based on the text.
            - Each question must have a 'stem' (the question) and 4 options (A, B, C, D).
            """

        elif exercise_type == "reading_and_use_of_language6":
             type_instructions = """
            - Create a "Part 6: Cross-Text Multiple Matching" exercise.
            - Write 4 short texts (180 words each) labeled A, B, C, D on the SAME topic but with different opinions.
            - Combine them into the 'text' field.
            - Create 4 questions numbered 37-40 asking "Which writer...".
            - The options for every question are always [A, B, C, D].
            """

        elif exercise_type == "reading_and_use_of_language7":
             type_instructions = """
            - Create a "Part 7: Gapped Text" exercise.
            - Write a text (700 words) where 6 paragraphs have been removed.
            - Mark gaps in the text as [41], [42], [43], [44], [45], [46].
            - Create 7 paragraphs labeled A-G (6 correct + 1 distractor).
            - Append the paragraphs at the end of the 'text' field (labeled "MISSING PARAGRAPHS").
            - Questions 41-46 must have options A-G.
            """

        elif exercise_type == "reading_and_use_of_language8":
             type_instructions = """
            - Create a "Part 8: Multiple Matching" exercise.
            - Write a text divided into 4 sections (A, B, C, D). Total length 700 words.
            - Create 10 questions numbered 47-56 (e.g., "Which section mentions...").
            - The answer is the letter of the section (A, B, C, D).
            """

        # ==========================================
        #               LISTENING (UPDATED)
        # ==========================================
        # NOTA: Incrementem longitud i forcem el timestamp
        
        elif exercise_type == "listening1":
             type_instructions = """
            - Create a "Listening Part 1" exercise.
            - Structure: 3 UNRELATED extracts (approx 1.5 minutes audio each). Total text length: ~500 words.
            - TEXT: Write Extract 1 (Dialogue), Extract 2 (Monologue/Dialogue), Extract 3 (Dialogue).
            - CRITICAL AUDIO MARKERS: Start with "Extract One". Insert "Extract Two" before the second part, and "Extract Three" before the third.
            - Create 2 Multiple Choice questions (A, B, C) for EACH extract (Total 6 questions, numbered 1-6).
            - TIMESTAMPS: For each question, estimate the time "MM:SS" where the answer appears based on a 140wpm reading speed.
            """

        elif exercise_type == "listening2":
             type_instructions = """
            - Create a "Listening Part 2: Sentence Completion" exercise.
            - Write a LONG MONOLOGUE (approx 600-700 words, ~4 mins) about a specific topic (e.g., archaeology, birds).
            - Create 8 sentences (numbered 7-14) summarizing the talk, each with a GAP.
            - The answer must be a specific word or short phrase heard in the text.
            - Do NOT provide options.
            - TIMESTAMPS: For each question, provide "timestamp": "MM:SS" estimating when the answer is spoken (assuming 140wpm).
            """

        elif exercise_type == "listening3":
             type_instructions = """
            - Create a "Listening Part 3: Multiple Choice" exercise.
            - Write a LONG INTERVIEW (approx 700 words, ~4-5 mins) with an interviewer and 2 guests.
            - Create 6 multiple-choice questions (numbered 15-20) with 4 options (A, B, C, D).
            - Focus on identifying attitudes, opinions, and feelings.
            - TIMESTAMPS: For each question, provide "timestamp": "MM:SS" estimating when the answer is spoken (assuming 140wpm).
            """

        elif exercise_type == "listening4":
             type_instructions = """
            - Create a "Listening Part 4: Multiple Matching" exercise.
            - Write 5 SHORT monologues (Speaker 1 to 5) on a common theme (e.g., "New Job"). Total length ~600 words.
            - Create 2 TASKS. 
              - Task 1 (Questions 21-25): "Why they did it?" (List A-H).
              - Task 2 (Questions 26-30): "How they feel?" (List A-H).
            - Include the two lists of options (A-H) clearly in the 'text' field before the transcript.
            - TIMESTAMPS: For each question, provide "timestamp": "MM:SS" estimating when the answer is spoken (assuming 140wpm).
            """

        # ==========================================
        #               WRITING
        # ==========================================

        elif exercise_type == "writing1":
             type_instructions = """
            - Create a "Writing Part 1: Essay" task.
            - Context: "Your class has attended a panel discussion about [Topic]..."
            - Essay Question: "Which method is more effective?"
            - Notes: Provide 3 points (Cost, Effectiveness, ... and 'your own idea').
            - The 'text' field should contain the Context + Essay Question + Notes.
            - Do NOT write the essay. The user must write it.
            """

        elif exercise_type == "writing2":
             type_instructions = """
            - Create a "Writing Part 2" task with 3 options.
            - Task 2: A Review (e.g., book, film).
            - Task 3: A Proposal (e.g., improve local facilities).
            - Task 4: A Report (e.g., work experience).
            - Put all three tasks clearly in the 'text' field so the user can choose one.
            """

        # ==========================================
        #               SPEAKING
        # ==========================================

        elif exercise_type == "speaking1":
             type_instructions = """
            - Create a "Speaking Part 1: Interview" script.
            - Phase 1: Introduction questions (Name, origin).
            - Phase 2: Topic A (e.g., Travel) with 3 questions.
            - Phase 3: Topic B (e.g., Work) with 3 questions.
            - Put the script in the 'text' field.
            """

        elif exercise_type == "speaking2":
             type_instructions = """
            - Create a "Speaking Part 2: Long Turn" task.
            - Topic: [Choose a topic like 'Celebrations', 'Work', 'Stress'].
            - Candidate A Task: Compare two pictures.
            - Candidate B Task: Answer a short question.
            - CRITICAL: You must describe 3 distinct pictures related to the topic.
            - JSON FORMAT UPDATE: Include a field "image_prompts" which is a list of 3 strings describing the pictures visually.
            """

        elif exercise_type == "speaking3":
             type_instructions = """
            - Create a "Speaking Parts 3 & 4" script.
            - Part 3 (Collaborative): A central question (e.g., "How does X affect society?") and 5 prompts (Money, Time, etc.).
            - Part 4 (Discussion): 5 broader questions related to the topic.
            - Put all instructions and prompts in the 'text' field.
            """

        else:
            type_instructions = f"- Create a '{exercise_type}' exercise appropriate for Cambridge {level}."

        # 2. El Prompt Mestre (ACTUALITZAT AMB TIMESTAMP)
        prompt = f"""
        You are an expert Cambridge English exam creator.
        Create a {level} level exercise: {exercise_type}.
        
        INSTRUCTIONS:
        {type_instructions}
        
        CRITICAL OUTPUT RULES:
        1. Return ONLY valid JSON.
        2. Include an 'explanation' field for every question.
        3. LISTENING ONLY: You MUST include a 'timestamp' field (format "MM:SS") for every question, estimating where the answer appears in the text assuming a reading speed of 140 words per minute.
        
        JSON Structure (Generic):
        {{
            "type": "{exercise_type}",
            "title": "Generated Task",
            "instructions": "Standard instructions...",
            "text": "Full text content / Transcript / Prompt details...",
            "image_prompts": ["Prompt 1", "Prompt 2", "Prompt 3"],  <-- Only for speaking2
            "questions": [
                {{
                    "question": "1",
                    "stem": "Question text",
                    "timestamp": "01:15",  <-- CRITICAL FOR LISTENING (Format MM:SS)
                    "original_sentence": "Only for Part 4",
                    "second_sentence": "Only for Part 4",
                    "keyword": "Only for Part 3/4",
                    "options": [ {{"text": "A"}}, {{"text": "B"}} ] (Empty for Part 2/3/4),
                    "answer": "Correct Answer",
                    "explanation": "Why this is correct."
                }}
            ]
        }}
        """

        # 3. Cridem a l'IA
        print(f"🏭 Factory: Generant {exercise_type} amb gpt-4o-mini...")
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        
        try:
            data = json.loads(content)
            
            # --- IMATGES (Speaking 2) ---
            if exercise_type == "speaking2" and "image_prompts" in data:
                print("🖼️ Detectats prompts d'imatge. Generant amb DALL·E 3...")
                data["image_urls"] = []
                try:
                    for prompt_text in data["image_prompts"]:
                        url = ImageService.generate_image(prompt_text)
                        data["image_urls"].append(url)
                except Exception as e:
                    print(f"⚠️ Error generant imatges: {e}")
            # ---------------------------

            class GenericExercise:
                def __init__(self, data):
                    self.data = data
                def model_dump(self):
                    return self.data
            
            return GenericExercise(data)

        except json.JSONDecodeError:
            raise ValueError("Failed to decode AI response")