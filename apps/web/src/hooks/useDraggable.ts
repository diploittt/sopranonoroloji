'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Taşınabilir modal hook'u. Header'dan sürükleyerek modalı hareket ettirir.
 * transform: translate(x, y) kullanır — modalın mevcut CSS pozisyonunu bozmaz.
 * 
 * Kullanım:
 *   const { offset, handleMouseDown, isDragging } = useDraggable();
 * 
 *   <div style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
 *     <div onMouseDown={handleMouseDown} style={{ cursor: 'grab' }}>  ← Header
 *       ...
 *     </div>
 *   </div>
 */
export function useDraggable() {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragging = useRef(false);
    const startMouse = useRef({ x: 0, y: 0 });
    const startOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Input, button, select gibi elementlerde sürüklemeyi engelle
        const target = e.target as HTMLElement;
        if (target.closest('button, input, select, textarea, a, [role="button"]')) return;

        dragging.current = true;
        startMouse.current = { x: e.clientX, y: e.clientY };
        startOffset.current = { ...offset };
        e.preventDefault();
    }, [offset]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging.current) return;
            setOffset({
                x: startOffset.current.x + (e.clientX - startMouse.current.x),
                y: startOffset.current.y + (e.clientY - startMouse.current.y),
            });
        };
        const onUp = () => { dragging.current = false; };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    const reset = useCallback(() => setOffset({ x: 0, y: 0 }), []);

    return { offset, handleMouseDown, reset, isDragging: dragging };
}
