import React, { useEffect, useRef, useState } from 'react';
import { Upload, AlertCircle, File } from 'lucide-react';

interface PDFViewerProps {
  pdfFile: File | null;
  pdfUrl: string | null;
  pdfFileName: string;
  isAdobeLoaded: boolean;
  onFileUpload: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfFile,
  pdfUrl,
  pdfFileName,
  isAdobeLoaded,
  onFileUpload
}) => {
  const [pdfViewer, setPdfViewer] = useState<any>(null);
  const pdfViewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAdobeLoaded && pdfUrl && pdfFileName) {
      initializePDFViewer();
    }
  }, [isAdobeLoaded, pdfUrl, pdfFileName]);

  const initializePDFViewer = () => {
    if (!window.AdobeDC || !pdfViewerRef.current) return;

    // Clear previous viewer
    if (pdfViewer) {
      pdfViewerRef.current.innerHTML = '';
    }

    const adobeDCView = new window.AdobeDC.View({
      clientId: import.meta.env.VITE_ADOBE_API_KEY,
      divId: "adobe-dc-view"
    });

    adobeDCView.previewFile({
      content: { location: { url: pdfUrl } },
      metaData: { fileName: pdfFileName }
    }, {
      embedMode: "SIZED_CONTAINER",
      showAnnotationTools: true,
      showLeftHandPanel: true,
      showBookmarks: true,
      showThumbnails: true,
      showDownloadPDF: true,
      showPrintPDF: true,
      showZoomControl: true,
      showPageControls: true,
      showSearchControl: true,
      enableFormFilling: true,
      enableRedaction: false,
      defaultViewMode: "FIT_PAGE",
      showDisabledSaveButton: false,
      exitPDFViewerType: "CLOSE"
    });

    setPdfViewer(adobeDCView);
  };

  return (
    <div className="flex-1 overflow-hidden">
      {pdfFile ? (
        <div 
          id="adobe-dc-view"
          ref={pdfViewerRef}
          className="w-full h-full"
        />
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center">
            <File size={64} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No PDF Loaded</h3>
            <p className="text-gray-500 mb-6">Upload a PDF file to start viewing and analyzing</p>
            <button
              onClick={onFileUpload}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Upload size={20} className="mr-2" />
              Choose PDF File
            </button>
            {!isAdobeLoaded && (
              <div className="mt-4 flex items-center justify-center text-yellow-600">
                <AlertCircle size={16} className="mr-1" />
                <span className="text-sm">Loading Adobe PDF viewer...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;