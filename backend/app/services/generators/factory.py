from openai import OpenAI
import os
import json
from dotenv import load_dotenv
from app.services.image import ImageService

# Carreguem variables d'entorn
load_dotenv()

# --- CONFIGURACIÓ DE DIFICULTAT "HARDCORE" & CONSISTÈNCIA ---
SYSTEM_PROMPT_HARDCORE = """
You are a RUTHLESS Cambridge CAE (C1 Advanced) examiner.
Your goal is to create exercises that push students to their absolute limit. "Good enough" is not acceptable.

CRITICAL RULES FOR HIGH QUALITY & CONSISTENCY:
1. **Strict Formatting**: Follow the visual formatting rules (e.g., "[1] ________") exactly. Do not deviate.
2. **Precise Word Counts**: Adhere strictly to the word count limits provided in the instructions.
3. **No Easy Wins**: Avoid common B2 vocabulary. Use advanced C1/C2 lexicon (e.g., "ubiquitous", "mitigate", "scrutinize").
4. **Evil Distractors**: In multiple choice, ALL options must be plausible synonyms. The answer must depend on precise grammar or idioms.
5. **Academic Tone**: Texts must be dense, formal, and informative (topics: sociology, science, economics).
6. **Grammatical Logic**: Ensure the answers fit perfectly syntactically (Noun vs Adjective vs Adverb). Do not sacrifice grammar for complexity.
"""

class ExerciseFactory:
    @staticmethod
    def create_exercise(exercise_type: str, level: str = "C1"):
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Mantenim gpt-4o per a màxima intel·ligència amb les instruccions complexes
        MODEL_ID = "gpt-4o" 
        
        type_instructions = ""
        
        # ==========================================
        #       READING & USE OF ENGLISH
        # ==========================================
        
        if exercise_type == "reading_and_use_of_language1":
            type_instructions = """
            - Create a "Part 1: Multiple Choice Cloze" exercise.
            - TEXT LENGTH: Strictly between 180 and 220 words.
            - VISUAL FORMAT: You MUST mark gaps precisely as "[N] ________" (number in brackets, one space, 8 underscores).
            - Write a sophisticated text with 8 gaps marked [1] to [8].
            - For each gap, provide 4 options (A, B, C, D).
            - DIFFICULTY: Options must be synonyms. Correct answer depends on collocations or dependent prepositions.
            """

        elif exercise_type == "reading_and_use_of_language2":
             type_instructions = """
            - Create a "Part 2: Open Cloze" exercise.
            - TEXT LENGTH: Strictly between 180 and 220 words.
            - VISUAL FORMAT: You MUST mark gaps precisely as "[N] ________".
            - Write a coherent text with 8 gaps marked [9] to [16].
            - The student must fill each gap with ONE grammar word.
            - IMPORTANT JSON RULE: The 'options' field MUST be an empty list []. Do NOT provide choices.
            """

        elif exercise_type == "reading_and_use_of_language3":
             type_instructions = """
            - Create a "Part 3: Word Formation" exercise.
            - TEXT LENGTH: Strictly between 180 and 200 words.
            - VISUAL FORMAT: You MUST mark gaps precisely as "[N] ________" (number in brackets, one space, 8 underscores).
            - At the END of the line containing the gap, put the STEM word in parentheses (e.g., "...very [17] ________ (COMFORT)").
            - Write a text with 8 gaps numbered 17-24.
            - For each gap, provide a STEM word in CAPITALS in the 'keyword' field.
            - CRITICAL GRAMMAR CHECK: Ensure the answer fits the sentence grammatically.
            - DIFFICULTY: Force complex transformations.
            - IMPORTANT JSON RULE 1: The 'options' field MUST be an empty list [].
            - IMPORTANT JSON RULE 2: In the 'questions' array, the 'stem' field MUST be the STEM word in CAPITALS (e.g., "PROLIFERATE"), NOT the answer.
            """

        elif exercise_type == "reading_and_use_of_language4":
             type_instructions = """
            - Create a "Part 4: Key Word Transformation" exercise.
            - Create 6 items numbered 25-30.
            - STRUCTURE:
              1. 'original_sentence': A complex C1 sentence.
              2. 'second_sentence': A sentence with a GAP marked as "________" (underscore line).
              3. 'keyword': A word in CAPITALS.
            - CONSTRAINT: The gap must be filled with 3 to 6 words (contractions count as 2).
            - TARGET GRAMMAR: Inversion, Mixed Conditionals, Passive Reporting structures.
            """

        elif exercise_type == "reading_and_use_of_language5":
             type_instructions = """
            - Create a "Part 5: Multiple Choice Reading" exercise.
            - TEXT LENGTH: Strictly between 600 and 700 words.
            - CONTENT: A dense article from a fictional academic journal or novel.
            - Create 6 multiple-choice questions numbered 31-36.
            - Each question must have a 'stem' and 4 options (A, B, C, D).
            - DIFFICULTY: Questions must focus on implication, main idea, and detailed meaning, not just keyword matching.
            """

        elif exercise_type == "reading_and_use_of_language6":
             type_instructions = """
            - Create a "Part 6: Cross-Text Multiple Matching" exercise.
            - STRUCTURE: Write 4 distinct short texts labeled "Text A", "Text B", "Text C", "Text D".
            - TEXT LENGTH: Each text must be approx 150 words. Total ~600 words.
            - TOPIC: All texts discuss the SAME specific controversy (e.g., "AI in Art", "Urban Rewilding") but with different viewpoints.
            - Create 4 questions numbered 37-40 asking "Which writer...".
            """

        elif exercise_type == "reading_and_use_of_language7":
             type_instructions = """
            - Create a "Part 7: Gapped Text" exercise.
            - TEXT LENGTH: Strictly between 600 and 650 words.
            - STRUCTURE: Write a main text where 6 paragraphs have been removed.
            - VISUAL FORMAT: Mark removal points clearly as "[41]", "[42]", etc. on their own lines.
            - MISSING PARAGRAPHS: Provide 7 paragraphs labeled A-G (6 correct + 1 distractor).
            - CONTENT: Ensure strong cohesive links (reference words like 'this', 'however', 'consequently') between paragraphs.
            """

        elif exercise_type == "reading_and_use_of_language8":
             type_instructions = """
            - Create a "Part 8: Multiple Matching" exercise.
            - TEXT LENGTH: Strictly between 600 and 700 words.
            - STRUCTURE: Divide the text clearly into 4-5 sections labeled A, B, C, D, (E).
            - Create 10 questions numbered 47-56 (e.g., "Which section mentions...").
            - DIFFICULTY: Use paraphrasing. The question must NOT use the exact words found in the text.
            """

        # ==========================================
        #               LISTENING
        # ==========================================
        # Important: Word count simulates audio length. 150 words approx 1 min speaking.
        
        elif exercise_type == "listening1":
             type_instructions = """
            - Create a "Listening Part 1" exercise.
            - STRUCTURE: 3 UNRELATED extracts.
            - TEXT LENGTH: Each extract must be ~130-150 words (Total ~450 words).
            - FORMAT: Label them "Extract One", "Extract Two", "Extract Three".
            - Create 2 Multiple Choice questions (A, B, C) for EACH extract (Total 6 questions).
            - TIMESTAMPS: Required "MM:SS" (based on 140wpm reading speed).
            """

        elif exercise_type == "listening2":
             type_instructions = """
            - Create a "Listening Part 2: Sentence Completion" exercise.
            - TEXT LENGTH: Strictly between 550 and 650 words (Monologue).
            - CONTENT: An informative talk (e.g., a scientist presenting research).
            - Create 8 sentences (numbered 7-14) summarizing points, each with a GAP "[________]".
            - The answer must be a specific word/phrase present in the text.
            - TIMESTAMPS: Required "MM:SS".
            """

        elif exercise_type == "listening3":
             type_instructions = """
            - Create a "Listening Part 3: Multiple Choice" exercise.
            - TEXT LENGTH: Strictly between 600 and 700 words (Interview).
            - STRUCTURE: Interviewer + 2 Guests (M/F).
            - Create 6 multiple-choice questions (numbered 15-20) with 4 options (A, B, C, D).
            - Focus on feelings, attitudes, and opinions.
            - TIMESTAMPS: Required "MM:SS".
            """

        elif exercise_type == "listening4":
             type_instructions = """
            - Create a "Listening Part 4: Multiple Matching" exercise.
            - TEXT LENGTH: 5 Short monologues, approx 100-120 words each (Total ~600 words).
            - FORMAT: Label "Speaker 1", "Speaker 2", etc.
            - Create 2 TASKS with options A-H.
            - TIMESTAMPS: Required "MM:SS".
            """

        # ==========================================
        #               WRITING
        # ==========================================

        elif exercise_type == "writing1":
             type_instructions = """
            - Create a "Writing Part 1: Essay" task.
            - STRUCTURE:
              1. Context: (e.g., "You attended a seminar on...")
              2. Essay Question: (e.g., "Which factor is more important...?")
              3. Notes: Three bullet points (two given, one "your own idea").
            - Do NOT write the essay. Just the input material.
            """

        elif exercise_type == "writing2":
             type_instructions = """
            - Create a "Writing Part 2" task.
            - Provide 3 distinct choices (e.g., A Review, A Proposal, An Email/Letter).
            - For each choice, provide a specific context and target reader.
            """

        # ==========================================
        #               SPEAKING
        # ==========================================

        elif exercise_type == "speaking1":
             type_instructions = """
            - Create a "Speaking Part 1: Interview" script.
            - LENGTH: 8-10 distinct questions.
            - Phase 1: Social interaction (e.g., "Where are you from?").
            - Phase 2: Topics (e.g., "Dreams", "Technology").
            """

        elif exercise_type == "speaking2":
             type_instructions = """
            - Create a "Speaking Part 2: Long Turn" task.
            - TOPIC: Abstract (e.g., "Risk-taking", "Solitude").
            - Candidate A: "Compare these pictures and say..."
            - Candidate B: Short follow-up question.
            - JSON: Include "image_prompts" (list of 3 descriptive strings).
            """

        elif exercise_type == "speaking3":
             type_instructions = """
            - Create a "Speaking Parts 3 & 4" script.
            - Part 3: A Spidergram/Mindmap topic with 5 sub-prompts.
            - Part 4: 6 Discussion questions deepening the topic.
            """

        else:
            type_instructions = f"- Create a '{exercise_type}' exercise appropriate for Cambridge {level}."

        # 2. El Prompt Mestre
        prompt = f"""
        {SYSTEM_PROMPT_HARDCORE}
        
        TASK: Create a {level} level exercise: {exercise_type}.
        
        SPECIFIC INSTRUCTIONS:
        {type_instructions}
        
        CRITICAL OUTPUT RULES:
        1. Return ONLY valid JSON.
        2. Include an 'explanation' field for every question.
        3. LISTENING ONLY: You MUST include a 'timestamp' field (format "MM:SS").
        
        JSON Structure (Generic):
        {{
            "type": "{exercise_type}",
            "title": "Generated Task",
            "instructions": "Follow the instructions carefully.",
            "text": "Full text content...",
            "image_prompts": ["Prompt 1", "Prompt 2", "Prompt 3"], 
            "questions": [
                {{
                    "question": "1",
                    "stem": "Question text",
                    "timestamp": "01:15",
                    "original_sentence": "...",
                    "second_sentence": "...",
                    "keyword": "...",
                    "options": [ {{"text": "A"}}, {{"text": "B"}} ],
                    "answer": "Correct Answer",
                    "explanation": "Detailed explanation."
                }}
            ]
        }}
        """

        # 3. Cridem a l'IA
        print(f"🏭 Factory: Generant {exercise_type} amb {MODEL_ID} (Mode BLINDAT)...")
        response = client.chat.completions.create(
            model=MODEL_ID,
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