import requests
from firebase_admin import storage
import uuid

# 👇 DEFINEIX EL TEU BUCKET AQUÍ DIRECTAMENT
BUCKET_NAME = "english-c1-app.firebasestorage.app"

class StorageService:
    @staticmethod
    def save_image_from_url(temp_url: str, folder: str = "generated_exercises") -> str:
        """
        Descarrega una imatge d'una URL temporal i la puja a Firebase Storage.
        """
        print(f"🔵 STORAGE: Iniciant procés de guardat per a: {temp_url[:30]}...")
        
        try:
            # 1. Descarregar
            response = requests.get(temp_url, timeout=30)
            if response.status_code != 200:
                print(f"❌ STORAGE ERROR: No s'ha pogut descarregar ({response.status_code})")
                return temp_url
            
            image_data = response.content
            print(f"📦 Imatge descarregada ({len(image_data)} bytes). Pujant a Firebase...")

            # 2. Nom únic
            filename = f"{folder}/{uuid.uuid4()}.png"
            
            # 3. Pujar a Firebase (AMB EL NOM EXPLÍCIT DEL BUCKET)
            # 👇 AQUI ESTÀ LA CLAU DE LA SOLUCIÓ
            bucket = storage.bucket(name=BUCKET_NAME) 
            blob = bucket.blob(filename)
            blob.upload_from_string(image_data, content_type="image/png")
            
            # 4. Fer pública
            blob.make_public()
            
            public_url = blob.public_url
            print(f"✅ STORAGE SUCCESS: Imatge disponible a: {public_url}")
            return public_url

        except Exception as e:
            print(f"❌ CRITICAL STORAGE FAILURE: {str(e)}")
            return temp_url