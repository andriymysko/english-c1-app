import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from openai import OpenAI
from dotenv import load_dotenv

# 1. Carreguem variables d'entorn (API KEY)
load_dotenv()

# 2. Configurar Firebase Admin
# ⚠️ ASSEGURA'T QUE TENS EL FITXER 'serviceAccountKey.json' A LA MATEIXA CARPETA
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
        print("✅ Firebase connectat correctament.")
    except Exception as e:
        print(f"❌ Error connectant a Firebase: {e}")
        print("💡 Recorda baixar la clau privada des de la consola de Firebase!")
        exit()

db = firestore.client()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- LLISTA COMPLETA DE PARTS DEL C1 ---
EXERCISE_TYPES = [
    # READING & USE OF ENGLISH
    "reading_and_use_of_language1", # Multiple Choice Cloze
    "reading_and_use_of_language2", # Open Cloze
    "reading_and_use_of_language3", # Word Formation
    "reading_and_use_of_language4", # Key Word Transformation
    "reading_and_use_of_language5", # Multiple Choice (Long text)
    "reading_and_use_of_language6", # Cross-Text Matching
    "reading_and_use_of_language7", # Gapped Text
    "reading_and_use_of_language8", # Multiple Matching

    # WRITING (Generarà prompts/enunciats)
    "writing1", # Essay
    "writing2", # Proposal, Report, Review...

    # LISTENING (Generarà transcripció + preguntes)
    "listening1", # Multiple Choice
    "listening2", # Sentence Completion
    "listening3", # Interview
    "listening4", # Multiple Matching

    # SPEAKING (Generarà preguntes/enunciats)
    "speaking1", # Interview questions
    "speaking2", # Long turn (descripcions d'imatges)
    "speaking3"  # Collaborative task
]

def generate_and_save(ex_type):
    print(f"🤖 Generant 1x {ex_type}...")
    
    # Prompt específic per assegurar que Listening té 'transcript' i Writing té 'instructions'
    prompt = f"""
    Generate a valid JSON object for a Cambridge C1 Advanced {ex_type} exercise.
    
    Structure requirements:
    - For Reading: Include 'text', 'questions', 'options' (if applicable), 'answers'.
    - For Listening: Include a 'transcript' (the text of the audio), 'questions', 'options', 'answers'.
    - For Writing: Include 'title', 'task_text' (instructions), 'type' (essay/report/etc).
    - For Speaking: Include 'questions' for Part 1, or 'task_text' for Parts 2/3.
    
    Output ONLY raw JSON. No markdown formatting.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini", # Fem servir el model ràpid i barat
            messages=[
                {"role": "system", "content": "You are a Cambridge C1 exam content generator. Output strictly JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        
        # Neteja de markdown si la IA posa ```json ... ```
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        data = json.loads(content)
        
        # Camps de control per a la nostra DB
        data['type'] = ex_type
        data['level'] = 'C1'
        data['is_pregenerated'] = True
        data['created_at'] = firestore.SERVER_TIMESTAMP
        
        # Guardar a Firebase
        db.collection('exercises').add(data)
        print(f"   ✨ Guardat!")
        
    except json.JSONDecodeError:
        print(f"   ⚠️ Error: La IA no ha generat un JSON vàlid per {ex_type}.")
    except Exception as e:
        print(f"   ❌ Error inesperat: {e}")

# EXECUTAR L'SCRIPT
if __name__ == "__main__":
    print("🚀 Començant la sembra massiva d'exercicis...")
    print(f"📋 Total de tipus: {len(EXERCISE_TYPES)}")
    
    # Canvia aquest número si en vols més o menys de cada
    QUANTITY_PER_TYPE = 3 
    
    for type_name in EXERCISE_TYPES:
        print(f"\n--- {type_name.upper()} ---")
        for i in range(QUANTITY_PER_TYPE):
            generate_and_save(type_name)
            
    print("\n🏁 Procés finalitzat! La teva base de dades està plena.")