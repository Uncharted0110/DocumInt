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
  const [view, setView] = useState<any>(null);
  const [viewer, setViewer] = useState<any>(null);
  const [apis, setApis] = useState<any>(null);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const pdfViewerRef = useRef<HTMLDivElement>(null);
  const lastNavigationPageRef = useRef<number | undefined>(undefined);

  // Use the custom navigation hook; provide a docVersion so internal state resets when pdfUrl changes
  const { navigateToPage } = useAdobePDFNavigation({
    view,
    viewer,
    apis,
    containerRef: pdfViewerRef,
    docVersion: pdfUrl || pdfFileName // fallback to name if url not yet ready
  });

  // Extract text and analyze with Gemini whenever pdfUrl changes
  // useEffect(() => {
  //   if (pdfUrl) {
  //     extractAndAnalyzePDF(pdfUrl);
  //   }
  // }, [pdfUrl]);

  // Consider the viewer ready as soon as APIs are available (unblocks UI banner)
  useEffect(() => {
    if (apis && !isViewerReady) setIsViewerReady(true);
  }, [apis, isViewerReady]);

  useEffect(() => {
    if (isAdobeLoaded && pdfUrl && pdfFileName) {
      if (pdfViewerRef.current) {
        pdfViewerRef.current.innerHTML = '';
      }
      setView(null);
      setViewer(null);
      setApis(null);
      setIsViewerReady(false);
      setTimeout(() => {
        initializePDFViewer();
      }, 100);
    }
    // eslint-disable-next-line
  }, [isAdobeLoaded, pdfUrl, pdfFileName]);

  // Handle page navigation using the custom hook
  useEffect(() => {
    if (
      viewer &&
      navigationPage !== undefined &&
      navigationPage >= 0 &&
      navigationPage !== lastNavigationPageRef.current
    ) {
      console.log(`PDFViewer: Received navigation request to page ${navigationPage + 1}`);
      lastNavigationPageRef.current = navigationPage;
      // Call immediately; hook will queue if not ready yet
      navigateToPage(navigationPage);
    }
  }, [viewer, navigationPage, navigateToPage]);

  const initializePDFViewer = () => {
    if (!window.AdobeDC || !pdfViewerRef.current) return;

    console.log('Initializing Adobe PDF Viewer...');

    if (view) {
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
      defaultViewMode: "FIT_WIDTH", 
      showDisabledSaveButton: false,
      exitPDFViewerType: "CLOSE"
    } as const;

    setView(adobeDCView);

    // Register events on View
    try {
      const CallbackType = (window as any)?.AdobeDC?.View?.Enum?.CallbackType;
      if (CallbackType?.EVENT_LISTENER) {
        adobeDCView.registerCallback(
          CallbackType.EVENT_LISTENER,
          (event: any) => {
            console.log('Adobe Viewer Event:', event.type);
            if (
              event.type === 'APP_RENDERING_DONE' ||
              event.type === 'DOCUMENT_OPEN' ||
              event.type === 'FIRST_AJS_PAGE_RENDERED' ||
              event.type === 'PDF_VIEWER_OPEN' ||
              event.type === 'APP_RENDERING_START' ||
              event.type === 'PDF_VIEWER_READY'
            ) {
              setIsViewerReady(true);
            }
          },
          { enablePDFAnalytics: false }
        );
      }

      // Stub feature-flag queries
      if (CallbackType?.GET_FEATURE_FLAG) {
        adobeDCView.registerCallback(
          CallbackType.GET_FEATURE_FLAG,
          (_flagName: string) => false
        );
      }
    } catch (error) {
      console.warn('Could not register viewer events, assuming ready after delay', error);
      setTimeout(() => setIsViewerReady(true), 2000);
    }

    // previewFile returns a promise that resolves with a viewer instance
    adobeDCView
      .previewFile({
        content: { location: { url: pdfUrl } },
        metaData: { fileName: pdfFileName }
      }, previewConfig)
      .then((theViewer: any) => {
        setViewer(theViewer);
        // Attempt to get APIs immediately
        try {
          const getter = theViewer?.getAPIs;
          if (typeof getter === 'function') {
            getter.call(theViewer)
              .then((vApis: any) => {
                setApis(vApis);
                setIsViewerReady(true); // mark ready when APIs available
              })
              .catch(() => { /* ignore */ });
          }
        } catch { /* ignore */ }
      })
      .catch((e: any) => {
        console.error('previewFile failed:', e);
      });
  };

  useEffect(() => {
    lastNavigationPageRef.current = undefined;
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
              height: 'calc(100vh)',
              minHeight: '600px',
              borderRadius: '16px',
              boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'stretch'
            }}
          />
          {!isViewerReady && viewer && (
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