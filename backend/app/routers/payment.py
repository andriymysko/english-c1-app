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
    """
    Pas 1: El frontend demana pagar. Nosaltres creem la sessió a Stripe.
    """
    user_id = data.get("user_id")
    product_type = data.get("product_type") # ex: 'season'

    if not user_id or not product_type:
        raise HTTPException(status_code=400, detail="Missing data")

    selected_product = PRODUCTS_DB.get(product_type)
    if not selected_product:
        raise HTTPException(status_code=400, detail="Invalid product type")

    try:
        print(f"🛒 Creant sessió per: {user_id} -> {product_type}")
        
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'eur',
                    'product_data': {
                        'name': selected_product['name'],
                        'description': selected_product['desc'],
                    },
                    'unit_amount': selected_product['amount'],
                },
                'quantity': 1,
            }],
            mode='payment', 
            success_url=f'{FRONTEND_URL}/?success=true',
            cancel_url=f'{FRONTEND_URL}/?canceled=true',
            
            # ⚠️ VITAL: Aquí guardem qui compra què, perquè el Webhook ho sàpiga després
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
    """
    Pas 2: Stripe ens avisa (en segon pla) que el pagament s'ha fet.
    Aquí és on realment donem el VIP.
    """
    payload = await request.body()
    event = None

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # SI EL PAGAMENT S'HA COMPLETAT AMB ÈXIT ✅
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # 1. Recuperem les metadades que hem posat abans
        user_id = session.get("metadata", {}).get("user_id")
        product_type = session.get("metadata", {}).get("product_type")
        
        print(f"🔔 WEBHOOK REBUT: {product_type} pagat per {user_id}")

        if user_id and product_type:
            product_info = PRODUCTS_DB.get(product_type)
            
            if product_info:
                # CAS A: VIP (Temps + Crèdits)
                if product_info['vip_days'] > 0:
                    DatabaseService.grant_vip_access(
                        user_id=user_id, 
                        days=product_info['vip_days'], 
                        correction_credits=product_info['credits']
                    )
                    print(f"✅ DB ACTUALITZADA: VIP concedit a {user_id}")
                
                # CAS B: NOMÉS CRÈDITS (Pack suelto)
                else:
                    DatabaseService.add_credits_only(
                        user_id=user_id, 
                        credits=product_info['credits']
                    )
                    print(f"✅ DB ACTUALITZADA: Crèdits afegits a {user_id}")
            else:
                print(f"⚠️ Producte desconegut al Webhook: {product_type}")

    return {"status": "success"}