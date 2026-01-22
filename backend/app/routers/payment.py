import os
import stripe
from fastapi import APIRouter, HTTPException, Request, Header
from firebase_admin import firestore
from dotenv import load_dotenv

load_dotenv()

payment_router = APIRouter()
db = firestore.client()

# CONFIGURACIÓ STRIPE
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET") # T'explico com trobar-ho després
FRONTEND_URL = "https://english-c1-app.vercel.app"  # Canvia-ho per localhost si proves en local

@payment_router.post("/create-checkout-session/")
async def create_checkout_session(data: dict):
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id")

    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'eur',
                    'product_data': {
                        'name': 'C1 Master - Season Pass',
                        'description': 'Unlimited access & Premium corrections',
                    },
                    'unit_amount': 1999,  # 19.99€ (en cèntims)
                },
                'quantity': 1,
            }],
            mode='payment', # Pagament únic (si fos subscripció seria 'subscription')
            success_url=f'{FRONTEND_URL}/profile?success=true',
            cancel_url=f'{FRONTEND_URL}/profile?canceled=true',
            # ⚠️ CLAU: Passem l'ID de l'usuari a les metadades per saber qui ha pagat després
            metadata={
                "user_id": user_id
            }
        )
        return {"url": checkout_session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@payment_router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """Stripe crida això automàticament quan algú paga"""
    payload = await request.body()
    event = None

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, WEBHOOK_SECRET
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # SI EL PAGAMENT HA ANAT BÉ:
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Recuperem qui ha pagat
        user_id = session.get("metadata", {}).get("user_id")
        
        if user_id:
            print(f"💰 PAGAMENT REBUT! Usuari: {user_id}")
            # ACTUALITZEM FIREBASE A VIP
            user_ref = db.collection("users").document(user_id)
            user_ref.set({
                "is_vip": True,
                "vip_since": firestore.SERVER_TIMESTAMP,
                # També li regalem crèdits de correcció extra
                "correction_credits": 5 
            }, merge=True)
            print("✅ Usuari actualitzat a VIP.")

    return {"status": "success"}