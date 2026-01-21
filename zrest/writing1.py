from .base import ExerciseGenerator

class Writing1Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating a C1 Advanced 'Writing' (Part 1 - Essay) task.
        Generate ONE task in JSON format.

        Requirements:
        1. Define a Topic (e.g., Environment, Education, Work).
        2. Create a specific context: "Your class has attended a panel discussion about..." or "You have watched a documentary about...".
        3. Provide an "Essay Question": "Write an essay explaining which factor is more important...".
        4. Provide "Notes" with 3 points:
           - Point 1 (defined by you)
           - Point 2 (defined by you)
           - Point 3 (must always be "your own idea")

        Output JSON structure:
        {{
            "type": "writing1",
            "title": "Writing Part 1: Essay",
            "instructions": "You must answer this question. Write your answer in 220-260 words in an appropriate style.",
            "text": "Your class has attended a panel discussion on methods for... \\n\\nESSAY QUESTION:\\nWhich method is more effective? Write an essay discussing two of the points in your notes.\\n\\nNOTES:\\nWrite about:\\n1. Cost\\n2. Convenience\\n3. ....... (your own idea)",
            "questions": [] 
        }}
        """