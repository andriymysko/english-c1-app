import os
import stripe
from fastapi import APIRouter, HTTPException, Request, Header
# ⚠️ ASSEGURA'T QUE LA RUTA D'IMPORTACIÓ ÉS CORRECTA (depèn de la teva estructura de carpetes)
# Si db.py està a la mateixa carpeta, fes: from .db import DatabaseService
# Si està a app/services/db.py, fes:
from app.services.db import DatabaseService 
from dotenv import load_dotenv

load_dotenv()

payment_router = APIRouter()

# 1. CONFIGURACIÓ
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173") # Canvia a la URL de Vercel en producció

# 2. DEFINICIÓ DE PRODUCTES (El teu catàleg)
PRODUCTS_DB = {
    'weekly': {
        'name': '1 Week Pass',
        'amount': 349, # 3.49€
        'desc': '7 Days Unlimited Access',
        'vip_days': 7,
        'credits': 0
    },
    'season': {
        'name': 'Season Pass (3 Months)',
        'amount': 2999, # 29.99€
        'desc': '90 Days Access + 15 Premium Corrections',
        'vip_days': 90,
        'credits': 15
    },
    'pack5': {
        'name': '5 Corrections Pack',
        'amount': 499, # 4.99€
        'desc': '5 Professional Writing/Speaking corrections',
        'vip_days': 0,
        'credits': 5
    }
}

@payment_router.post("/create-checkout-session/")
async def create_checkout_session(data: dict):
    user_id = data.get("user_id")
    product_type = data.get("product_type")

    if not user_id or not product_type:
        raise HTTPException(status_code=400, detail="Missing data")

    selected_product = PRODUCTS_DB.get(product_type)
    if not selected_product:
        raise HTTPException(status_code=400, detail="Invalid product type")

    try:
        # 1. DECIDIM EL MODE (Subscripció o Pagament únic)
        # Si és el Pack de 5, és un pagament únic ('payment').
        # Si és Weekly o Season, volem que es renovi ('subscription').
        mode = 'payment'
        recurring_info = {}
        
        if product_type == 'weekly':
            mode = 'subscription'
            recurring_info = {'interval': 'week', 'interval_count': 1}
        elif product_type == 'season':
            mode = 'subscription'
            recurring_info = {'interval': 'month', 'interval_count': 3}

        # Construïm les dades del preu
        price_data = {
            'currency': 'eur',
            'product_data': {
                'name': selected_product['name'],
                'description': selected_product['desc'],
            },
            'unit_amount': selected_product['amount'],
        }

        # Si és subscripció, afegim la info de recurrència
        if mode == 'subscription':
            price_data['recurring'] = recurring_info

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': price_data,
                'quantity': 1,
            }],
            mode=mode, # 👈 AQUÍ ESTÀ LA MÀGIA (Ara pot ser 'subscription')
            allow_promotion_codes=True,
            
            # 2. ARREGLEM LA REDIRECCIÓ (Landing Page)
            # Afegim /profile al final perquè torni directament al perfil de l'usuari
            success_url=f'{FRONTEND_URL}/profile?success=true', # 👈 Canviat
            cancel_url=f'{FRONTEND_URL}/profile?canceled=true', # 👈 Canviat
            
            metadata={
                "user_id": user_id,
                "product_type": product_type 
            }
        )
        return {"url": checkout_session.url}
    except Exception as e:
        print(f"❌ Error Stripe: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@payment_router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()
    event = None

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, WEBHOOK_SECRET
        )
    except ValueError:
        return {"status": "invalid payload"} # Silenciós per no alertar a Stripe
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # LOG DE L'EVENT
    print(f"📨 Event rebut: {event['type']}")

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # --- BLOC DE DIAGNÒSTIC EXTREM ---
        print("📦 Dades de la sessió (resum):")
        print(f"   - ID: {session.get('id')}")
        print(f"   - Metadata Directa: {session.get('metadata')}")
        # ----------------------------------

        # 1. INTENTEM LLEGIR METADATA DIRECTAMENT
        metadata = session.get("metadata", {})
        
        user_id = metadata.get("user_id")
        product_type = metadata.get("product_type")

        # 2. SI FALLA, ESTRATÈGIA DE RESCAT (Opcional, per si Stripe fa coses rares)
        if not user_id or not product_type:
            print("⚠️ Metadata buida! Intentant recuperar-la del Payment Intent...")
            # Aquí podries fer una crida extra a Stripe si calgués, però 
            # normalment si 'metadata' és buit és que no s'ha enviat bé al crear la sessió.

        print(f"🕵️ DADES RECUPERADES -> User: {user_id} | Product: {product_type}")

        if user_id and product_type:
            # Busquem el producte al teu diccionari
            product_info = PRODUCTS_DB.get(product_type)
            
            if product_info:
                print(f"🚀 Aplicant millora: {product_info['name']}")
                
                if product_info['vip_days'] > 0:
                    DatabaseService.grant_vip_access(
                        user_id=user_id, 
                        days=product_info['vip_days'], 
                        correction_credits=product_info['credits']
                    )
                    print(f"✅ ÉXIT TOTAL: VIP activat per a {user_id}")
                else:
                    DatabaseService.add_credits_only(
                        user_id=user_id, 
                        credits=product_info['credits']
                    )
            else:
                print(f"❌ ERROR: Tipus de producte '{product_type}' no existeix a PRODUCTS_DB")
        else:
            print("❌ ERROR FATAL: Falta user_id o product_type a les metadades.")

    return {"status": "success"}