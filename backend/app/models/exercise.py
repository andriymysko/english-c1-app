from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Union

class Option(BaseModel):
    text: str
    label: Optional[str] = None  # Per A, B, C, D...

class Question(BaseModel):
    question: str  # El número de la pregunta o ID
    stem: Optional[str] = None # El text de la pregunta (per parts 5-8)
    text: Optional[str] = None # Per compatibilitat
    options: List[Option] = Field(default_factory=list)
    answer: Optional[str] = None
    answer_type: Literal["multiple_choice", "short_answer", "essay"] = "short_answer"
    
    # Camps específics per altres parts (Part 3 i 4)
    keyword: Optional[str] = None 
    original_sentence: Optional[str] = None
    second_sentence: Optional[str] = None

class Exercise(BaseModel):
    type: str
    title: str = "C1 Advanced Exercise"
    instructions: str
    text: Optional[str] = None # El text principal o stimulus
    questions: List[Question] = Field(default_factory=list)
    hints: List[str] = Field(default_factory=list)