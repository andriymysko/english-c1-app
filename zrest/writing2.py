from .base import ExerciseGenerator

class Writing2Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating a C1 Advanced 'Writing' (Part 2) task.
        Generate ONE exercise containing THREE distinct choices (Tasks 2, 3, and 4).

        Requirements:
        1. Task 2 must be a REVIEW (e.g., film, book, product).
        2. Task 3 must be a PROPOSAL (e.g., to a local council or boss).
        3. Task 4 must be a REPORT (e.g., about a work experience or event).
        4. For each task, provide a clear situation and what points must be included.

        Output JSON structure:
        {{
            "type": "writing2",
            "title": "Writing Part 2: Choose One",
            "instructions": "Write an answer to one of the questions 2-4 in this part. Write your answer in 220-260 words in an appropriate style.",
            "text": "TASK 2: REVIEW\\nYou see this announcement in an international magazine... Write your review.\\n\\n-----------------------------------\\n\\nTASK 3: PROPOSAL\\nYour college is planning to... Write your proposal.\\n\\n-----------------------------------\\n\\nTASK 4: REPORT\\nYou have just completed a training course... Write your report.",
            "questions": []
        }}
        """