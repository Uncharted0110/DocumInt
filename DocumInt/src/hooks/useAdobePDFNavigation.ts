import { useEffect, useRef, useCallback } from 'react';

interface UseAdobePDFNavigationProps {
  // AdobeDC.View instance (used to register callbacks/events)
  view?: any;
  // The viewer instance returned by previewFile().then(viewer => ...)
  viewer?: any;
  // Pre-fetched APIs (optional), e.g., from viewer.getAPIs()
  apis?: any;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onTextSelected?: (text: string) => void;
  onTextCleared?: () => void;
}

export const useAdobePDFNavigation = ({ view, viewer, apis, containerRef, onTextSelected, onTextCleared }: UseAdobePDFNavigationProps) => {
  const adobeAPIsRef = useRef<any>(null);
  const navigationQueueRef = useRef<number[]>([]);
  const hasAPIsRef = useRef<boolean>(false);
  const hasReadyEventRef = useRef<boolean>(false);

  const canNavigate = useCallback(() => hasAPIsRef.current && hasReadyEventRef.current && !!adobeAPIsRef.current, []);

  const getApis = useCallback(async (): Promise<any | null> => {
    if (adobeAPIsRef.current) return adobeAPIsRef.current;
    if (apis) {
      adobeAPIsRef.current = apis;
      hasAPIsRef.current = true;
      (window as any).__ADOBE_APIS__ = apis;
      try { console.log('Adobe DC APIs methods:', Object.keys(apis || {}).sort((a, b) => a.localeCompare(b))); } catch {}
      return apis;
    }
    if (viewer && typeof viewer.getAPIs === 'function') {
      try {
        const vApis = await viewer.getAPIs();
        if (vApis) {
          adobeAPIsRef.current = vApis;
          hasAPIsRef.current = true;
          (window as any).__ADOBE_APIS__ = vApis;
          try { console.log('Adobe DC APIs methods:', Object.keys(vApis || {}).sort((a, b) => a.localeCompare(b))); } catch {}
          return vApis;
        }
      } catch { /* ignore */ }
    }
    return null;
  }, [viewer, apis]);

  const flushQueueIfPossible = useCallback(() => {
    if (!canNavigate()) return;
    if (navigationQueueRef.current.length > 0) {
      const target = navigationQueueRef.current.pop();
      navigationQueueRef.current = [];
      if (typeof target === 'number') {
        navigateToPage(target);
      }
    }
  }, [canNavigate]);

  // If APIs are provided externally, use them and expose globals
  useEffect(() => {
    if (apis && !adobeAPIsRef.current) {
      console.log('Adobe DC APIs provided from viewer.getAPIs()');
      adobeAPIsRef.current = apis;
      hasAPIsRef.current = true;
      (window as any).__ADOBE_APIS__ = apis;
      try { console.log('Adobe DC APIs methods:', Object.keys(apis || {}).sort((a, b) => a.localeCompare(b))); } catch {}
      (window as any).__ADOBE_NAV__ = (p: number) => navigateToPage((Number(p) || 1) - 1);
      (window as any).__ADOBE_GET_LOC__ = () => (window as any).__ADOBE_APIS__?.getCurrentLocation?.().then((l: any) => console.log('CurrentLocation', l));
      (window as any).__ADOBE_GET_PAGE__ = () => {
        try {
          const val = (window as any).__ADOBE_APIS__?.getCurrentPage?.();
          if (typeof (val as any)?.then === 'function') (val as any).then((n: any) => console.log('CurrentPage', n));
          else console.log('CurrentPage (sync)', val);
        } catch (e) { console.log('getCurrentPage error', e); }
      };
      flushQueueIfPossible();
    }
  }, [apis, flushQueueIfPossible]);

  // Try to fetch APIs from the viewer instance and expose globals
  useEffect(() => {
    if (!viewer || adobeAPIsRef.current) return;
    (async () => {
      const vApis = await getApis();
      if (vApis) {
        (window as any).__ADOBE_NAV__ = (p: number) => navigateToPage((Number(p) || 1) - 1);
        (window as any).__ADOBE_GET_LOC__ = () => (window as any).__ADOBE_APIS__?.getCurrentLocation?.().then((l: any) => console.log('CurrentLocation', l));
        (window as any).__ADOBE_GET_PAGE__ = () => {
          try {
            const val = (window as any).__ADOBE_APIS__?.getCurrentPage?.();
            if (typeof (val as any)?.then === 'function') (val as any).then((n: any) => console.log('CurrentPage', n));
            else console.log('CurrentPage (sync)', val);
          } catch (e) { console.log('getCurrentPage error', e); }
        };
        // New: helper that reuses current location shape and only changes page index
        (window as any).__ADOBE_NAV_LOC__ = async (oneBased: number) => {
          try {
            const a = await getApis();
            const cur = await a?.getCurrentLocation?.();
            const zero = Math.max(0, Number(oneBased || 1) - 1);
            const loc = cur ? { ...cur, page: zero, pageNumber: oneBased } : { page: zero };
            return a?.gotoLocation?.(loc);
          } catch (e) {
            console.log('NAV_LOC error', e);
          }
        };
        flushQueueIfPossible();
      }
    })();
  }, [viewer, getApis, flushQueueIfPossible]);

  // Register events for strong readiness signals
  useEffect(() => {
    if (!view) return;

    const setupNavigation = () => {
      try {
        const CallbackType = (window as any)?.AdobeDC?.View?.Enum?.CallbackType;
        if (!CallbackType) {
          setTimeout(setupNavigation, 100);
          return;
        }

        // Register callback to get Adobe DC APIs (secondary path)
        if (CallbackType.GET_DOCUMENT_API && typeof view.registerCallback === 'function') {
          view.registerCallback(
            CallbackType.GET_DOCUMENT_API,
            (docApis: any) => {
              console.log('Adobe DC APIs registered via GET_DOCUMENT_API:', docApis);
              adobeAPIsRef.current = docApis;
              hasAPIsRef.current = true;
              (window as any).__ADOBE_APIS__ = docApis;
              try { console.log('Adobe DC APIs methods:', Object.keys(docApis || {}).sort((a, b) => a.localeCompare(b))); } catch {}
              (window as any).__ADOBE_NAV__ = (p: number) => navigateToPage((Number(p) || 1) - 1);
              (window as any).__ADOBE_GET_LOC__ = () => (window as any).__ADOBE_APIS__?.getCurrentLocation?.().then((l: any) => console.log('CurrentLocation', l));
              (window as any).__ADOBE_GET_PAGE__ = () => {
                try {
                  const val = (window as any).__ADOBE_APIS__?.getCurrentPage?.();
                  if (typeof (val as any)?.then === 'function') (val as any).then((n: any) => console.log('CurrentPage', n));
                  else console.log('CurrentPage (sync)', val);
                } catch (e) { console.log('getCurrentPage error', e); }
              };
              flushQueueIfPossible();
            }
          );
        }

        // Listen for document ready events
        if (CallbackType.EVENT_LISTENER && typeof view.registerCallback === 'function') {
          view.registerCallback(
            CallbackType.EVENT_LISTENER,
            (event: any) => {
              console.log('Adobe DC Event:', event);
              if (event.type === 'APP_RENDERING_DONE' || event.type === 'PDF_VIEWER_READY') {
                hasReadyEventRef.current = true;
                flushQueueIfPossible();
              }
              // Capture text selection events if available
              if (event.type === 'TEXT_SELECTED' || event.type === 'SELECTION_CHANGE' || event.type === 'TEXT_COPY') {
                try {
                  const text = (event?.data?.text || event?.data?.selectedText || '').toString();
                  if (text && onTextSelected) onTextSelected(text);
                } catch {}
              }
              if (event.type === 'TEXT_DESELECTED' || event.type === 'SELECTION_CLEARED') {
                try { onTextCleared && onTextCleared(); } catch {}
              }
            },
            { enablePDFAnalytics: false }
          );
        }
      } catch (error) {
        console.warn('Failed to setup Adobe DC navigation:', error);
      }
    };

    setupNavigation();
  }, [view, flushQueueIfPossible, onTextSelected, onTextCleared]);

  // Helper to get current page (prefer getCurrentPage, fallback to location)
  const getCurrentPageNumber = useCallback(async (): Promise<number | undefined> => {
    try {
      const a = await getApis();
      if (!a) return undefined;
      if (typeof a.getCurrentPage === 'function') {
        try {
          // getCurrentPage might be sync or async depending on impl
          const val = a.getCurrentPage();
          const n = typeof (val as any)?.then === 'function' ? await (val as any) : val;
          if (typeof n === 'number') return n;
        } catch { /* ignore */ }
      }
      const loc = await a.getCurrentLocation?.();
      if (loc && typeof loc.pageNumber === 'number') return loc.pageNumber;
    } catch { /* ignore */ }
    return undefined;
  }, [getApis]);

  // Verify navigation by polling current page number briefly
  const verifyNavigation = useCallback(async (targetPageOneBased: number): Promise<boolean> => {
    const maxTries = 10;
    for (let i = 0; i < maxTries; i++) {
      const cur = await getCurrentPageNumber();
      if (cur === targetPageOneBased) return true;
      await new Promise((r) => setTimeout(r, 160));
    }
    return false;
  }, [getCurrentPageNumber]);

  // Helper function to try different navigation methods
  const tryMethodsInOrder = useCallback(async (targetPage: number, zeroBased: number): Promise<boolean> => {
    const a = await getApis();
    if (!a) return false;

    // Ensure metadata is ready and page is in range
    try {
      const meta = await a.getPDFMetadata?.();
      if (meta?.numPages && targetPage > meta.numPages) {
        console.warn(`Target page ${targetPage} out of range (total ${meta.numPages})`);
        return false;
      }
    } catch { /* ignore */ }

    // 1) Preferred: reuse current location object shape
    try {
      if (a.getCurrentLocation && a.gotoLocation) {
        const curLoc = await a.getCurrentLocation();
        if (curLoc) {
          const loc1 = { ...curLoc, page: zeroBased, pageNumber: targetPage };
          try {
            await Promise.resolve(a.gotoLocation(loc1));
            if (await verifyNavigation(targetPage)) {
              console.log(`Successfully navigated to page ${targetPage} via gotoLocation(curLoc with page/pageNumber)`);
              return true;
            }
          } catch {}
          // Try with just page
          try {
            const { pageNumber, ...rest } = loc1 as any;
            await Promise.resolve(a.gotoLocation({ ...rest, page: zeroBased }));
            if (await verifyNavigation(targetPage)) {
              console.log(`Successfully navigated to page ${targetPage} via gotoLocation(curLoc with page)`);
              return true;
            }
          } catch {}
        }
      }
    } catch { /* ignore */ }

    // 2) Try "page" key variants
    try {
      if (a.gotoLocation) {
        try {
          await Promise.resolve(a.gotoLocation({ page: zeroBased }));
          if (await verifyNavigation(targetPage)) {
            console.log(`Successfully navigated to page ${targetPage} via gotoLocation({ page: 0-based })`);
            return true;
          }
        } catch {}
        try {
          await Promise.resolve(a.gotoLocation({ page: zeroBased, x: 0, y: 0 }));
          if (await verifyNavigation(targetPage)) {
            console.log(`Successfully navigated to page ${targetPage} via gotoLocation({ page, x, y })`);
            return true;
          }
        } catch {}
        try {
          await Promise.resolve(a.gotoLocation({ page: zeroBased, x: 0, y: 0, zoom: 1 }));
          if (await verifyNavigation(targetPage)) {
            console.log(`Successfully navigated to page ${targetPage} via gotoLocation({ page, x, y, zoom })`);
            return true;
          }
        } catch {}
      }
    } catch { /* ignore */ }

    // 3) Fallbacks: number and pageNumber variants
    try {
      if (a.gotoLocation) {
        try {
          await Promise.resolve(a.gotoLocation(targetPage));
          if (await verifyNavigation(targetPage)) {
            console.log(`Successfully navigated to page ${targetPage} via gotoLocation(number)`);
            return true;
          }
        } catch {}
        try {
          await Promise.resolve(a.gotoLocation({ pageNumber: targetPage }));
          if (await verifyNavigation(targetPage)) {
            console.log(`Successfully navigated to page ${targetPage} via gotoLocation(object 1-based)`);
            return true;
          }
        } catch {}
        try {
          await Promise.resolve(a.gotoLocation(zeroBased));
          if (await verifyNavigation(targetPage)) {
            console.log(`Successfully navigated to page ${targetPage} via gotoLocation(number 0-based)`);
            return true;
          }
        } catch {}
        try {
          await Promise.resolve(a.gotoLocation({ pageNumber: zeroBased }));
          if (await verifyNavigation(targetPage)) {
            console.log(`Successfully navigated to page ${targetPage} via gotoLocation(object 0-based)`);
            return true;
          }
        } catch {}
      }
    } catch { /* ignore */ }

    return false;
  }, [getApis, verifyNavigation]);

  // Helper function to try UI simulation
  const tryUISimulation = useCallback((targetPage: number) => {
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
            console.log('Attempted page navigation via input field');
            break;
          } catch (inputError) {
            console.log('Input simulation failed:', inputError);
          }
        }
      }
    } catch (iframeError) {
      console.warn('Iframe interaction failed:', iframeError);
    }
  }, [containerRef]);

  const navigateToPage = useCallback((pageNumber: number) => {
    const targetPage = pageNumber + 1; // Convert to 1-based indexing
    console.log(`Attempting navigation to page ${targetPage} (0-based: ${pageNumber})`);

    // If document isn't ready yet, queue the navigation
    if (!canNavigate()) {
      console.log(`Document not ready (apis=${hasAPIsRef.current}, readyEvent=${hasReadyEventRef.current}), queuing navigation to page ${targetPage}`);
      navigationQueueRef.current = [pageNumber];
      return false;
    }

    (async () => {
      // Try methods twice before UI simulation fallback
      for (let pass = 0; pass < 2; pass++) {
        const ok = await tryMethodsInOrder(targetPage, pageNumber);
        if (ok) return;
        await new Promise((r) => setTimeout(r, 250));
      }
      console.warn(`All API methods failed for page ${targetPage}, trying UI simulation`);
      tryUISimulation(targetPage);
    })();

    return true;
  }, [canNavigate, tryMethodsInOrder, tryUISimulation]);

  return { navigateToPage };
};