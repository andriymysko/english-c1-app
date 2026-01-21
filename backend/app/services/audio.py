from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class AudioService:
    @staticmethod
    def generate_audio(text: str):
        """
        Converteix text a àudio MP3 usant OpenAI TTS-1.
        Retorna els bytes de l'àudio.
        """
        try:
            response = client.audio.speech.create(
                model="tts-1",
                voice="alloy", # Opcions: alloy, echo, fable, onyx, nova, shimmer
                input=text
            )
            return response.content
        except Exception as e:
            print(f"Error generating audio: {e}")
            raise e