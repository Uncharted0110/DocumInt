import { useEffect, useRef, useCallback } from 'react';

interface UseAdobePDFNavigationProps {
  pdfViewer: any;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const useAdobePDFNavigation = ({ pdfViewer, containerRef }: UseAdobePDFNavigationProps) => {
  const adobeAPIsRef = useRef<any>(null);
  const navigationQueueRef = useRef<number[]>([]);
  const isDocumentReadyRef = useRef<boolean>(false);

  // Setup navigation when PDF viewer is ready
  useEffect(() => {
    if (!pdfViewer) return;

    const setupNavigation = () => {
      try {
        // Register callback to get Adobe DC APIs
        pdfViewer.registerCallback(
          window.AdobeDC.View.Enum.CallbackType.GET_DOCUMENT_API,
          (adobeAPIs: any) => {
            console.log('Adobe DC APIs registered:', adobeAPIs);
            adobeAPIsRef.current = adobeAPIs;
            
            // Process any queued navigation requests
            if (navigationQueueRef.current.length > 0) {
              const targetPage = navigationQueueRef.current.pop();
              if (targetPage !== undefined) {
                setTimeout(() => navigateToPage(targetPage), 500); // Small delay to ensure document is ready
              }
              navigationQueueRef.current = [];
            }
          }
        );

        // Listen for document ready events
        pdfViewer.registerCallback(
          window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
          (event: any) => {
            console.log('Adobe DC Event:', event);
            if (event.type === "DOCUMENT_OPEN" || event.type === "APP_RENDERING_DONE") {
              console.log('Document ready for navigation');
              isDocumentReadyRef.current = true;
              
              // Process queued navigation if any
              if (navigationQueueRef.current.length > 0) {
                const targetPage = navigationQueueRef.current.pop();
                if (targetPage !== undefined) {
                  setTimeout(() => navigateToPage(targetPage), 200);
                }
                navigationQueueRef.current = [];
              }
            }
          }
        );

      } catch (error) {
        console.warn('Failed to setup Adobe DC navigation:', error);
      }
    };

    setupNavigation();
  }, [pdfViewer]);

  const navigateToPage = useCallback((pageNumber: number) => {
    const targetPage = pageNumber + 1; // Convert to 1-based indexing
    
    console.log(`Attempting navigation to page ${targetPage} (0-based: ${pageNumber})`);

    // If document isn't ready yet, queue the navigation
    if (!isDocumentReadyRef.current || !adobeAPIsRef.current) {
      console.log(`Document not ready, queuing navigation to page ${targetPage}`);
      navigationQueueRef.current = [pageNumber]; // Replace queue with latest navigation
      return false;
    }

    try {
      // Method 1: Try gotoLocation with page number
      if (adobeAPIsRef.current.gotoLocation) {
        adobeAPIsRef.current.gotoLocation(targetPage);
        console.log(`Successfully navigated to page ${targetPage} via gotoLocation`);
        return true;
      }

      // Method 2: Try using the page APIs
      if (adobeAPIsRef.current.getPageAPIs) {
        adobeAPIsRef.current.getPageAPIs().then((pageAPIs: any) => {
          if (pageAPIs?.gotoPage) {
            pageAPIs.gotoPage(targetPage);
            console.log(`Successfully navigated to page ${targetPage} via pageAPIs.gotoPage`);
          } else {
            console.warn('pageAPIs.gotoPage not available');
          }
        }).catch((error: any) => {
          console.error('Error getting page APIs:', error);
        });
        return true;
      }

      // Method 3: Try direct API calls with different formats
      if (adobeAPIsRef.current.getCurrentPage) {
        // First check if we can get current page (indicates navigation API is available)
        try {
          const methods = [
            () => adobeAPIsRef.current.goToPage?.(targetPage),
            () => adobeAPIsRef.current.navigateToPage?.(targetPage),
            () => adobeAPIsRef.current.setCurrentPage?.(targetPage),
          ];

          for (const method of methods) {
            try {
              const result = method();
              if (result !== false && result !== undefined) {
                console.log(`Successfully navigated to page ${targetPage} via direct API`);
                return true;
              }
            } catch (methodError) {
              console.log('Method failed, trying next:', methodError);
              continue;
            }
          }
        } catch (error) {
          console.warn('Direct API methods failed:', error);
        }
      }

      // Method 4: Fallback - try to trigger navigation via events
      console.warn(`All navigation methods failed for page ${targetPage}, trying event-based approach`);
      
      // Try to find and trigger page navigation controls
      const iframe = containerRef.current?.querySelector('iframe');
      if (iframe?.contentWindow) {
        try {
          // Send a message to the iframe if possible
          iframe.contentWindow.postMessage({
            type: 'navigateToPage',
            page: targetPage
          }, window.location.origin);
          console.log(`Attempted iframe navigation to page ${targetPage}`);
        } catch (iframeError) {
          console.warn('Iframe navigation failed:', iframeError);
        }
      }

      return false;

    } catch (error) {
      console.error('Navigation error:', error);
      return false;
    }
  }, [containerRef]);

  return { navigateToPage };
};