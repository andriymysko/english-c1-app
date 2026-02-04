import { useEffect, useRef } from 'react';

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

interface AdBannerProps {
    dataAdSlot: string;
    dataAdClient?: string; // Opcional, perquè ja tenim un default
    format?: string;
    responsive?: string;
    style?: React.CSSProperties;
    className?: string; // Per poder passar classes de Tailwind des de fora
}

export default function AdBanner({ 
    dataAdSlot, 
    dataAdClient = "ca-pub-6220801511844436", // El teu ID per defecte
    format = "auto", 
    responsive = "true",
    style,
    className = ""
}: AdBannerProps) {
    const adRef = useRef<HTMLModElement>(null);
    
    // Detectem si estem en mode desenvolupament (localhost)
    const isDev = import.meta.env.DEV; 

    useEffect(() => {
        // Si estem en local, no intentem carregar l'script real per no generar errors
        if (isDev) return;

        try {
            if (adRef.current && !adRef.current.querySelector('iframe')) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) {
            console.error("AdSense error", e);
        }
    }, [isDev]);

    // ---------------------------------------------------------
    // RENDERITZAT CONDICIONAL
    // ---------------------------------------------------------

    // 1. Mode Desenvolupament: Mostrem un requadre gris per veure l'espai
    if (isDev) {
        return (
            <div 
                className={`w-full flex flex-col justify-center items-center my-8 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-400 font-mono text-xs text-center select-none ${className}`}
                style={{ ...style, minHeight: '250px' }}
            >
                <span className="font-bold text-lg mb-2">GOOGLE AD SPACE</span>
                <span>Client: {dataAdClient}</span>
                <span>Slot: {dataAdSlot || "PENDING-CREATION"}</span>
                <span className="mt-2 italic">(Visible only in localhost)</span>
            </div>
        );
    }

    // 2. Mode Producció: Mostrem l'anunci real
    return (
        <div className={`w-full flex justify-center my-8 overflow-hidden ${className}`}>
            <ins 
                className="adsbygoogle"
                style={style || { display: "block", width: "100%" }}
                data-ad-client={dataAdClient}
                data-ad-slot={dataAdSlot}
                data-ad-format={format}
                data-ad-full-width-responsive={responsive}
                ref={adRef}
            ></ins>
        </div>
    );
}