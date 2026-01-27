import { useEffect, useRef } from 'react';

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

interface AdBannerProps {
    dataAdSlot: string;
    dataAdClient: string;
    format?: string;
    responsive?: string;
    style?: React.CSSProperties;
}

export default function AdBanner({ 
    dataAdSlot, 
    dataAdClient, 
    format = "auto", 
    responsive = "true",
    style 
}: AdBannerProps) {
    // CORRECCIÓ: Canviem HTMLDivElement per HTMLModElement (el tipus correcte per a <ins>)
    const adRef = useRef<HTMLModElement>(null);

    useEffect(() => {
        try {
            // Comprovem si l'anunci ja té un iframe a dins per no recarregar-lo
            if (adRef.current && !adRef.current.querySelector('iframe')) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) {
            console.error("AdSense error", e);
        }
    }, []);

    return (
        <div className="w-full flex justify-center my-4 overflow-hidden">
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