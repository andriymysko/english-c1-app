from openai import OpenAI
import os
import json
from dotenv import load_dotenv
# from app.services.image import ImageService 

# Carreguem variables d'entorn
load_dotenv()

# --- CONFIGURACIÓ DE DIFICULTAT "C2 PROFICIENCY / C1 ADVANCED HARDCORE" ---
SYSTEM_PROMPT_HARDCORE = """
You are a RUTHLESS Cambridge Assessment English examiner. 
Your specific role is creating the "C1 Advanced" and "C2 Proficiency" exams.
Your goal is to trick the student using logic and nuance, NOT archaic vocabulary.

CRITICAL RULES FOR HIGH QUALITY:
1. **Vocabulary Ban**: NEVER use B2 words like 'importance', 'problem', 'show', 'big', 'good', 'bad'. Use 'significance', 'plight', 'depict', 'substantial', 'exemplary', 'detrimental'.
2. **Natural Complexity**: Texts must read like high-quality journalism (The Guardian, The Economist, New Scientist). Avoid "purple prose" (artificial, overly flowery language). It must be dense but NATURAL.
3. **The "Paraphrase" Rule**: In Reading/Listening comprehension, the correct answer MUST express the idea using DIFFERENT vocabulary from the text. Visual word matching is strictly forbidden.
4. **Distractor Logic**: Distractors must be psychologically attractive. They should mention words found in the text but misunderstand the relationship (cause vs effect, past vs present, specific vs general).
5. **JSON Purity**: Never include the option letter (A, B, C, D) inside the 'text' field of an option.
"""

class ExerciseFactory:
    @staticmethod
    def create_exercise(exercise_type: str, level: str = "C1",weak_words: list = None):
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Utilitzem gpt-4o per assegurar la màxima capacitat lingüística
        MODEL_ID = "gpt-4o" 
        
        type_instructions = ""
        
        # --- JSON DINÀMIC: Definim l'estructura per defecte ---
        json_fields_example = """
                    "stem": "Question text",
                    "options": [ {"text": "Option text WITHOUT A/B label"}, {"text": "Option text WITHOUT A/B label"} ],
        """
        
        # ==========================================
        #      READING & USE OF ENGLISH
        # ==========================================
        
        if exercise_type == "reading_and_use_of_language1":
            type_instructions = """
            - Create a "Part 1: Multiple Choice Cloze" exercise.
            - TEXT LENGTH: Strictly between 180 and 220 words.
            - VISUAL FORMAT: You MUST mark gaps precisely as "[N] ________" (number in brackets, one space, 8 underscores).
            - Write a DENSE, ACADEMIC text with 8 gaps marked [1] to [8].
            - GAP STRATEGY (MANDATORY DISTRIBUTION):
              * Gaps 1-2: Strong Collocations (e.g., 'striking resemblance', NOT 'big resemblance').
              * Gaps 3-4: Fixed Idiomatic Phrases (e.g., 'in the grand scheme of things').
              * Gaps 5-6: Phrasal Verbs or Dependent Prepositions (e.g., 'resulted IN', 'stemmed FROM').
              * Gaps 7-8: Semantic Precision (4 synonyms like 'glance', 'glimpse', 'gaze', 'stare' - context determines answer).
            - CRITICAL JSON RULE: Options must be just the word (e.g., "make"), NOT "A. make".
            - The 'answer' field must be the EXACT TEXT of the correct option.
            """

        elif exercise_type == "reading_and_use_of_language2":
             type_instructions = """
            - Create a "Part 2: Open Cloze" exercise.
            - TEXT LENGTH: Strictly between 180 and 220 words.
            - VISUAL FORMAT: You MUST mark gaps precisely as "[N] ________".
            - Write a coherent text with 8 gaps marked [9] to [16].
            - The student must fill each gap with ONE grammar word.
            - MANDATORY GAP DISTRIBUTION (Avoid Repetition):
              * Max 1 Relative Pronoun (which/that/who). Do NOT overuse.
              * Min 2 Connectors/Linkers (e.g., Although, Unless, Whereas, Despite).
              * Min 1 Auxiliary Verb for Inversion (e.g., "Not only *did* he...", "Little *do* they know").
              * Min 1 Preposition part of a Phrasal Verb.
              * Min 1 Fixed Expression word (e.g., "take *part* in", "on *behalf* of").
            - GRAMMAR SANITY CHECK: Read the sentence with the gap filled. Ensure no redundancy (e.g., NEVER write "through [through]..."). Ensure no double subjects (e.g., "[As] languages evolve, they..." NOT "They languages evolve").
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
            - DIFFICULTY RULES (C1/C2 LEVEL):
              1. **Double Transformation**: At least 3 words MUST require a PREFIX + SUFFIX (e.g., PREDICT -> UNPREDICTABLE).
              2. **Negative Prefixes**: Use 'UN-', 'IN-', 'MIS-', 'DIS-', 'IR-' aggressively.
              3. **Internal Changes**: Use stems that change spelling internally (e.g., STRONG -> STRENGTH, MAINTAIN -> MAINTENANCE).
              4. **Compound Nouns**: Use stems like 'BREAK' -> 'BREAKTHROUGHS' or 'DOWN' -> 'DOWNFALL'.
              5. **Avoid B2**: Do not use simple suffix-only changes like 'act' -> 'action' or 'comfort' -> 'comfortable' unless modified by a prefix.
            - IMPORTANT JSON RULE 1: The 'options' field MUST be an empty list [].
            - IMPORTANT JSON RULE 2: In the 'questions' array, the 'stem' field MUST be the STEM word in CAPITALS (e.g., "PROLIFERATE"), NOT the answer.
            """

        elif exercise_type == "reading_and_use_of_language4":
             # --- CONFIGURACIÓ ESPECIAL PER A PART 4 ---
             type_instructions = """
            - Create a "Part 4: Key Word Transformation" exercise.
            - Create 6 items numbered 25-30.
            - STRUCTURE: For each item you MUST generate 3 distinct fields:
              1. 'original_sentence': A complex C1/C2 sentence.
              2. 'keyword': A word in CAPITALS.
              3. 'second_sentence': The transformed sentence with a GAP marked as "________".
            - CONSTRAINT: The gap must be filled with 3 to 6 words.
            - TARGET GRAMMAR: Inversion (e.g., "Had I known..."), Cleft Sentences ("What I did was..."), Passive Reporting ("It is believed to be..."), Fixed Phrases ("It comes as no surprise").
            - CRITICAL RULE (IMMUTABILITY): The 'keyword' MUST appear in the 'answer' EXACTLY as written. Do NOT change tense or form.
            """
             json_fields_example = """
                    "original_sentence": "He never suspected that the money had been stolen.",
                    "keyword": "AT",
                    "second_sentence": "________ time did he suspect that the money had been stolen.",
                    "answer": "At no",
                    "stem": "", 
                    "options": [],
             """

        elif exercise_type == "reading_and_use_of_language5":
             type_instructions = """
            - Create a "Part 5: Multiple Choice Reading" exercise.
            - TEXT LENGTH: Strictly between 600 and 700 words.
            - CONTENT STYLE: Authentic high-level journalism (e.g., The Guardian, National Geographic). Natural flow, NOT "word salad" or artificial thesaurus-stuffing.
            - Create 6 multiple-choice questions numbered 31-36.
            - Each question must have a 'stem' and 4 options (A, B, C, D).
            
            - CRITICAL RULE 1 (NO WORD MATCHING): The correct option MUST be a PARAPHRASE. It implies the meaning using COMPLETELY DIFFERENT vocabulary.
              * Bad Example: Text="The economy collapsed." Option="The economy failed." (Too similar).
              * Good Example: Text="The economy collapsed." Option="A financial downturn ensued." (C1 Level).
            
            - CRITICAL RULE 2 (DISTRACTORS): Distractors should mention specific words found in the text but be logically wrong.
            
            - CRITICAL JSON RULE: Do NOT put labels (A., B.) in the text of the options.
            - The 'answer' field must match the EXACT TEXT of the correct option.

            - **QUESTION FORMAT (CRITICAL)**: The 'question' field MUST contain the actual question sentence (e.g., 'What is the speaker's main point about...?'). You are STRICTLY FORBIDDEN from putting just a number in the 'question' field.
            """
             json_fields_example = """
                    "question": "[MANDATORY: Write the FULL question sentence here. Do NOT write the number]",
                    "options": [
                        "Option A text",
                        "Option B text",
                        "Option C text",
                        "Option D text"
                    ],
              """

        elif exercise_type == "reading_and_use_of_language6":
             type_instructions = """
            - Create a "Part 6: Cross-Text Multiple Matching" exercise.
            - STRUCTURE: Write 4 distinct texts labeled "Text A", "Text B", "Text C", "Text D".
            - TEXT LENGTH: Each text MUST be 150-200 words. Total reading load ~700 words.
            - TOPIC: A complex controversy (e.g., "Space Tourism", "AI Rights") with 4 distinct viewpoints.
              * Text A: The Idealist (Strong proponent).
              * Text B: The Skeptic (Focus on cost/risks).
              * Text C: The Moderate (Pros and cons).
              * Text D: The Pragmatist (Focus on implementation).
            
            - QUESTIONS (37-40): You MUST include CROSS-REFERENCING questions.
              * Question Type 1: "Which writer expresses a different view from the others regarding X?"
              * Question Type 2: "Which writer shares Writer B's opinion on Y?"
            
            - ANSWER KEY: The answer must be just the letter (A, B, C, or D).
            - CRITICAL JSON RULE: In 'options', provide [A, B, C, D]. The 'answer' must be one of these letters.
              - **QUESTION FORMAT (CRITICAL)**: The 'question' field MUST contain the actual question sentence (e.g., 'What is the speaker's main point about...?'). You are STRICTLY FORBIDDEN from putting just a number in the 'question' field.
            """
             json_fields_example = """
                    "question": "[MANDATORY: Write the FULL question sentence here. Do NOT write the number]",
                    "options": [
                        "Option A text",
                        "Option B text",
                        "Option C text",
                        "Option D text"
                    ],
              """

        elif exercise_type == "reading_and_use_of_language7":
             type_instructions = """
            - Create a "Part 7: Gapped Text" exercise.
            - TEXT LENGTH: Strictly between 600 and 650 words.
            - STRUCTURE: Write a main text where 6 paragraphs have been removed.
            - VISUAL FORMAT: Mark removal points clearly as "[41]", "[42]", etc. on their own lines.
            - MISSING PARAGRAPHS: Provide 7 paragraphs labeled A-G (6 correct + 1 distractor).
            - LOGIC: The link between the paragraph and the gap must depend on cohesive devices (reference words like 'this', 'such', 'the latter') or thematic development.
              - **QUESTION FORMAT (CRITICAL)**: The 'question' field MUST contain the actual question sentence (e.g., 'What is the speaker's main point about...?'). You are STRICTLY FORBIDDEN from putting just a number in the 'question' field.
            """
             json_fields_example = """
                    "question": "[MANDATORY: Write the FULL question sentence here. Do NOT write the number]",
                    "options": [
                        "Option A text",
                        "Option B text",
                        "Option C text",
                        "Option D text"
                    ],
              """

        elif exercise_type == "reading_and_use_of_language8":
             type_instructions = """
            - Create a "Part 8: Multiple Matching" exercise.
            - TEXT LENGTH: Strictly between 600 and 700 words.
            - STRUCTURE: Divide the text clearly into 4-5 sections labeled A, B, C, D, (E).
            - TOPIC: A dense feature article (e.g., "Careers in Astrophysics", "Extreme Sports Psychology").
            - THEME MIXING: Do NOT have one section for "Money" and one for "Technology". Section A must discuss Money AND Technology. Section B must discuss Technology AND People.
            - QUESTIONS (47-56): Create 10 questions.
            - CRITICAL RULE (ABSTRACT PARAPHRASING):
              * NEVER use the same key noun in the question and the text.
              * If the text says "remote sensing" or "cameras", the question MUST say "non-intrusive monitoring methods".
              * If the text says "expensive", the question MUST say "financial implications".
            - DISTRACTORS: Ensure keywords from Question 47 appear in Section B, but the *answer* is in Section A.
            - ANSWER KEY: The answer must be just the letter (A, B, C, D, E).
            - CRITICAL JSON RULE: In 'options', provide [A, B, C, D, (E)]. The 'answer' must be the letter.
            - **QUESTION FORMAT (CRITICAL)**: The 'question' field MUST contain the actual question sentence (e.g., 'What is the speaker's main point about...?'). You are STRICTLY FORBIDDEN from putting just a number in the 'question' field.
            """
             json_fields_example = """
                    "question": "[MANDATORY: Write the FULL question sentence here. Do NOT write the number]",
                    "options": [
                        "Option A text",
                        "Option B text",
                        "Option C text",
                        "Option D text"
                    ],
              """

        # ==========================================
        #             LISTENING
        # ==========================================
        
        elif exercise_type == "listening1":
             # 🚨 MODIFICAT PER A C1 REAL (3 OPCIONS + TEMES SERIOSOS) 🚨
             type_instructions = """
            - Create a "Listening Part 1" exercise.
            - **STRUCTURE**: 3 UNRELATED extracts. 
            - **CRITICAL RULE 1**: ALL extracts must be **DIALOGUES** between two interacting speakers. **NO MONOLOGUES ALLOWED**.
            - **CRITICAL RULE 2**: You MUST provide **3 OPTIONS (A, B, C)** for every question. Never just 2.
            
            - **TEXT LENGTH**: Each extract must be ~130-150 words (Total ~450 words).
            - **SCRIPT STYLE**: Scripts must sound NATURAL for C1 level. Use hesitations ("erm...", "well..."), interruptions, idioms, and indirect agreement ("I see your point, but...", "I wouldn't go that far"). Avoid robotic Q&A.
            
            - **CONTENT RULES (C1 LEVEL)**:
              - **Extract 1**: Professional context (e.g., two architects discussing a design flaw, scientists analyzing data).
              - **Extract 2**: Academic/Social context (e.g., two friends debating a complex social trend or article).
              - **Extract 3**: Cultural/Arts context (e.g., two critics reviewing a controversial film or exhibition).
              - **BANNED TOPICS**: No shop returns, no restaurant orders, no asking for directions (Too B1/B2).
            
            - **QUESTION TYPES (2 per extract = 6 total)**:
              - Do NOT ask for basic facts.
              - Focus on **AGREEMENT** ("What do they both agree on?").
              - Focus on **ATTITUDE/FEELING** ("How does the woman feel about the man's suggestion?").
              - Focus on **PURPOSE** ("Why does the man mention X?").
            
            - **DISTRACTOR LOGIC**: The incorrect options must be mentioned in the text but must be wrong due to a specific detail (e.g., only one person agrees, or it refers to the past, not the present).
            
            - **JSON FORMAT**: Ensure the 'options' list has exactly 3 items.
            - TIMESTAMPS: Required "MM:SS".
            - **QUESTION FORMAT (CRITICAL)**: The 'question' field MUST contain the actual question sentence (e.g., 'What is the speaker's main point about...?'). You are STRICTLY FORBIDDEN from putting just a number in the 'question' field.
            """
             # Sobreescrivim l'exemple JSON per assegurar que en fa 3
             json_fields_example = """
                    "stem": "What do both speakers agree about the new building design?",
                    "options": [
                        {"text": "It fails to meet the environmental standards."}, 
                        {"text": "The costs involved are likely to be prohibitive."}, 
                        {"text": "The aesthetic appeal is its strongest feature."}
                    ],
             """

        elif exercise_type == "listening2":
             type_instructions = """
            - Create a "Listening Part 2: Sentence Completion" exercise.
            - **TEXT LENGTH**: Strictly between 500 and 600 words (Monologue).
            - **CONTENT**: An informative talk on a specific topic (e.g., conservation, archaeology, psychology).
            - **STRUCTURE**:
              1. Generate a monologue (full text). Put this in the 'text' field.
              2. Create 8 sentences summarizing specific points from the text.
              3. Each sentence must have a GAP marked exactly as "[________]".
              4. The answer must be a specific word or short phrase (1 to 3 words) found EXACTLY in the text.
            
            - **🚨 ADVANCED CAMBRIDGE CALIBRATION (CRITICAL) 🚨**:
              - **PACING (Cognitive Load)**: The 8 answers MUST be evenly spaced throughout the 500-600 word monologue (roughly one answer every 60-70 words). Do NOT cluster answers together. Fill the space between answers with anecdotes, background context, or secondary examples so the student has time to write the previous answer.
              - **NO ACOUSTIC TRAPS**: Be extremely careful with grammatical matching. If the sentence prompt says "Ensuring [GAP] is crucial...", the audio MUST NOT say "maintaining a delicate balance and ensuring genetic diversity". Why? Because if the student reads "Ensuring" on their paper, they will mistakenly write "a delicate balance" upon hearing the previous verb. The syntax before the gap must not artificially trick the ear into writing the adjacent wrong noun phrase.
            
            - **CRITICAL JSON RULES**:
              - 'instructions': MUST BE EXACTLY "You will hear a monologue. For questions 7-14, complete the sentences with a word or short phrase (between 1 and 3 words)."
              - 'options': Must be an empty list []. Do NOT provide choices.
              - 'stem': The sentence with the gap. Do NOT start the stem with a number (e.g., write "The..." NOT "7. The...").
              - 'answer': The exact word(s) to fill the gap.
            - TIMESTAMPS: Required "MM:SS".
            """
             # Forcem una estructura neta sense opcions
             json_fields_example = """
                    "stem": "The ancient city was discovered by [________] in 1922.",
                    "answer": "chance",
                    "options": [],
             """

        elif exercise_type == "listening3":
             type_instructions = """
            - Create a "Listening Part 3: Multiple Choice (Interview)" exercise.
            - **TEXT LENGTH (CRITICAL)**: You MUST write between 750 and 850 words. This is non-negotiable. The interview must be long, detailed, and conversational to last around 4 minutes.
            - **FORMAT**: A radio interview featuring a host/interviewer and two experts discussing a C1-level topic.
            - **THE ART OF THE DISTRACTOR (CRITICAL C1 SKILL)**: NEVER give the correct answer immediately. The speakers MUST discuss concepts from the INCORRECT options (distractors) to trick the listener before concluding with their true opinion. 
              *EXAMPLE OF C1 DISTRACTOR LOGIC*: If the correct answer is 'biodiversity', the speaker MUST say something like: "Many argue we need parks to make the concrete jungle look prettier (Distractor 1), and others point to air pollution reduction (Distractor 2). But what really fascinated me wasn't the air quality, but the sudden return of native bird species. Providing these sanctuaries is their true value (Correct Answer)."
            - **PACING (BREATHING ROOM)**: There are 6 questions. You MUST insert at least 100-130 words of conversational filler, long anecdotes, or secondary examples between each answer cue. The student needs 30-40 seconds of pure listening without answering anything to read the next A, B, C, D options.
            - **QUESTIONS**: Create EXACTLY 6 questions. 
            - **QUESTION STYLE**: Focus strictly on attitudes, opinions, feelings, agreement/disagreement, and deductions.
            - **OPTIONS**: Exactly 4 options per question. Long, complex paraphrasing. No "A)", "B)" labels in the text.
            - **CRITICAL JSON RULES**:
              - 'instructions': MUST BE EXACTLY "You will hear an interview. For questions 15-20, choose the answer (A, B, C or D) which fits best according to what you hear."
            - TIMESTAMPS: Required "MM:SS".
            - **QUESTION FORMAT (CRITICAL)**: The 'question' field MUST contain the actual question sentence (e.g., 'What is the speaker's main point about...?'). You are STRICTLY FORBIDDEN from putting just a number in the 'question' field.
            """
             json_fields_example = """
                    "question": "What is Dr. Carter's primary point about the ecological value of urban green spaces?",
                    "options": [
                        "They provide a necessary refuge for endangered species.",
                        "They help to regulate the temperature of the city.",
                        "They offer a psychological boost to the inhabitants.",
                        "They are the most cost-effective environmental policy."
                    ],
                    "answer": "They provide a necessary refuge for endangered species.",
             """

        elif exercise_type == "listening4":
             type_instructions = """
            - Create a "Listening Part 4: Multiple Matching" exercise.
            - **TEXT LENGTH**: Around 600-750 words total. The text MUST contain 5 distinct monologues from Speaker 1 to Speaker 5.
            - **TASK STRUCTURE (CRITICAL)**: There are TWO simultaneous tasks.
              - Task 1: Why they started the activity (8 options: A-H, 5 correct, 3 distractors).
              - Task 2: How they feel about it now (8 options: A-H, 5 correct, 3 distractors).
            
            - **🚨 ADVANCED CAMBRIDGE CALIBRATION (CRITICAL) 🚨**:
              1. **NO MATRIX PATTERNS (RANDOMIZATION)**: The correct answers MUST be completely randomized. DO NOT assign them in alphabetical order (e.g., Speaker 1 is NOT A, Speaker 2 is NOT B). Furthermore, the answer for Task 1 MUST NOT be the same letter as Task 2 for the same speaker. Example of a good key: Speaker 1 (Task 1=C, Task 2=G), Speaker 2 (Task 1=H, Task 2=A), etc.
              2. **NO PARROTING (STRICT PARAPHRASING)**: The options (A-H) MUST NEVER use the exact same vocabulary as the audio transcript. This is a C1 Advanced exam. If the audio says "therapeutic and achieving", the option MUST say something like "Stimulated by the continuous learning curve". You MUST use high-level C1 synonyms, idioms, and complex paraphrasing to hide the answers.
              
            - **QUESTIONS**: Create EXACTLY 10 questions. 
              - Questions 1 to 5 correspond to Speaker 1-5 for Task 1.
              - Questions 6 to 10 correspond to Speaker 1-5 for Task 2.
            - The 'answer' must strictly be a single uppercase letter (e.g., "C", "F").
            - 'instructions': "You will hear five short extracts. Look at Task 1 and Task 2. You must complete both tasks while you listen."
            """
             json_fields_example = '"options": [],'

        # ==========================================
        #               WRITING
        # ==========================================

        elif exercise_type == "writing1":
             type_instructions = """
            - Create a "Writing Part 1: Essay" task.
            - STRUCTURE: Context, Essay Question, Notes (3 bullet points).
            - TOPIC: Abstract social issues (Environment, Technology, Education).
            - Do NOT write the essay. Just the input material.
            """

        elif exercise_type == "writing2":
             type_instructions = """
            - Create a "Writing Part 2" task.
            - Provide 3 distinct choices (e.g., A Review, A Proposal, An Email/Letter).
            - Contexts must be formal or semi-formal.
            """

        # ==========================================
        #               SPEAKING
        # ==========================================

        elif exercise_type == "speaking1":
             type_instructions = """
            - Create a "Speaking Part 1: Interview" script.
            - LENGTH: 8-10 distinct questions.
            - Questions should move from personal (Work, Hobbies) to abstract (Future trends, Society).
            """

        elif exercise_type == "speaking2":
             type_instructions = """
            - Create a "Speaking Part 2: Long Turn" task.
            - TOPIC: Abstract (e.g., "Dealing with uncertainty", "Celebration").
            - Candidate A: "Compare these pictures and say why..."
            - Candidate B: Short follow-up question.
            - JSON: Include "image_prompts" (list of 3 descriptive strings).
            """

        elif exercise_type == "speaking3":
             type_instructions = """
            - Create a comprehensive **Speaking Part 3 (Collaborative Task)** AND **Part 4 (Discussion)**.
            - TOPIC: Choose a sophisticated, debatable social issue (e.g., "The impact of globalization", "Modern educational priorities", "Work-life balance").
            
            - **STRUCTURE FOR PART 3 (TWO PHASES)**:
              1. **CENTRAL QUESTION**: A question (NOT a title) that connects 5 distinct areas. E.g., "How does technology affect these areas of life?".
              2. **5 SUB-PROMPTS**: 5 Short noun phrases (e.g., "Communication", "Privacy").
              3. **DECISION QUESTION**: A separate question for the 2nd phase (1 minute) where candidates must negotiate. E.g., "Which of these areas has changed the most?".
            
            - **STRUCTURE FOR PART 4**:
              - Generate 5 distinct Discussion Questions extending the topic from Part 3.
              - **RULE**: Questions must be ABSTRACT and societal, NOT personal.
              - BAD: "Do you like computers?"
              - GOOD: "To what extent has digital communication eroded face-to-face interaction?"
            
            - **CRITICAL JSON OUPUT**:
              - You MUST return a specific JSON structure for this task type.
              - Use fields: 'part3_central_question', 'part3_prompts' (list of 5), 'part3_decision_question', and 'part4_questions' (list of 5).
            """
             json_fields_example = """
                    "part3_central_question": "How do these factors influence student success?",
                    "part3_prompts": ["Teacher quality", "Technology", "Parental support", "Curriculum", "Peer pressure"],
                    "part3_decision_question": "Which factor do you think is the most critical for long-term success?",
                    "part4_questions": ["Do you think schools today focus too much on exams?", "Is technology in the classroom a distraction or a tool?"],
             """

        elif exercise_type == "grammar_conditionals":
            type_instructions = """
            - Create a specialized "Advanced Conditionals" exercise.
            - LEVEL: Cambridge C1 Advanced / C2 Proficiency.
            - FORMAT: Multiple Choice Cloze (Stem + 4 Options).
            - CONTENT: 8 sentences focusing ONLY on conditional structures.
            - GRAMMAR TARGETS:
              1. Inversion (e.g., "Had I known", "Were you to", "Should you see").
              2. Mixed Conditionals (Past action -> Present result, or vice versa).
              3. Alternatives to 'If' (e.g., "But for", "Provided that", "Unless", "Supposing").
              
            - CRITICAL GRAMMAR QA (STRICT RULES):
              1. **Subject-Verb Agreement**: Check 3rd person singular. NEVER generate "She accept". MUST be "She accepts".
              2. **Sequence of Tenses**: 
                 - If the result is 'would have done' (Past), the condition MUST be 'had done' (Past Perfect) or 'had had'. 
                 - DO NOT pair Past Simple 'had' with 'would have done' unless it is a clear Mixed Conditional state.
              3. **"Were it not for" vs "Had it not been for"**:
                 - Use "Were it not for" for General/Present truths.
                 - Use "Had it not been for" for Past specific events.
                 
            - JSON RULE: Options must be A, B, C, D. Explain WHY the answer is correct based on the conditional type.
            """
        
        elif exercise_type == "grammar_inversion":
            type_instructions = """
            - Create a specialized "Inversion & Emphatic Structures" exercise.
            - LEVEL: Cambridge C1 Advanced / C2 Proficiency (High Difficulty).
            - FORMAT: Multiple Choice Cloze.
            - CONTENT: 8 sentences focusing on subject-auxiliary inversion.
            
            - CRITICAL TARGETS & TRAPS (Must implement):
              1. **The 'Than/When' Trap (Question 1 Style)**: 
                 - Create sentences with "No sooner... THAN...". 
                 - The Correct Answer is "No sooner".
                 - **MANDATORY DISTRACTOR**: You MUST include "Hardly" or "Scarcely" as options. 
                 - Explanation: "Hardly goes with WHEN, No sooner goes with THAN".
              
              2. **Place/Movement (The Noun vs Pronoun Rule)**:
                 - Target: Adverbs of place (Out, Up, Down, Here, There).
                 - Rule: If Subject is a NOUN -> INVERT (e.g., "Out came the secret").
                 - Rule: If Subject is a PRONOUN -> NO INVERSION (e.g., "Out it came").
                 - Create a question testing this nuance.
              
              3. **Delayed Inversion ('Only')**:
                 - Use "Only after", "Only when", or "Not until".
                 - Ensure the inversion happens in the MAIN clause, not immediately after the adverb.
                 
              4. **Result Clauses**:
                 - Use "So [adjective]... that" or "Such [noun]... that".
            
            - JSON RULE: Options must be A, B, C, D. Explain specifically why the distractors are wrong (e.g., "Hardly requires 'when', not 'than'").
            """

        elif exercise_type == "grammar_phrasal_verbs":
            type_instructions = """
            - Create a "C1/C2 Phrasal Verbs" exercise.
            - LEVEL: Hardcore Cambridge C1 Advanced / C2 Proficiency.
            - FORMAT: Multiple Choice Cloze (Stem + 4 Options).
            - CONTENT: 8 sentences.
            
            - TARGETS (MUST INCLUDE):
              1. **Three-part Phrasal Verbs**: e.g., "come up against", "put down to", "check up on".
              2. **Abstract/Metaphorical Meanings**: e.g., "bring off" (succeed), "sink in" (realize), "fall through" (fail).
              
            - QUALITY CONTROL & BANNED LIST (STRICT):
              1. **NO B1/B2 Verbs**: Do NOT use "deal with", "look for", "get up", or "give up". They are too easy.
                 - **REPLACEMENT**: Instead of "deal with", use "**face up to**" (confront) or "**iron out**" (resolve details).
              
              2. **Idiomatic Precision (The "Chalk/Write" Rule)**:
                 - If using "chalk up", the structure MUST be "chalk it up **TO** experience" (attribution).
                 - If the meaning is "dismiss/consider as a loss", use "**write off AS**" (e.g., "write the incident off as a learning experience").
                 - DO NOT generate "chalk up as".
            
            - DISTRACTOR LOGIC: Distractors must be real phrasal verbs that fit the grammar but make no sense in context (Semantic distractors).
            - **QUESTION FORMAT (CRITICAL)**: The 'question' field MUST contain the full standalone sentence with a gap (e.g., "I couldn't [______] what he was saying in the dark."). You are STRICTLY FORBIDDEN from putting just a number in this field.
            """
            json_fields_example = """
                  "question": "[MANDATORY: Write the full sentence with a gap here. Do NOT write just the number]",
                  "options": [
                      "Option A text",
                      "Option B text",
                      "Option C text",
                      "Option D text"
                  ],
            """

        elif exercise_type == "grammar_idioms":
            type_instructions = """
            - Create a "C1 Idiomatic Expressions" exercise.
            - LEVEL: Cambridge C1 Advanced.
            - FORMAT: Multiple Choice Cloze.
            - **INSTRUCTIONS**: "Read the sentences and choose the correct option to complete the idiomatic expressions." (NEVER use 'Listen' in instructions).
            - CONTENT: 8 sentences where the gap is a KEY word of an idiom.
            
            - TARGETS (MUST INCLUDE):
              1. **"Push the envelope"**: 
                 - Meaning: To innovate, go beyond limits.
                 - Context MUST be about **radical design, technology, or outperforming competitors**. 
                 - Bad Context: "Ensure success" (Too weak).
                 - Good Context: "The design team needs to push the envelope if we want to revolutionize the market."
              
              2. **"Think outside the box"**: 
                 - Context: Creative solutions / Unconventional ideas.
                 - Distractors: cage, bag, square.
                 
              3. **"Keep someone in the loop"**: 
                 - Context: Information flow / Updates.
                 - Distractors: circle, ring, cycle.
                 
              4. **"Get the ball rolling"**: 
                 - Context: Starting a project / Initiative.
                 - Distractors: stone, wheel, rock.
                 
              5. **"Sit on the fence"**: (Indecision).
              6. **"Burn the midnight oil"**: (Working late).
              
            - DISTRACTOR LOGIC: 
              - Distractors must be semantically related nouns/verbs (e.g., shapes for 'box', round things for 'loop') but wrong for the fixed phrase.
            """

        elif exercise_type == "grammar_passive":
            type_instructions = """
            - Create an "Advanced Passive Structures" exercise.
            - LEVEL: Cambridge C1 Advanced.
            - FORMAT: Multiple Choice Cloze.
            - CONTENT: 8 sentences.
            
            - TARGETS (MUST INCLUDE):
              1. **The Standard Causative**: "Have/Get something done" (Object focus).
              2. **Impersonal Passive**: "He is said TO BE..." or "It is believed THAT...".
              3. **Passive with Gerunds (The 'Needs' Rule)**: "needs washing", "needs fixing".
              4. **Mandatory Subjunctive (Passive)**: "insisted that the report BE completed" (Base form be).
              5. **Passive Perfect Infinitive**: "is thought TO HAVE BEEN written" (Past reference).
              
              6. **THE AGENT TRAP (Have vs Get + Person)**:
                 - Create questions that test the difference between "Have someone DO" and "Get someone TO DO".
                 - Example Q: "I finally _____ my brother to help me." (Correct: got / Distractor: had).
                 - Example Q: "She _____ the plumber fix the leak." (Correct: had / Distractor: got).
              
            - QUALITY CONTROL & STRICT GRAMMAR RULES:
              - **Trap 1**: "He is believed THAT he is..." (INCORRECT). Must be "He is believed TO BE".
              - **Trap 2**: Causative Agent Rule. NEVER generate "I had him to go" or "I got him go".
              
              - **TRAP 3 (CRITICAL - The Double Answer)**: 
                - When testing 'needs doing' (e.g., 'The car needs washing'), **NEVER** include 'to be washed' as a distractor. Both are correct. 
                - **MANDATORY DISTRACTORS**: Use active infinitives ('to wash') or incorrect forms ('being washed', 'wash').
                
              - **Trap 4**: For Subjunctive questions (insisted/suggested that...), ensure the answer is the bare infinitive 'BE' or 'BE DONE', not 'was' or 'should be'.
            """

        elif exercise_type == "grammar_linkers":
            type_instructions = """
            - Create an "Advanced Linkers & Cohesion" exercise.
            - LEVEL: Cambridge C1/C2.
            - FORMAT: Multiple Choice Cloze.
            - CONTENT: 8 sentences focusing on connecting ideas logically.
            
            - TARGETS (MUST INCLUDE):
              1. **Fluid Consequence**: "Thereby + Gerund" (e.g., "...thereby creating a problem").
              2. **Formal Reason**: "Owing to" vs "Due to".
              3. **Contrast**: "Albeit" (with adjectives), "Nevertheless".
              4. **Negative Condition**: "Otherwise".
              
            - CRITICAL PUNCTUATION & LOGIC RULES (STRICT):
              1. **The "Otherwise/However" Semicolon Rule**:
                 - These are conjunctive adverbs, NOT conjunctions. You cannot join clauses with just a comma.
                 - **BAD**: "We should leave early, otherwise we miss the train." (Comma Splice).
                 - **GOOD**: "We should leave early; otherwise, we will miss the train."
                 - **INSTRUCTION**: If the gap is in the middle of a sentence for these words, you MUST include a semicolon (;) in the text stem before the gap.

              2. **Ambiguity Killer (Result vs Contrast)**:
                 - Do not create contexts where both "Consequently" and "However" could logically work.
                 - **BAD Context**: "The company is expanding. ____, it needs new rules." (Could be result OR contrast).
                 - **GOOD Context**: "The company went bankrupt. ____, all staff were fired." (Clearly Result -> Consequently).
                 - **Rule**: If the answer is "Consequently", do NOT use "However" as a distractor unless the context creates a logical contradiction.

              3. **"Thereby" Syntax**: Ensure it is followed immediately by an -ING form (e.g., "thereby reducing").
            """

        elif exercise_type == "grammar_prepositions":
            type_instructions = """
            - Create a "Dependent Prepositions" exercise.
            - LEVEL: Cambridge C1 Advanced / C2 Proficiency (Hard Mode).
            - FORMAT: Multiple Choice Cloze.
            - CONTENT: 8 sentences. The gap MUST be the preposition.
            
            - TARGETS (STRICT C1/C2 LEVEL):
              1. **The 'To + ING' Trap**: 
                 - "Confess TO stealing".
                 - "Resign oneself TO accepting" (Accepting something unpleasant).
                 - "Object TO paying".
              2. **Advanced Adjectives**: 
                 - "Devoid OF" (Context: completely lacking logic/quality).
                 - "Prone TO" / "Susceptible TO".
                 - "Intent ON".
              3. **The Prevention/Result Rule**: 
                 - "Deter/Prevent/Discourage someone FROM doing".
                 - "Culminate IN".
              
            - BANNED LIST (No B2/First Certificate allowed): 
              - **STRICTLY FORBIDDEN**: "Capable of", "Succeed in", "Good at", "Interested in", "Afraid of", "Depend on".
              - Do NOT generate these. They are too easy.
              
            - DISTRACTOR LOGIC:
              - Distractors must be plausible prepositions that confuse non-natives.
              - E.g., for "Devoid OF": distractors [from, without, in].
              - E.g., for "Deter FROM": distractors [to, against, of].
            """

        elif exercise_type == "grammar_collocations":
            type_instructions = """
            - Create an "Advanced Collocations" exercise.
            - LEVEL: Cambridge C1/C2.
            - FORMAT: Multiple Choice Cloze.
            - CONTENT: 8 sentences.
            
            - TARGETS:
              1. **Intensifiers**: "Bitterly disappointed/cold", "Virtually impossible", "Painfully aware".
              2. **Formal Verbs**: "Pose a threat/risk", "Conduct research", "Alleviate poverty".
              3. **Descriptive C2**: "Torrential rain" (NOT Heavy), "Heated argument", "Narrow escape".
            
            - **CRITICAL FIXES (BUGS)**:
              1. **The 'Pose' Trap**: If the answer is "posed", the text MUST be "The project _____ a threat". Do NOT write "The project posed a _____ threat".
              2. **Rain Rule**: The target MUST be "Torrential". Do not accept "Heavy" as the correct answer (it's too easy).
            """

        elif exercise_type == "grammar_wishes":
            type_instructions = """
            - Create a "Wishes, Regrets & Preferences" exercise.
            - LEVEL: Cambridge C1 Advanced.
            - FORMAT: Multiple Choice Cloze.
            - CONTENT: 8 sentences.
            
            - TARGETS (Strict Grammar Rules):
              1. **Regrets about the Past**: "I wish I HAD KNOWN" (Past Perfect).
                 - Distractor: "knew" (Past Simple - wrong for past regret).
              2. **Desire for Change (Present)**: "If only I KNEW the answer" (Past Simple).
              3. **Complaints/Annoyance**: "I wish you WOULD stop" (Use 'would' for annoying habits).
              4. **"It's Time"**: "It's high time we LEFT" (Past Simple, not Present).
              5. **"I'd Rather"**: "I'd rather you DIDN'T smoke" (Past Simple when changing subject).
            
            - TRAPS:
              - Mixing up "I wish I knew" (Present state) vs "I wish I had known" (Past regret).
              - "It's time to go" (Infinitive) vs "It's time we went" (Subject + Past). Focus on the second one.
            """

        else:
            type_instructions = f"- Create a '{exercise_type}' exercise appropriate for Cambridge {level}."

        # 2. El Prompt Mestre (AMB INJECCIÓ DINÀMICA DEL JSON)
        srs_prompt = ""
        if weak_words and len(weak_words) > 0:
            srs_prompt = f"""
            - **🚨 ADAPTIVE LEARNING (CRITICAL) 🚨**:
              - The user is currently struggling with these specific words/phrasal verbs: {weak_words}.
              - You MUST include at least one or two of these exact words as CORRECT answers in this exercise to help them practice.
              - The rest of the exercise should contain new advanced C1 vocabulary.
            """

        prompt = f"""
        {SYSTEM_PROMPT_HARDCORE}
        
        TASK: Create a {level} level exercise: {exercise_type}.
        
        SPECIFIC INSTRUCTIONS:
        {type_instructions}
        
        {srs_prompt}

        CRITICAL OUTPUT RULES:
        1. Return ONLY valid JSON.
        2. Include an 'explanation' field for every question.
        3. LISTENING ONLY: You MUST include a 'timestamp' field (format "MM:SS").
        4. NO PLACEHOLDERS: You MUST generate REAL content. Do NOT copy the placeholder text.
        
        JSON Structure (Generic/Specific):
        {{
            "type": "{exercise_type}",
            "title": "[Create a real descriptive title for this specific task]",
            "instructions": "[Write the specific exam instructions here]",
            "text": "[MANDATORY: Write the FULL audio script or reading text here. Never leave this empty]",
            "image_prompts": ["Prompt 1", "Prompt 2", "Prompt 3"], 
            "task1_heading": "[Only for Part 4] TASK 1: Reason for starting",
            "task1_options": ["[Only for Part 4] A. Option 1", "B. Option 2", "C. Option 3", "D.", "E.", "F.", "G.", "H."],
            "task2_heading": "[Only for Part 4] TASK 2: How they feel now",
            "task2_options": ["[Only for Part 4] A. Option 1", "B. Option 2", "C. Option 3", "D.", "E.", "F.", "G.", "H."],
            "questions": [
                {{
                    "question": "[Write the actual question sentence here]",
                    {json_fields_example}
                    "answer": "[The correct option/text or letter]",
                    "explanation": "[Detailed explanation of why it is correct]",
                    "timestamp": "01:15"
                }}
            ]
        }}
        """

        # 3. Cridem a l'IA
        print(f"🏭 Factory: Generant {exercise_type} amb {MODEL_ID} (Mode NIGHTMARE)...")
        response = client.chat.completions.create(
            model=MODEL_ID,
            messages=[{"role": "system", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        
        try:
            data = json.loads(content)
            
            # 🚑 FIX CRÍTIC PER A SPEAKING 3: Moure dades de 'questions' a l'arrel
            # Això soluciona que surtin les bombolles buides
            if exercise_type == "speaking3":
                data["type"] = "speaking3"
                if "questions" in data and len(data["questions"]) > 0:
                    # La IA sovint posa els camps nous dins de la primera "pregunta"
                    # Els hem de rescatar i posar-los a dalt de tot del JSON
                    q_data = data["questions"][0]
                    if "part3_central_question" in q_data:
                        data["part3_central_question"] = q_data["part3_central_question"]
                    if "part3_prompts" in q_data:
                        data["part3_prompts"] = q_data["part3_prompts"]
                    if "part3_decision_question" in q_data:
                        data["part3_decision_question"] = q_data["part3_decision_question"]
                    if "part4_questions" in q_data:
                        data["part4_questions"] = q_data["part4_questions"]
                
                # Eliminem el text per defecte que confon
                if data.get("text") == "Full text content...":
                    data["text"] = ""

            class GenericExercise:
                def __init__(self, data):
                    self.data = data
                def model_dump(self):
                    return self.data
            
            return GenericExercise(data)

        except json.JSONDecodeError:
            raise ValueError("Failed to decode AI response")