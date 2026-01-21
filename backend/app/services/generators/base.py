from abc import ABC, abstractmethod

class ExerciseGenerator(ABC):
    """
    Classe abstracta base molt simple.
    Serveix només per definir que els generadors han de tenir un mètode.
    NO depèn de cap llibreria externa (ni llm, ni openai).
    """
    
    @abstractmethod
    def create_exercise(self, exercise_type: str, level: str):
        pass