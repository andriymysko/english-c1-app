from .base import ExerciseGenerator

class Speaking3Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating a C1 Advanced 'Speaking' (Parts 3 & 4) script.
        Generate ONE script covering BOTH parts in JSON format.

        Requirements:
        1. Define a central Theme (e.g., "Student life", "Modern communication").
        2. PART 3 (Collaborative Task):
           - Define a Central Question (e.g. "How do these aspects affect...?").
           - List 5 Prompts (the points usually found in the spidergram).
           - Define the Decision Question (e.g. "Which is the most important?").
        3. PART 4 (Discussion):
           - Generate 5 broad discussion questions related to the Part 3 theme.

        Output JSON structure:
        {{
            "type": "speaking3",
            "title": "Speaking Parts 3 & 4: Collaborative Task & Discussion",
            "instructions": "Part 3: Talk to each other about the question below. Part 4: Discuss the broader questions.",
            "text": "PART 3: COLLABORATIVE TASK\\n\\nHere are some things about [Theme] and a question for you to discuss.\\n\\nCENTRAL QUESTION:\\nHow might these aspects affect [Theme]?\\n\\nPROMPTS (Imagine these in a circle):\\n- Cost\\n- Time\\n- Health\\n- Social Life\\n- Career\\n\\nDECISION QUESTION:\\nNow you have about a minute to decide which aspect is the most significant.\\n\\n-----------------------------------\\n\\nPART 4: DISCUSSION\\n- Do you think people worry too much about [Theme]?\\n- How has [Theme] changed in the last generation?\\n- Some people say that... Do you agree?",
            "questions": []
        }}
        """