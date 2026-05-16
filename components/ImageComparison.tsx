import React, { useState, useRef, useCallback, MouseEvent, TouchEvent, useEffect } from 'react';

interface ImageComparisonProps {
  beforeSrc: string;
  afterSrc: string;
}

const ImageComparison: React.FC<ImageComparisonProps> = ({ beforeSrc, afterSrc }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  }, []);

  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (isDragging) {
        handleMove(e.clientX);
    }
  }, [isDragging, handleMove]);

  const handleTouchMove = useCallback((e: globalThis.TouchEvent) => {
    if (isDragging) {
        handleMove(e.touches[0].clientX);
    }
  }, [isDragging, handleMove]);

  const handleInteractionStart = () => setIsDragging(true);
  const handleInteractionEnd = useCallback(() => setIsDragging(false), []);


  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('touchend', handleInteractionEnd);

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('mouseup', handleInteractionEnd);
        window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [handleMouseMove, handleTouchMove, handleInteractionEnd]);


  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square md:aspect-[4/3] max-w-3xl mx-auto overflow-hidden rounded-lg shadow-2xl select-none group border-2 border-gray-700"
      onMouseDown={handleInteractionStart}
      onTouchStart={handleInteractionStart}
    >
      <img 
        src={beforeSrc} 
        alt="Original" 
        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none" 
        draggable="false"
      />
      <div
        className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img 
            src={afterSrc} 
            alt="Enhanced" 
            className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
            draggable="false"
        />
      </div>
      <div
        className="absolute top-0 h-full w-1.5 bg-white/75 backdrop-blur-sm cursor-ew-resize"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 cursor-ew-resize">
          <svg className="w-8 h-8 text-gray-900 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ImageComparison;
