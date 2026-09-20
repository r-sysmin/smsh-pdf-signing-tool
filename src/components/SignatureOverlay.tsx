import React, { useState } from 'react';
import Draggable from 'react-draggable';
import { Button } from '@/components/ui/button';

interface SignatureOverlayProps {
  signature: string;
  onPlaceSignature: (x: number, y: number, pageNumber: number, width?: number, height?: number) => void;
  onCancel: () => void;
  pageNumber: number;
  containerRef: React.RefObject<HTMLDivElement>;
}

const SignatureOverlay = ({ 
  signature, 
  onPlaceSignature, 
  onCancel, 
  pageNumber,
  containerRef 
}: SignatureOverlayProps) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [signatureSize, setSignatureSize] = useState({ width: 180, height: 90 });
  const [isResizing, setIsResizing] = useState(false);

  // Size the signature to its real aspect ratio once the image loads
  React.useEffect(() => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0) {
        const aspect = img.naturalHeight / img.naturalWidth;
        setSignatureSize({ width: 180, height: Math.max(24, Math.round(180 * aspect)) });
      }
    };
    img.src = signature;
  }, [signature]);

  // Auto-scroll helpers
  const rafRef = React.useRef<number | null>(null);
  const lastTsRef = React.useRef<number | null>(null);
  const mouseYRef = React.useRef<number>(0);
  const scrollDirRef = React.useRef<number>(0);
  // Ref for react-draggable (avoids findDOMNode and satisfies its types)
  const nodeRef = React.useRef<HTMLDivElement>(null);

  const handleDrag = (e: any, data: { x: number; y: number }) => {
    if (isResizing) return; // Don't move while resizing
    setPosition({ x: data.x, y: data.y });
    
    // Auto-scroll when near viewport edges
    const mouseY = e.clientY;
    const viewportHeight = window.innerHeight;
    const scrollThreshold = 100; // pixels from edge to trigger scroll
    const scrollSpeed = 8;
    
    // Store mouse position for smooth scrolling
    mouseYRef.current = mouseY;
    
    // Determine scroll direction
    let newDir = 0;
    if (mouseY < scrollThreshold) newDir = -1;
    else if (mouseY > viewportHeight - scrollThreshold) newDir = 1;
    
    scrollDirRef.current = newDir;
    
    // Start smooth scrolling if needed
    if (newDir !== 0 && !rafRef.current) {
      lastTsRef.current = null;
      
      const smoothScroll = (timestamp: number) => {
        if (!isDragging || scrollDirRef.current === 0) {
          rafRef.current = null;
          return;
        }
        
        if (!lastTsRef.current) lastTsRef.current = timestamp;
        const deltaTime = timestamp - lastTsRef.current;
        lastTsRef.current = timestamp;
        
        const scrollAmount = (scrollSpeed * deltaTime) / 16; // normalize to 60fps
        window.scrollBy(0, scrollDirRef.current * scrollAmount);
        
        rafRef.current = requestAnimationFrame(smoothScroll);
      };
      
      rafRef.current = requestAnimationFrame(smoothScroll);
    }
    
    // Stop scrolling if direction changed to none
    if (newDir === 0 && rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const handlePlaceSignature = () => {
    // Clear any active auto-scrolling
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTsRef.current = null;
    scrollDirRef.current = 0;
    onPlaceSignature(position.x, position.y, pageNumber, signatureSize.width, signatureSize.height);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = signatureSize.width;
    const startHeight = signatureSize.height;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      // Maintain aspect ratio
      const aspectRatio = startHeight / startWidth;
      const newWidth = Math.max(64, Math.min(400, startWidth + deltaX));
      const newHeight = newWidth * aspectRatio;
      
      setSignatureSize({ width: newWidth, height: newHeight });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragStop = () => {
    setIsDragging(false);
    // Clear auto-scroll when dragging stops
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTsRef.current = null;
    scrollDirRef.current = 0;
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      {/* Overlay backdrop */}
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" />
      
      {/* Draggable signature with buttons */}
      <Draggable
        nodeRef={nodeRef}
        bounds="parent"
        position={position}
        onDrag={handleDrag}
        onStart={handleDragStart}
        onStop={handleDragStop}
      >
        <div className="absolute pointer-events-auto" ref={nodeRef}>
          <div className="relative cursor-move">
            <img 
              src={signature} 
              alt="Signature preview" 
              style={{ width: signatureSize.width, height: signatureSize.height }}
              className={`object-contain border-2 border-dashed border-primary bg-white/90 rounded-lg shadow-lg transition-all ${
                isDragging ? 'scale-105 shadow-xl' : 'hover:shadow-lg'
              }`}
              draggable={false}
            />
            
            {/* Resize handle */}
            <div
              className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary border-2 border-white rounded-full cursor-se-resize shadow-md hover:scale-110 transition-transform"
              onMouseDown={handleResizeStart}
              style={{ pointerEvents: 'auto' }}
            />
          </div>
          
          {/* Control buttons positioned below signature */}
          <div className="flex gap-2 mt-2 justify-center">
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="bg-white/95 backdrop-blur-sm text-xs px-3 py-1 h-8"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePlaceSignature}
              className="bg-primary/95 backdrop-blur-sm hover:bg-primary text-xs px-3 py-1 h-8"
            >
              Place
            </Button>
          </div>
        </div>
      </Draggable>

      {/* Instructions */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md">
          <p className="text-sm text-gray-700 font-medium">
            Drag to position • Drag corner to resize • Click "Place" when ready
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignatureOverlay;