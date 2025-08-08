import React, { useEffect, useRef, useState } from 'react';
import { Upload, AlertCircle, File } from 'lucide-react';
import { useAdobePDFNavigation } from '../hooks/useAdobePDFNavigation';

interface PDFViewerProps {
  pdfFile: File | null;
  pdfUrl: string | null;
  pdfFileName: string;
  isAdobeLoaded: boolean;
  onFileUpload: () => void;
  navigationPage?: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfFile,
  pdfUrl,
  pdfFileName,
  isAdobeLoaded,
  onFileUpload,
  navigationPage
}) => {
  const [pdfViewer, setPdfViewer] = useState<any>(null);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const pdfViewerRef = useRef<HTMLDivElement>(null);
  const lastNavigationPageRef = useRef<number | undefined>(undefined);
  
  // Use the custom navigation hook
const { navigateToPage } = useAdobePDFNavigation({
    pdfViewer,
    containerRef: pdfViewerRef
});

  useEffect(() => {
    if (isAdobeLoaded && pdfUrl && pdfFileName) {
      // Force re-initialize viewer by creating a new AdobeDC.View instance
      if (pdfViewerRef.current) {
        pdfViewerRef.current.innerHTML = '';
      }
      setPdfViewer(null);
      setIsViewerReady(false);
      setTimeout(() => {
        initializePDFViewer();
      }, 100);
    }
    // eslint-disable-next-line
  }, [isAdobeLoaded, pdfUrl, pdfFileName]);

  // Handle page navigation using the custom hook
  useEffect(() => {
    // Only navigate if:
    // 1. We have a viewer
    // 2. NavigationPage is defined and >= 0
    // 3. It's different from the last navigation (avoid duplicate navigations)
    if (
      pdfViewer && 
      isViewerReady && 
      navigationPage !== undefined && 
      navigationPage >= 0 && 
      navigationPage !== lastNavigationPageRef.current
    ) {
      console.log(`PDFViewer: Received navigation request to page ${navigationPage + 1}`);
      lastNavigationPageRef.current = navigationPage;
      
      // Small delay to ensure the viewer is fully ready
      setTimeout(() => {
        navigateToPage(navigationPage);
      }, 100);
    }
  }, [pdfViewer, isViewerReady, navigationPage, navigateToPage]);

  const initializePDFViewer = () => {
    if (!window.AdobeDC || !pdfViewerRef.current) return;

    console.log('Initializing Adobe PDF Viewer...');
    
    // Clear previous viewer
    if (pdfViewer) {
      pdfViewerRef.current.innerHTML = '';
      setIsViewerReady(false);
    }

    const adobeDCView = new window.AdobeDC.View({
      clientId: import.meta.env.VITE_ADOBE_API_KEY,
      divId: "adobe-dc-view"
    });

    const previewConfig = {
      embedMode: "FULL_WINDOW",
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
      defaultViewMode: "FIT_WIDTH", // fit heights
      showDisabledSaveButton: false,
      exitPDFViewerType: "CLOSE"
    };

    adobeDCView.previewFile({
      content: { location: { url: pdfUrl } },
      metaData: { fileName: pdfFileName }
    }, previewConfig);

    // Listen for viewer ready state
    try {
      adobeDCView.registerCallback(
        window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
        (event: any) => {
          console.log('Adobe Viewer Event:', event.type);
          if (event.type === "APP_RENDERING_DONE" || event.type === "DOCUMENT_OPEN") {
            console.log('Adobe PDF Viewer is ready for navigation');
            setIsViewerReady(true);
          }
        }
      );
    } catch (error) {
      console.warn('Could not register viewer events, assuming ready after delay', error);
      // Fallback: assume ready after a delay
      setTimeout(() => setIsViewerReady(true), 2000);
    }

    // Set up the viewer for navigation
    setPdfViewer(adobeDCView);
  };

  // Reset navigation tracking when PDF changes
  useEffect(() => {
    lastNavigationPageRef.current = undefined;
    // Don't set isViewerReady here, let initializePDFViewer handle it
  }, [pdfFile]);

  return (
    <div className="flex-1 overflow-hidden">
      {pdfFile ? (
        <div className="w-full h-full relative">
          <div 
            id="adobe-dc-view"
            ref={pdfViewerRef}
            className="w-full h-full"
            style={{ 
              height: 'calc(93vh - 32px)', 
              minHeight: '600px', 
              borderRadius: '16px', 
              boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)', 
              overflow: 'hidden', 
              display: 'flex', 
              alignItems: 'stretch' 
            }}
          />
          {!isViewerReady && pdfViewer && (
            <div className="absolute top-4 right-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm">
              Preparing navigation...
            </div>
          )}
        </div>
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