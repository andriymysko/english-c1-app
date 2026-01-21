from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ImageService:
    @staticmethod
    def generate_image(description: str) -> str:
        """
        Genera una imatge amb DALL-E 3 basada en la descripció.
        Retorna la URL de la imatge.
        """
        try:
            print(f"🎨 Pintant imatge: {description[:30]}...")
            response = client.images.generate(
                model="dall-e-3",
                prompt=f"Realistic photo for a Cambridge English exam task. Scene: {description}. Clear, neutral lighting, photorealistic style.",
                size="1024x1024",
                quality="standard",
                n=1,
            )
            return response.data[0].url
        except Exception as e:
            print(f"⚠️ Error generant imatge: {e}")
            # Retornem una imatge placeholder per si falla (o per estalviar diners)
            return "https://via.placeholder.com/1024x1024.png?text=Image+Generation+Error"