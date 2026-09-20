
import React, { useRef, useState, useEffect } from 'react';

interface SignatureCanvasProps {
  onSignatureCreated: (signature: string) => void;
}

const SignatureCanvas = ({ onSignatureCreated }: SignatureCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const maxHistorySize = 10;

  // Save canvas state to history before starting a new drawing stroke
  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const currentState = canvas.toDataURL();
    const newHistory = [...canvasHistory.slice(0, historyIndex + 1), currentState];
    
    // Limit history size
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
      setCanvasHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } else {
      setCanvasHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Save current canvas state before starting to draw
    saveCanvasState();

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    setIsDrawing(true);
    setLastX((e.clientX - rect.left) * scaleX);
    setLastY((e.clientY - rect.top) * scaleY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    setLastX(x);
    setLastY(y);
    setHasDrawn(true);
  };

  // Crop the canvas down to the drawn strokes (plus a little padding) so the
  // signature has no transparent dead space around it.
  const getTrimmedSignature = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] !== 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null; // nothing drawn

    const pad = 4;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;

    const trimmed = document.createElement('canvas');
    trimmed.width = w;
    trimmed.height = h;
    trimmed.getContext('2d')?.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
    return trimmed.toDataURL();
  };

  const endDrawing = () => {
    if (isDrawing && hasDrawn && canvasRef.current) {
      const trimmed = getTrimmedSignature();
      if (trimmed) {
        onSignatureCreated(trimmed);
      }
    }
    setIsDrawing(false);
  };

  const undoLastAction = () => {
    if (historyIndex < 0 || canvasHistory.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Restore the state at current historyIndex
    if (historyIndex >= 0) {
      const stateToRestore = canvasHistory[historyIndex];
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = stateToRestore;
      setHasDrawn(true);
    } else {
      setHasDrawn(false);
    }
    
    setHistoryIndex(historyIndex - 1);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    // Reset history when clearing
    setCanvasHistory([]);
    setHistoryIndex(-1);
  };

  // Load signature from session storage if available
  useEffect(() => {
    const savedSignature = sessionStorage.getItem('signature');
    if (savedSignature && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          setHasDrawn(true);
        };
        img.src = savedSignature;
      }
    }
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="text-sm font-medium text-gray-700 mb-3">
        Draw your signature
      </div>
      <div className="w-full max-w-sm">
        <canvas
          ref={canvasRef}
          width={280}
          height={120}
          className="w-full border rounded cursor-crosshair bg-gray-50 block"
          style={{ maxWidth: '280px', height: '120px' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseOut={endDrawing}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={undoLastAction}
          disabled={historyIndex < 0}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Undo
        </button>
        <button
          onClick={clearCanvas}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors border rounded hover:bg-gray-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default SignatureCanvas;
