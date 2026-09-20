
import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import SignatureOverlay from './SignatureOverlay';
import { Button } from '@/components/ui/button';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PlacedSignature {
  x: number;
  y: number;
  pageNumber: number;
  signature: string;
  width?: number;      
  height?: number;     
}

interface PDFViewerProps {
  file: string | File;
  signature: string | null;
  onSignaturePlace: (pageNumber: number, x: number, y: number, width?: number, height?: number) => void;
  placedSignatures: PlacedSignature[];
}

const PDFViewer = ({ file, signature, onSignaturePlace, placedSignatures }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState(1);
  const [scale, setScale] = useState(1);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayPageNumber, setOverlayPageNumber] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerContentRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleAddSignature = () => {
    if (signature) {
      setShowOverlay(true);
      setOverlayPageNumber(1); // Default to first page
    }
  };

  const handleOverlayPlacement = (x: number, y: number, pageNumber: number, width?: number, height?: number) => {
    const SIG_W = width || 128;
    const SIG_H = height || 64;

    const overlayElement = viewerContentRef.current;
    if (!overlayElement) {
      const pxToPt = (v: number) => v / scale;
      onSignaturePlace(pageNumber, pxToPt(x), pxToPt(y), pxToPt(SIG_W), pxToPt(SIG_H));
      setShowOverlay(false);
      return;
    }

    const overlayRect = overlayElement.getBoundingClientRect();
    // Absolute position of the signature's center in the viewport
    const absX = overlayRect.left + x + SIG_W / 2;
    const absY = overlayRect.top + y + SIG_H / 2;

    // Find which page the signature center is currently over
    let targetIndex = -1;
    for (let i = 0; i < pageRefs.current.length; i++) {
      const el = pageRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (absY >= r.top && absY <= r.bottom) {
        targetIndex = i;
        break;
      }
    }

    // If not directly over a page (edge cases), pick the nearest page by Y
    if (targetIndex === -1) {
      let nearestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < pageRefs.current.length; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const d = Math.min(Math.abs(absY - r.top), Math.abs(absY - r.bottom));
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }
      targetIndex = nearestIdx;
    }

    const pageElement = pageRefs.current[targetIndex];
    if (pageElement) {
      const pageRect = pageElement.getBoundingClientRect();
      // Convert overlay coordinates to page-relative coordinates
      const xInPage = x - (pageRect.left - overlayRect.left);
      const yInPage = y - (pageRect.top - overlayRect.top);

      // Clamp coordinates to page bounds
      const clampedX = Math.max(0, Math.min(xInPage, pageRect.width - SIG_W));
      const clampedY = Math.max(0, Math.min(yInPage, pageRect.height - SIG_H));

      // Store positions in PDF points (1pt = 1px at scale 1) so the saved PDF
      // matches the preview regardless of the current zoom level.
      const pxToPt = (v: number) => v / scale;
      onSignaturePlace(
        targetIndex + 1,
        pxToPt(clampedX),
        pxToPt(clampedY),
        pxToPt(SIG_W),
        pxToPt(SIG_H)
      );
    } else {
      // Fallback
      const pxToPt = (v: number) => v / scale;
      onSignaturePlace(pageNumber, pxToPt(x), pxToPt(y), pxToPt(SIG_W), pxToPt(SIG_H));
    }

    setShowOverlay(false);
  };

  const handleCancelOverlay = () => {
    setShowOverlay(false);
  };

  return (
    <div className="pdf-viewer w-full overflow-auto bg-gray-100 rounded-lg p-4" ref={containerRef}>
      <div className="controls mb-4 flex gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setScale(scale => Math.max(0.5, scale - 0.1))}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-sm text-gray-600">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(scale => Math.min(2, scale + 0.1))}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        {signature && (
          <Button 
            onClick={handleAddSignature}
            disabled={showOverlay}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Signature
          </Button>
        )}
      </div>
      
      <div className="relative" ref={viewerContentRef}>
        <Document
          file={file}
          onLoadSuccess={({ numPages }) => {
            setNumPages(numPages);
            pageRefs.current = new Array(numPages).fill(null);
          }}
          className="flex flex-col items-center"
        >
          {Array.from(new Array(numPages), (_, index) => (
            <div
              key={`page_${index + 1}`}
              className="mb-4 shadow-lg relative"
              ref={(el) => pageRefs.current[index] = el}
            >
              <Page
                pageNumber={index + 1}
                scale={scale}
                className="bg-white"
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
              
              {/* Render placed signatures for this page (positions stored in PDF points) */}
              {placedSignatures
                .filter(sig => sig.pageNumber === index + 1)
                .map((placedSig, sigIndex) => (
                  <div
                    key={`placed-sig-${index + 1}-${sigIndex}`}
                    className="absolute pointer-events-none z-10"
                    style={{
                      left: `${placedSig.x * scale}px`,
                      top: `${placedSig.y * scale}px`,
                    }}
                  >
                    <img
                      src={placedSig.signature}
                      alt="Placed signature"
                      style={{
                        width: (placedSig.width || 128) * scale,
                        height: (placedSig.height || 64) * scale
                      }}
                      className="object-contain"
                    />
                  </div>
                ))}
            </div>
          ))}
        </Document>

        {showOverlay && signature && (
          <SignatureOverlay
            signature={signature}
            onPlaceSignature={handleOverlayPlacement}
            onCancel={handleCancelOverlay}
            pageNumber={overlayPageNumber}
            containerRef={containerRef}
          />
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
