from .base import ExerciseGenerator

class Speaking2Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating a C1 Advanced 'Speaking' (Part 2 - Long Turn) task.
        Generate ONE task in JSON format.

        Requirements:
        1. Choose a Topic (e.g., "Helping others", "Coping with stress").
        2. Define TWO questions the candidate must answer about the pictures (e.g., "Why might the people be doing this?", "How difficult might it be?").
        3. Describe THREE distinct pictures (A, B, C) related to the topic.
        4. Include a "Candidate B" question (short question for the other candidate).

        Output JSON structure:
        {{
            "type": "speaking2",
            "title": "Speaking Part 2: Long Turn",
            "instructions": "In this part, I'm going to give you three pictures. I'd like you to talk about two of them on your own for about a minute, and also to answer a question about your partner's pictures.",
            "text": "TOPIC: ACHIEVING A GOAL\\n\\nLook at the pictures. They show people trying to achieve a goal.\\n\\nCANDIDATE A:\\nI'd like you to compare two of the pictures and say:\\n1. Why might the people be doing these activities?\\n2. How might they be feeling?\\n\\n[PICTURE A: A marathon runner crossing the finish line, looking exhausted but happy]\\n\\n[PICTURE B: A student graduating university, throwing their hat in the air]\\n\\n[PICTURE C: A musician learning a difficult piece on the piano]\\n\\n-----------------------------------\\n\\nCANDIDATE B:\\nWhich of these achievements do you think requires the most effort?",
            "questions": []
        }}
        """