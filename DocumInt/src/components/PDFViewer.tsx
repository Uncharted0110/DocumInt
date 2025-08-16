import React, { useEffect, useRef, useState } from 'react';
import { Upload, AlertCircle, File } from 'lucide-react';
import { useAdobePDFNavigation } from '../hooks/useAdobePDFNavigation';
import { getInsightsForText, getInsightsForRegion } from '../hooks/geminiService'

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

  // Inline insights state
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightText, setInsightText] = useState<string>("");
  const [showManualInsights, setShowManualInsights] = useState(false);
  const [manualText, setManualText] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [regionMode, setRegionMode] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragRect, setDragRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Extract text and analyze with Gemini whenever pdfUrl changes
  // useEffect(() => {
  //   if (pdfUrl) {
  //     extractAndAnalyzePDF(pdfUrl);
  //   }
  // }, [pdfUrl]);

  // Use the custom navigation hook
  const { navigateToPage } = useAdobePDFNavigation({
    view,
    viewer,
    apis,
    containerRef: pdfViewerRef,
    onTextSelected: (text) => {
      setSelectedText((text || '').trim());
      // Reset insight view to allow immediate use
      setInsightText("");
    },
    onTextCleared: () => {
      setSelectedText("");
    }
  });

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
  // Reset inline insights
  setSelectionRect(null);
  setSelectedText("");
  setInsightText("");
  setInsightLoading(false);
  setRegionMode(false);
  setDragStart(null);
  setDragRect(null);
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

        // Attach selection listeners within the viewer iframe to capture text selections
        try {
          const container = pdfViewerRef.current!;
          // The Adobe viewer renders inside an iframe under our div; poll briefly to hook events
          const tryHook = () => {
            const iframe = container.querySelector('iframe') as HTMLIFrameElement | null;
            if (!iframe || !iframe.contentWindow || !iframe.contentDocument) {
              setTimeout(tryHook, 300);
              return;
            }
            const doc = iframe.contentDocument;

            // Clear previous to avoid duplicate handlers
            doc.removeEventListener('mouseup', handleMouseUp as any, true);
            doc.addEventListener('mouseup', handleMouseUp as any, true);

            // Also hide when clicking elsewhere
            doc.removeEventListener('mousedown', handleMouseDownHide as any, true);
            doc.addEventListener('mousedown', handleMouseDownHide as any, true);
          };
          tryHook();
        } catch {}
      })
      .catch((e: any) => {
        console.error('previewFile failed:', e);
      });
  };

  // Hide overlay on new click
  const handleMouseDownHide = () => {
    setSelectionRect(null);
  };

  // On mouse up, capture selection
  const handleMouseUp = () => {
    try {
      // Selection is in iframe; get selection from the iframe's window
      const iframe = pdfViewerRef.current?.querySelector('iframe') as HTMLIFrameElement | null;
      if (!iframe || !iframe.contentWindow || !iframe.contentDocument) return;
      const sel = iframe.contentWindow.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (!text) return;

      // Compute bounding rect relative to our container
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const iframeRect = iframe.getBoundingClientRect();
      const containerRect = pdfViewerRef.current!.getBoundingClientRect();
      const x = rect.left - iframeRect.left + (iframeRect.left - containerRect.left);
      const y = rect.top - iframeRect.top + (iframeRect.top - containerRect.top);

      setSelectedText(text);
      setInsightText("");
      setInsightLoading(false);
      setSelectionRect({ x, y, width: rect.width, height: rect.height });
    } catch {}
  };

  // Helper: read current selection from iframe and compute rect
  const readSelectionFromIframe = (): { text: string; rect: { x: number; y: number; width: number; height: number } } | null => {
    try {
      const iframe = pdfViewerRef.current?.querySelector('iframe') as HTMLIFrameElement | null;
      if (!iframe || !iframe.contentWindow || !iframe.contentDocument) return null;
      const sel = iframe.contentWindow.getSelection();
      if (!sel || sel.isCollapsed) return null;
      const text = sel.toString().trim();
      if (!text) return null;
      const range = sel.getRangeAt(0);
      const r = range.getBoundingClientRect();
      const iframeRect = iframe.getBoundingClientRect();
      const containerRect = pdfViewerRef.current!.getBoundingClientRect();
      const x = r.left - iframeRect.left + (iframeRect.left - containerRect.left);
      const y = r.top - iframeRect.top + (iframeRect.top - containerRect.top);
      return { text, rect: { x, y, width: r.width, height: r.height } };
    } catch {
      return null;
    }
  };

  const triggerInsights = async () => {
    if (!selectedText) return;
    setInsightLoading(true);
    const result = await getInsightsForText(selectedText);
    setInsightText(result || "No insights generated.");
    setInsightLoading(false);
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
          {/* Inline Insights Overlay */}
          {selectionRect && (
            <div
              className="absolute bg-white border border-gray-300 rounded-md shadow-lg p-2 z-50"
              style={{
                top: Math.max(8, selectionRect.y + selectionRect.height + 8),
                left: Math.max(8, selectionRect.x),
                maxWidth: 360,
                width: 360
              }}
            >
              {!insightText ? (
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600 truncate pr-2" title={selectedText}>
                    {selectedText.slice(0, 80)}{selectedText.length > 80 ? '…' : ''}
                  </div>
                  <button
                    onClick={triggerInsights}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    disabled={insightLoading}
                  >
                    {insightLoading ? 'Analyzing…' : 'Get insights'}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-800">Insights</span>
                    <button
                      className="text-xs text-gray-500 hover:text-gray-700"
                      onClick={() => setSelectionRect(null)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="text-xs text-gray-700 whitespace-pre-wrap max-h-48 overflow-auto">
                    {insightText}
                  </div>
                </div>
              )}
            </div>
          )}
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

      {/* Floating Insights Button (fallback) */}
      {pdfFile && (
        <button
          onClick={async () => {
            // Try to read selection from iframe live
            const sel = readSelectionFromIframe();
            if (sel) {
              setSelectedText(sel.text);
              setSelectionRect(sel.rect);
              setInsightText("");
              setInsightLoading(true);
              const res = await getInsightsForText(sel.text);
              setInsightText(res || "No insights generated.");
              setInsightLoading(false);
            } else if (selectedText) {
              // Use last captured selection
              setSelectionRect({ x: 16, y: 16, width: 0, height: 0 });
              setInsightText("");
              setInsightLoading(true);
              const res = await getInsightsForText(selectedText);
              setInsightText(res || "No insights generated.");
              setInsightLoading(false);
            } else {
              // Fallback to manual panel
              setShowManualInsights(true);
            }
          }}
          className="absolute top-4 right-4 bg-blue-600 text-white text-xs px-3 py-2 rounded shadow hover:bg-blue-700 z-40"
          title="Analyze selected text"
        >
          Insights
        </button>
      )}

      {/* Region selection toggle */}
      {pdfFile && (
        <button
          onClick={() => {
            setRegionMode((v) => !v);
            setDragStart(null);
            setDragRect(null);
          }}
          className={`absolute top-4 right-28 text-xs px-3 py-2 rounded shadow z-40 ${regionMode ? 'bg-amber-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
          title="Drag to select a region for insights"
        >
          {regionMode ? 'Region: ON' : 'Region select'}
        </button>
      )}

      {/* Manual Insights Panel */}
      {showManualInsights && (
        <div className="absolute top-16 right-4 w-96 bg-white border border-gray-300 rounded-md shadow-lg p-3 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-800">Get insights</span>
            <button className="text-xs text-gray-500 hover:text-gray-700" onClick={() => setShowManualInsights(false)}>Close</button>
          </div>
          <div className="space-y-2">
            <textarea
              className="w-full h-28 border border-gray-300 rounded p-2 text-sm"
              placeholder="Paste selected text here..."
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <button
                className="text-xs text-blue-600 hover:text-blue-700"
                onClick={async () => {
                  try {
                    const clip = await navigator.clipboard.readText();
                    if (clip) setManualText(clip);
                  } catch {}
                }}
              >
                Paste from clipboard
              </button>
              <button
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={!manualText.trim() || manualLoading}
                onClick={async () => {
                  setManualLoading(true);
                  const res = await getInsightsForText(manualText.trim());
                  setManualLoading(false);
                  setInsightText(res || "No insights generated.");
                  setSelectionRect({ x: 16, y: 16, width: 0, height: 0 });
                  setShowManualInsights(false);
                }}
              >
                {manualLoading ? 'Analyzing…' : 'Get insights'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Region selection overlay inside the iframe area */}
      {pdfFile && regionMode && (
        <div
          ref={overlayRef}
          className="absolute inset-0 z-40"
          onMouseDown={(e) => {
            // Map mouse to iframe coordinates
            const iframe = pdfViewerRef.current?.querySelector('iframe') as HTMLIFrameElement | null;
            if (!iframe) return;
            const iframeRect = iframe.getBoundingClientRect();
            const x = e.clientX - iframeRect.left;
            const y = e.clientY - iframeRect.top;
            if (x < 0 || y < 0 || x > iframeRect.width || y > iframeRect.height) return;
            setDragStart({ x, y });
            setDragRect({ x, y, width: 0, height: 0 });
          }}
          onMouseMove={(e) => {
            if (!dragStart) return;
            const iframe = pdfViewerRef.current?.querySelector('iframe') as HTMLIFrameElement | null;
            if (!iframe) return;
            const iframeRect = iframe.getBoundingClientRect();
            const curX = Math.max(0, Math.min(e.clientX - iframeRect.left, iframeRect.width));
            const curY = Math.max(0, Math.min(e.clientY - iframeRect.top, iframeRect.height));
            const x = Math.min(dragStart.x, curX);
            const y = Math.min(dragStart.y, curY);
            const width = Math.abs(curX - dragStart.x);
            const height = Math.abs(curY - dragStart.y);
            setDragRect({ x, y, width, height });
          }}
          onMouseUp={async () => {
            if (!dragRect || dragRect.width < 4 || dragRect.height < 4) {
              setDragStart(null);
              setDragRect(null);
              setRegionMode(false);
              return;
            }
            // Determine current page (1-based)
            let pageNum = 1;
            try {
              const api = apis || (await viewer?.getAPIs?.());
              const p = await api?.getCurrentPage?.();
              pageNum = typeof p === 'number' ? p : 1;
            } catch {}
            const iframe = pdfViewerRef.current?.querySelector('iframe') as HTMLIFrameElement | null;
            if (!iframe) return;
            const iframeRect = iframe.getBoundingClientRect();
            setInsightLoading(true);
            setInsightText('');
            try {
              const res = await getInsightsForRegion(
                pdfUrl!,
                pageNum,
                { width: iframeRect.width, height: iframeRect.height },
                dragRect
              );
              setInsightText(res || 'No insights generated.');
              setSelectionRect({ x: 16, y: 16, width: 0, height: 0 });
            } catch {
              setInsightText('No insights generated.');
            }
            setInsightLoading(false);
            setRegionMode(false);
            setDragStart(null);
            setDragRect(null);
          }}
        >
          {dragRect && (
            <div
              className="absolute border-2 border-amber-500 bg-amber-200 bg-opacity-20 pointer-events-none"
              style={{ top: dragRect.y, left: dragRect.x, width: dragRect.width, height: dragRect.height }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PDFViewer;