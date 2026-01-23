import os
import stripe
from fastapi import APIRouter, HTTPException, Request, Header
from app.services.db import DatabaseService # <--- IMPORTANT: Importem el servei que acabes de modificar
from dotenv import load_dotenv

load_dotenv()

payment_router = APIRouter()

# CONFIGURACIÓ STRIPE
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# En producció fes servir la teva URL de Vercel. En local, localhost.
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://english-c1-app.vercel.app") 

@payment_router.post("/create-checkout-session/")
async def create_checkout_session(data: dict):
    user_id = data.get("user_id")
    product_type = data.get("product_type") # Ara esperem rebre quin producte vol

    if not user_id or not product_type:
        raise HTTPException(status_code=400, detail="Missing user_id or product_type")

    # --- DEFINICIÓ DE PREUS ---
    products = {
        'weekly': {
            'name': '1 Week Pass',
            'amount': 349, # 3.49€
            'desc': '7 Days Unlimited Access'
        },
        'season': {
            'name': 'Season Pass (3 Months)',
            'amount': 2999, # 29.99€
            'desc': '90 Days Access + 15 Premium Corrections'
        },
        'pack5': {
            'name': '5 Corrections Pack',
            'amount': 499, # 4.99€
            'desc': '5 Professional Writing/Speaking corrections'
        }
    }

    selected = products.get(product_type)
    if not selected:
        raise HTTPException(status_code=400, detail="Invalid product type")

    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'eur',
                    'product_data': {
                        'name': selected['name'],
                        'description': selected['desc'],
                    },
                    'unit_amount': selected['amount'],
                },
                'quantity': 1,
            }],
            mode='payment', 
            success_url=f'{FRONTEND_URL}/?success=true',
            cancel_url=f'{FRONTEND_URL}/?canceled=true',
            # ⚠️ CLAU: Passem el TIPUS de producte a les metadades
            metadata={
                "user_id": user_id,
                "product_type": product_type 
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
        
        # Recuperem dades de les metadades
        user_id = session.get("metadata", {}).get("user_id")
        product_type = session.get("metadata", {}).get("product_type")
        
        if user_id and product_type:
            print(f"💰 PAGAMENT REBUT: {product_type} per l'usuari {user_id}")
            
            # --- LÒGICA DE RECOMPENSA SEGONS PRODUCTE ---
            if product_type == 'weekly':
                # 7 dies, 0 crèdits extra
                DatabaseService.grant_vip_access(user_id, days=7, correction_credits=0)
            
            elif product_type == 'season':
                # 90 dies, 15 crèdits
                DatabaseService.grant_vip_access(user_id, days=90, correction_credits=15)
            
            elif product_type == 'pack5':
                # Només crèdits (no dona temps VIP)
                DatabaseService.add_credits_only(user_id, 5)

    return {"status": "success"}