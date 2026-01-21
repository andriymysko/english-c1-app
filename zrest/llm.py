from openai import OpenAI
import json
from app.core.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def get_completion(prompt: str) -> dict:
    """
    Envia un prompt a OpenAI i retorna un diccionari (JSON parsed).
    """
    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that outputs JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            response_format={ "type": "json_object" } # Força JSON vàlid
        )
        
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"Error calling OpenAI: {e}")
        raise e