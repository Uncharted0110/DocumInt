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

  // Helper function to try different navigation methods
  const tryNavigationMethod = useCallback((method: () => any, methodName: string, targetPage: number): boolean => {
    try {
      if (typeof method === 'function') {
        const result = method();
        if (result !== false && result !== undefined) {
          console.log(`Successfully navigated to page ${targetPage} via ${methodName}`);
          return true;
        }
      }
    } catch (error) {
      console.log(`Method ${methodName} failed:`, error);
    }
    return false;
  }, []);

  // Helper function to try UI simulation
  const tryUISimulation = useCallback((targetPage: number) => {
    setTimeout(() => {
      try {
        const iframe = containerRef.current?.querySelector('iframe');
        if (iframe?.contentDocument || iframe?.contentWindow) {
          const pageInputs = iframe.contentDocument?.querySelectorAll('input[type="number"], input[aria-label*="page"], input[placeholder*="page"]') || [];
          for (const input of pageInputs) {
            try {
              (input as HTMLInputElement).value = targetPage.toString();
              input.dispatchEvent(new Event('change', { bubbles: true }));
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
              console.log(`Attempted page navigation via input field`);
              break;
            } catch (inputError) {
              console.log('Input simulation failed:', inputError);
            }
          }
        }
      } catch (iframeError) {
        console.warn('Iframe interaction failed:', iframeError);
      }
    }, 100);
  }, [containerRef]);

  const navigateToPage = useCallback((pageNumber: number) => {
    const targetPage = pageNumber + 1; // Convert to 1-based indexing
    
    console.log(`Attempting navigation to page ${targetPage} (0-based: ${pageNumber})`);

    // If document isn't ready yet, queue the navigation
    if (!isDocumentReadyRef.current || !adobeAPIsRef.current) {
      console.log(`Document not ready, queuing navigation to page ${targetPage}`);
      navigationQueueRef.current = [pageNumber];
      return false;
    }

    try {
      // Method 1: Try gotoLocation
      if (adobeAPIsRef.current.gotoLocation) {
        try {
          adobeAPIsRef.current.gotoLocation(targetPage);
          console.log(`Successfully navigated to page ${targetPage} via gotoLocation`);
          return true;
        } catch (error) {
          console.log('gotoLocation failed, trying next method:', error);
        }
      }

      // Method 2: Try page APIs
      if (adobeAPIsRef.current.getPageAPIs) {
        try {
          const pageAPIsPromise = adobeAPIsRef.current.getPageAPIs();
          if (pageAPIsPromise && typeof pageAPIsPromise.then === 'function') {
            pageAPIsPromise
              .then((pageAPIs: any) => {
                if (pageAPIs?.gotoPage) {
                  pageAPIs.gotoPage(targetPage);
                  console.log(`Successfully navigated to page ${targetPage} via pageAPIs.gotoPage`);
                } else if (pageAPIs?.goToPage) {
                  pageAPIs.goToPage(targetPage);
                  console.log(`Successfully navigated to page ${targetPage} via pageAPIs.goToPage`);
                }
              })
              .catch((error: any) => {
                console.error('Error getting page APIs:', error);
              });
            return true;
          }
        } catch (error) {
          console.log('getPageAPIs failed, trying next method:', error);
        }
      }

      // Method 3: Try direct navigation methods (1-based)
      const oneBasedMethods = [
        { name: 'gotoPage', fn: () => adobeAPIsRef.current.gotoPage?.(targetPage) },
        { name: 'goToPage', fn: () => adobeAPIsRef.current.goToPage?.(targetPage) },
        { name: 'navigateToPage', fn: () => adobeAPIsRef.current.navigateToPage?.(targetPage) },
        { name: 'setCurrentPage', fn: () => adobeAPIsRef.current.setCurrentPage?.(targetPage) },
        { name: 'jumpToPage', fn: () => adobeAPIsRef.current.jumpToPage?.(targetPage) },
      ];

      for (const method of oneBasedMethods) {
        if (tryNavigationMethod(method.fn, method.name, targetPage)) {
          return true;
        }
      }

      // Method 4: Try with 0-based indexing
      console.log(`Trying 0-based indexing for page ${pageNumber}`);
      const zeroBasedMethods = oneBasedMethods.map(method => ({
        ...method,
        fn: () => {
          const fnName = method.name;
          return adobeAPIsRef.current[fnName]?.(pageNumber);
        }
      }));

      for (const method of zeroBasedMethods) {
        if (tryNavigationMethod(method.fn, `${method.name} (0-based)`, pageNumber)) {
          return true;
        }
      }

      // Method 5: Try location-based navigation
      if (adobeAPIsRef.current.getCurrentLocation) {
        try {
          adobeAPIsRef.current.getCurrentLocation().then((location: any) => {
            if (location && typeof location.pageNumber !== 'undefined') {
              location.pageNumber = targetPage;
              if (adobeAPIsRef.current.setLocation) {
                adobeAPIsRef.current.setLocation(location);
                console.log(`Successfully navigated via setLocation to page ${targetPage}`);
              }
            }
          }).catch((error: any) => {
            console.error('Location-based navigation failed:', error);
          });
        } catch (error) {
          console.log('Location-based navigation not available:', error);
        }
      }

      // Method 6: UI simulation fallback
      console.warn(`All API methods failed for page ${targetPage}, trying UI simulation`);
      tryUISimulation(targetPage);

      return false;

    } catch (error) {
      console.error('Navigation error:', error);
      return false;
    }
  }, [containerRef, tryNavigationMethod, tryUISimulation]);

  return { navigateToPage };
};