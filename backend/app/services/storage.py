# app/services/storage.py

import requests
from firebase_admin import storage
import uuid

class StorageService:
    @staticmethod
    def save_image_from_url(temp_url: str, folder: str = "generated_exercises") -> str:
        """
        Descarrega una imatge d'una URL temporal (OpenAI) i la puja a Firebase Storage.
        Retorna la URL pública permanent.
        """
        try:
            print(f"📥 Descarregant imatge de: {temp_url[:30]}...")
            
            # 1. Descarregar d'OpenAI
            response = requests.get(temp_url)
            if response.status_code != 200:
                print(f"❌ Error descarregant imatge: Status {response.status_code}")
                return temp_url # Fallback: Retornem la temporal si falla
            
            image_data = response.content
            
            # 2. Generar nom únic
            filename = f"{folder}/{uuid.uuid4()}.png"
            
            # 3. Pujar a Firebase
            bucket = storage.bucket()
            blob = bucket.blob(filename)
            blob.upload_from_string(image_data, content_type="image/png")
            
            # 4. Fer pública
            blob.make_public()
            
            print(f"✅ Imatge guardada permanentment a: {blob.public_url}")
            return blob.public_url

        except Exception as e:
            print(f"❌ Error crític al StorageService: {e}")
            return temp_url