import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import UploadZone from '@/components/UploadZone';
import PDFViewer from '@/components/PDFViewer';
import SignatureCanvas from '@/components/SignatureCanvas';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LucidePenLine, LucideDownload, LucideUserCheck } from 'lucide-react';

// Positions and sizes are stored in PDF points (1pt = 1px at viewer scale 1)
// so the downloaded PDF matches the on-screen preview at any zoom level.
interface PlacedSignature {
  x: number;
  y: number;
  pageNumber: number;
  signature: string;
  width?: number;
  height?: number;
}

const Index = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [placedSignatures, setPlacedSignatures] = useState<PlacedSignature[]>([]);

  // Load saved PDF file from sessionStorage
  useEffect(() => {
    const savedSignature = sessionStorage.getItem('signature');
    if (savedSignature) {
      setSignature(savedSignature);
    }

    // Get the stored PDF data
    const storedPdfData = sessionStorage.getItem('pdfData');
    if (storedPdfData) {
      try {
        const {
          name,
          type,
          data
        } = JSON.parse(storedPdfData);
        const blob = new Blob([Uint8Array.from(atob(data), c => c.charCodeAt(0))], {
          type
        });
        const file = new File([blob], name, {
          type
        });
        setPdfFile(file);
        const newUrl = URL.createObjectURL(blob);
        setPdfUrl(newUrl);
      } catch (error) {
        console.error('Error restoring PDF:', error);
      }
    }
  }, []);

  // Save PDF data to sessionStorage
  useEffect(() => {
    if (pdfFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = (reader.result as string).split(',')[1];
        const pdfData = {
          name: pdfFile.name,
          type: pdfFile.type,
          data: base64Data
        };
        sessionStorage.setItem('pdfData', JSON.stringify(pdfData));
      };
      reader.readAsDataURL(pdfFile);
    }
    if (signature) {
      sessionStorage.setItem('signature', signature);
    }
  }, [pdfFile, signature]);
  const handleFileSelected = (file: File) => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setPdfFile(file);
    const newUrl = URL.createObjectURL(file);
    setPdfUrl(newUrl);
    toast.success('PDF uploaded successfully');
  };
  const handleSignatureCreated = (signatureData: string) => {
    setSignature(signatureData);
    sessionStorage.setItem('signature', signatureData);
    toast.success('Signature created');
  };
  const handleSignaturePlacement = (pageNumber: number, x: number, y: number, width?: number, height?: number) => {
    if (!signature) return;
    
    const newPlacedSignature: PlacedSignature = {
      x,
      y,
      pageNumber,
      signature,
      width: width || 128,
      height: height || 64
    };
    
    setPlacedSignatures(prev => [...prev, newPlacedSignature]);
    toast.success('Signature placed! Click "Download Signed PDF" to save.');
  };

  const handleDownloadSignedPdf = async () => {
    if (!pdfFile || placedSignatures.length === 0) return;

    try {
      const existingPdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();

      for (const placedSig of placedSignatures) {
        const page = pages[placedSig.pageNumber - 1];
        if (!page) continue;
        const signatureImage = await pdfDoc.embedPng(placedSig.signature);

        // Coordinates are already in PDF points, matching the preview
        const finalWidth = placedSig.width || 128;
        const finalHeight = placedSig.height || 64;

        page.drawImage(signatureImage, {
          x: placedSig.x,
          y: page.getHeight() - placedSig.y - finalHeight,
          width: finalWidth,
          height: finalHeight
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const baseName = pdfFile.name.replace(/\.pdf$/i, '') || 'document';
      link.href = url;
      link.download = `${baseName}-signed.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('PDF signed and downloaded');
    } catch (error) {
      console.error('Error signing PDF:', error);
      toast.error('Error signing PDF');
    }
  };

  const handleClearSignatures = () => {
    setPlacedSignatures([]);
    toast.success('All signatures cleared');
  };

  const handleUndoLastSignature = () => {
    setPlacedSignatures(prev => prev.slice(0, -1));
    toast.success('Last signature removed');
  };

  const handleDownloadOriginalPdf = () => {
    if (!pdfFile) return;
    
    const url = URL.createObjectURL(pdfFile);
    const link = document.createElement('a');
    link.href = url;
    link.download = pdfFile.name || 'document.pdf';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Original PDF downloaded');
  };

  return <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 py-16 max-w-6xl"> {/* Increased top padding from py-12 to py-16 */}
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-12">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl font-bold text-gray-900 mb-4 pt-4 py-[17px]">
                PDF Signature Tool
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Upload, view, and sign your PDF documents with ease
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 md:gap-4 mb-8">
                <div className="flex items-center gap-2 text-gray-600">
                  <LucideUserCheck className="w-5 h-5 text-gray-900" />
                  <span>No sign-in required</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <LucidePenLine className="w-5 h-5 text-gray-900" />
                  <span>Draw or type signatures</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <LucideDownload className="w-5 h-5 text-gray-900" />
                  <span>Instant download</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <svg
                className="w-full h-auto max-w-md text-gray-800"
                viewBox="0 0 900 700"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Main PDF Document */}
                <rect 
                  x="200" 
                  y="150" 
                  width="300" 
                  height="400" 
                  stroke="currentColor" 
                  strokeWidth="3" 
                  fill="white"
                  rx="8"
                />
                
                {/* PDF Header */}
                <rect x="220" y="170" width="60" height="20" fill="currentColor" rx="2" />
                <text x="250" y="185" textAnchor="middle" className="fill-white text-xs" style={{fontSize: '12px'}}>PDF</text>
                
                {/* Document content lines */}
                <rect x="220" y="210" width="200" height="3" fill="currentColor" opacity="0.3" />
                <rect x="220" y="230" width="180" height="3" fill="currentColor" opacity="0.3" />
                <rect x="220" y="250" width="220" height="3" fill="currentColor" opacity="0.3" />
                <rect x="220" y="270" width="160" height="3" fill="currentColor" opacity="0.3" />
                <rect x="220" y="290" width="190" height="3" fill="currentColor" opacity="0.3" />
                
                {/* Signature field */}
                <rect 
                  x="220" 
                  y="350" 
                  width="180" 
                  height="60" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none"
                  strokeDasharray="8,4"
                  rx="4"
                />
                <text x="310" y="375" textAnchor="middle" className="fill-current text-sm opacity-50" style={{fontSize: '14px'}}>Signature</text>
                
                {/* Hand-drawn signature */}
                <path 
                  d="M240 395 Q260 385 280 395 Q300 405 320 395 Q340 385 360 395" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  fill="none"
                  opacity="0.8"
                />
                
                {/* Date field */}
                <rect x="220" y="430" width="80" height="25" stroke="currentColor" strokeWidth="1" fill="none" rx="2" />
                <text x="230" y="445" className="fill-current text-xs opacity-60" style={{fontSize: '10px'}}>Date</text>
                <text x="260" y="448" className="fill-current text-xs" style={{fontSize: '11px'}}>12/25/24</text>
                
                {/* Digital stylus/pen */}
                <g transform="translate(580, 300)">
                  <rect x="0" y="0" width="8" height="80" fill="currentColor" rx="4" />
                  <rect x="-2" y="70" width="12" height="15" fill="currentColor" rx="2" />
                  <circle cx="4" cy="85" r="3" fill="currentColor" />
                  <line x1="4" y1="88" x2="4" y2="100" stroke="currentColor" strokeWidth="1" />
                </g>
                
                {/* Upload arrow and cloud */}
                <g transform="translate(150, 80)">
                  <path 
                    d="M20 30 Q10 20 20 10 Q30 0 40 10 Q50 20 40 30 L35 30 L35 50 L25 50 L25 30 Z" 
                    fill="currentColor"
                    opacity="0.6"
                  />
                  <ellipse cx="30" cy="15" rx="25" ry="8" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.4" />
                </g>
                
                {/* Download arrow */}
                <g transform="translate(650, 480)">
                  <path 
                    d="M20 0 L25 0 L25 20 L35 20 L20 35 L5 20 L15 20 L15 0 Z" 
                    fill="currentColor"
                    opacity="0.6"
                  />
                  <rect x="5" y="40" width="30" height="3" fill="currentColor" opacity="0.4" />
                </g>
                
                {/* Form checkboxes */}
                <g transform="translate(520, 200)">
                  <rect x="0" y="0" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M3 7 L6 10 L12 4" stroke="currentColor" strokeWidth="2" fill="none" />
                  
                  <rect x="0" y="25" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" />
                  <rect x="0" y="50" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" />
                  
                  <rect x="25" y="2" width="60" height="2" fill="currentColor" opacity="0.4" />
                  <rect x="25" y="27" width="45" height="2" fill="currentColor" opacity="0.4" />
                  <rect x="25" y="52" width="55" height="2" fill="currentColor" opacity="0.4" />
                </g>
                
                {/* Security/lock icon */}
                <g transform="translate(100, 300)">
                  <rect x="0" y="15" width="25" height="20" stroke="currentColor" strokeWidth="2" fill="none" rx="2" />
                  <path d="M5 15 L5 10 Q5 5 12.5 5 Q20 5 20 10 L20 15" stroke="currentColor" strokeWidth="2" fill="none" />
                  <circle cx="12.5" cy="22" r="2" fill="currentColor" />
                </g>
                
                {/* Digital certificate badge */}
                <g transform="translate(680, 200)">
                  <circle cx="15" cy="15" r="15" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M8 15 L12 19 L22 9" stroke="currentColor" strokeWidth="2.5" fill="none" />
                  <text x="15" y="45" textAnchor="middle" className="fill-current text-xs opacity-60" style={{fontSize: '10px'}}>Verified</text>
                </g>
                
                {/* Document stack effect */}
                <rect 
                  x="190" 
                  y="140" 
                  width="300" 
                  height="400" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="white"
                  rx="8"
                  opacity="0.5"
                />
                <rect 
                  x="180" 
                  y="130" 
                  width="300" 
                  height="400" 
                  stroke="currentColor" 
                  strokeWidth="1" 
                  fill="white"
                  rx="8"
                  opacity="0.3"
                />
                
                {/* Connection lines showing workflow */}
                <path 
                  d="M180 100 Q200 120 220 200" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none"
                  opacity="0.3"
                  strokeDasharray="5,5"
                />
                
                <path 
                  d="M580 320 Q560 340 520 380" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none"
                  opacity="0.3"
                  strokeDasharray="5,5"
                />
                
                <path 
                  d="M500 400 Q600 450 650 500" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none"
                  opacity="0.3"
                  strokeDasharray="5,5"
                />
                
                {/* Background grid - subtle */}
                <defs>
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path 
                      d="M 30 0 L 0 0 0 30" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="0.5"
                      opacity="0.05"
                    />
                  </pattern>
                </defs>
                <rect width="900" height="700" fill="url(#grid)" />
                
                {/* Decorative dots around the composition */}
                <circle cx="120" cy="120" r="3" fill="currentColor" opacity="0.3" />
                <circle cx="750" cy="150" r="2" fill="currentColor" opacity="0.4" />
                <circle cx="150" cy="600" r="2.5" fill="currentColor" opacity="0.3" />
                <circle cx="800" cy="600" r="3" fill="currentColor" opacity="0.2" />
              </svg>
            </div>
          </div>
        </div>

        {!pdfFile && !pdfUrl ? <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <div className="grid gap-6 mb-6">
                <UploadZone onFileSelected={handleFileSelected} />
                <div className="text-center text-sm text-gray-500">
                  Your files stay private - we never store your documents
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="text-gray-900 mb-4">
                  <LucideUserCheck className="w-8 h-8 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Free & Private</h3>
                <p className="text-gray-600 text-sm">
                  No registration or payment required. Your documents remain private.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="text-gray-900 mb-4">
                  <LucidePenLine className="w-8 h-8 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Easy Signing</h3>
                <p className="text-gray-600 text-sm">
                  Draw or type your signature and place it anywhere on your document.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="text-gray-900 mb-4">
                  <LucideDownload className="w-8 h-8 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Instant Download</h3>
                <p className="text-gray-600 text-sm">
                  Download your signed PDF immediately - no waiting or processing time.
                </p>
              </div>
            </div>
          </div> : <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <PDFViewer 
                file={pdfUrl || ''} 
                signature={signature}
                onSignaturePlace={handleSignaturePlacement}
                placedSignatures={placedSignatures}
              />
            </div>
            <div className="space-y-4">
              <SignatureCanvas onSignatureCreated={handleSignatureCreated} />
              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Instructions</h3>
                <ol className="text-sm text-gray-600 space-y-3 list-decimal list-inside">
                  <li>Draw your signature in the canvas above</li>
                  <li>Click "Add Signature" button on the PDF viewer</li>
                  <li>Drag the signature to position it anywhere you want</li>
                  <li>Click "Place Signature" to add it to the preview</li>
                  <li>Repeat to add more signatures if needed</li>
                  <li>Click "Download Signed PDF" to save your document</li>
                </ol>
              </div>
              
              <div className="space-y-3">
                {placedSignatures.length > 0 ? (
                  <>
                    <Button 
                      onClick={handleDownloadSignedPdf}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <LucideDownload className="w-4 h-4 mr-2" />
                      Download Signed PDF
                    </Button>
                    <Button 
                      onClick={handleUndoLastSignature}
                      variant="outline"
                      className="w-full"
                    >
                      Undo Last Signature
                    </Button>
                    <Button 
                      onClick={handleClearSignatures}
                      variant="outline"
                      className="w-full"
                    >
                      Clear All Signatures ({placedSignatures.length})
                    </Button>
                    <Button 
                      onClick={handleDownloadOriginalPdf}
                      variant="outline"
                      className="w-full"
                    >
                      <LucideDownload className="w-4 h-4 mr-2" />
                      Download Original PDF
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={handleDownloadOriginalPdf}
                    variant="outline"
                    className="w-full"
                  >
                    <LucideDownload className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                )}
              </div>
              <button onClick={() => {
            setPdfFile(null);
            setPdfUrl(null);
            setSignature(null);
            setPlacedSignatures([]);
            sessionStorage.removeItem('pdfData');
            sessionStorage.removeItem('signature');
            if (pdfUrl) {
              URL.revokeObjectURL(pdfUrl);
            }
          }} className="w-full px-4 py-2 text-sm text-black hover:text-black bg-white border rounded-lg transition-colors hover:bg-gray-50 shadow-sm">
                Upload New PDF
              </button>
            </div>
          </div>}
      </div>
    </div>;
};
export default Index;