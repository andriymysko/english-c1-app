from .base import ExerciseGenerator

class Speaking1Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating a C1 Advanced 'Speaking' (Part 1 - Interview) script.
        Generate ONE script in JSON format.

        Requirements:
        1. Include an "Introduction" phase (What is your name? Where are you from?).
        2. Select TWO distinct topics (e.g., "Travel", "Work", "Media", "Environment").
        3. For each topic, provide 3-4 interesting questions suitable for C1 level discussions.

        Output JSON structure:
        {{
            "type": "speaking1",
            "title": "Speaking Part 1: Interview",
            "instructions": "The interlocutor asks you some questions about yourself, your home, work or studies and other familiar topics.",
            "text": "Phase 1: Introduction\\n- What is your name?\\n- How long have you been studying English?\\n\\nPhase 2: Topic - Travel\\n- Do you prefer traveling alone or with friends?\\n- What is the most memorable place you have visited?\\n- How do you think travel changes people?\\n\\nPhase 3: Topic - Technology\\n- How has technology changed the way you study?\\n- Do you think we rely too much on computers?",
            "questions": []
        }}
        """