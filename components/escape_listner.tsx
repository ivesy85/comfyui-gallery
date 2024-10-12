'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EscapeListener() {
    const router = useRouter();

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                router.back(); // Go back in browser history when Escape is pressed
            }
        };

        document.addEventListener('keydown', handleEsc);

        return () => {
            document.removeEventListener('keydown', handleEsc);
        };
    }, [router]);

    return null; // This component doesn't render anything visually
}
