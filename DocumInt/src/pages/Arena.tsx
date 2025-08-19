import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ChevronLeft, ChevronRight, Move
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import PDFViewer from '../components/PDFViewer';
import Chat from '../components/Chat';
import PDFListSidebar from '../components/PDFListSidebar';
import PDFOutlineSidebar from '../components/PDFOutlineSidebar';
import MindMap from '../components/Mindmap';
import Insights from '../components/Insights';
import { generateUUID } from '../utils/uuid';
import { API_ENDPOINTS } from '../config/api';
import SelectionBulb from '../components/SelectionBulb';
import { saveProjectState } from '../utils/projectStorage';

// Extend window type to include AdobeDC
declare global {
    interface Window {
        AdobeDC?: any;
    }
}

interface LocationState {
    projectName: string;
    files: File[];
}

const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size;

const Arena = () => {
    // State management
    const location = useLocation();
    const navigate = useNavigate();
    const { projectName, files } = location.state as LocationState;
    const fileInputRef = useRef<HTMLInputElement>(null);

    // UI state
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
    const [isOutlineVisible, setIsOutlineVisible] = useState(true);
    const [isMindmapVisible, setIsMindmapVisible] = useState(false);

    // PDF state
    const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
    const [pdfUrls, setPdfUrls] = useState<string[]>([]);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfFileName, setPdfFileName] = useState('');
    const [isAdobeLoaded, setIsAdobeLoaded] = useState(false);
    const [navigationPage, setNavigationPage] = useState<number | undefined>(undefined);

    // Chat state - simplified interface
    const [chatMessage, ] = useState('');
    const [chatHistory, setChatHistory] = useState<{ id: string; type: "bot" | "user"; message: string; timestamp: Date; results?: any[] }[]>([
        { id: generateUUID(), type: 'bot', message: 'Hello! Upload PDFs to get started, then I can help you analyze them!', timestamp: new Date() }
    ]);
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Loading state
    const [isLoading, setIsLoading] = useState(true);

    // PDF list state with persistence
    const [pdfList, setPdfList] = useState<File[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isCachingAppend, setIsCachingAppend] = useState(false);
    const [appendStatus, setAppendStatus] = useState('');

    // Free layout mode (draggable/resizable panels)
    const [isFreeLayout, setIsFreeLayout] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const prevLayoutRef = useRef<Record<PanelKey, PanelState> | null>(null);
    const prevOutlineLayoutRef = useRef<Record<PanelKey, PanelState> | null>(null);

    type PanelKey = 'list' | 'outline' | 'viewer' | 'insights';
    type PanelState = { x: number; y: number; w: number; h: number; z: number };
    const [panels, setPanels] = useState<Record<PanelKey, PanelState> | null>(null);
    const [highlightKey, setHighlightKey] = useState<PanelKey | null>(null);

    // Storage key for persistence
    const STORAGE_KEY = `arena_pdfs_${projectName}`;
    // Bump layout key to force fresh defaults for everyone
    const LAYOUT_KEY = `arena_layout_v3_${projectName}`;

    // Load Adobe PDF Embed API
    useEffect(() => {
        const loadAdobeAPI = async () => {
            setIsLoading(true);

            try {
                if (window.AdobeDC) {
                    setIsAdobeLoaded(true);
                    setIsLoading(false);
                    return;
                }

                const script = document.createElement('script');
                script.src = 'https://documentservices.adobe.com/view-sdk/viewer.js';

                const loadPromise = new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });

                document.head.appendChild(script);
                await loadPromise;

                setIsAdobeLoaded(true);
            } catch (error) {
                console.error('Failed to load Adobe PDF Embed API:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadAdobeAPI();
    }, []);

    // Initialize PDFs with persistence
    useEffect(() => {
        if (isInitialized) return; // Prevent re-initialization

        try {
            // Try to load from memory storage first
            const storedFileNames = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

            if (storedFileNames.length > 0) {
                // Filter original files to match stored names
                const persistedFiles = files.filter(file =>
                    storedFileNames.includes(file.name)
                );
                setPdfList(persistedFiles);

                if (persistedFiles.length > 0) {
                    const firstPdf = persistedFiles[0];
                    setSelectedPdf(firstPdf);
                    setPdfFileName(firstPdf.name);
                }
            } else {
                // First time initialization
                setPdfList(files || []);

                if (files && files.length > 0) {
                    const firstPdf = files[0];
                    setSelectedPdf(firstPdf);
                    setPdfFileName(firstPdf.name);

                    // Save initial state
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(files.map(f => f.name)));
                }
            }
        } catch (error) {
            console.error('Error loading persisted PDFs:', error);
            // Fallback to original files
            setPdfList(files || []);
            if (files && files.length > 0) {
                const firstPdf = files[0];
                setSelectedPdf(firstPdf);
                setPdfFileName(firstPdf.name);
            }
        }

        setIsInitialized(true);
    }, [files, projectName, isInitialized]);

    // Initialize default free-layout panel positions based on canvas size
    const computeDefaultPanels = useCallback((): Record<PanelKey, PanelState> => {
        const rect = canvasRef.current?.getBoundingClientRect();
        const W = rect?.width ?? window.innerWidth;
        const H = rect?.height ?? window.innerHeight;

        const margin = 16;
        const gap = 16;
        const listW = Math.max(260, Math.min(320, W * 0.18));
        const outlineW = 320; // consistent with app outline width
        const insightsW = Math.max(360, Math.min(420, W * 0.22));

        const listX = margin;
        const outlineX = listX + listW + gap;
        const insightsX = W - insightsW - margin;
        const viewerX = outlineX + outlineW + gap; // after outline
        const viewerMaxRight = insightsX - gap; // leave gap before insights
        const viewerAvailW = Math.max(340, viewerMaxRight - viewerX);
        const viewerW = Math.max(520, Math.min(viewerAvailW, Math.max(520, W * 0.45)));

        return {
            list:    { x: listX, y: margin, w: listW, h: H - margin * 2, z: 2 },
            outline: { x: outlineX, y: margin, w: outlineW, h: H - margin * 2, z: 2 },
            viewer:  { x: viewerX, y: margin, w: Math.max(420, Math.min(viewerW, viewerMaxRight - viewerX)), h: H - margin * 2, z: 1 },
            insights:{ x: insightsX, y: margin, w: insightsW, h: H - margin * 2, z: 2 },
        };
    }, []);

    const ensurePanels = useCallback(() => {
        if (panels) return panels;
        const saved = localStorage.getItem(LAYOUT_KEY);
    if (saved) {
            try {
                const parsed = JSON.parse(saved);
        if (parsed?.viewer && parsed?.list && parsed?.outline && parsed?.insights) {
                    setPanels(parsed);
                    return parsed;
                }
            } catch {}
        }
        const defaults = computeDefaultPanels();
        setPanels(defaults);
        return defaults;
    }, [LAYOUT_KEY, panels, computeDefaultPanels]);

    const resetToDefaults = useCallback(() => {
        const defaults = computeDefaultPanels();
        setPanels(defaults);
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(defaults));
    }, [computeDefaultPanels, LAYOUT_KEY]);

    useEffect(() => {
        // Always ensure panels exist so layout persists even when not editing
        ensurePanels();
    }, [ensurePanels]);

    // Persist panel layout
    useEffect(() => {
        if (!panels) return;
        const id = setTimeout(() => localStorage.setItem(LAYOUT_KEY, JSON.stringify(panels)), 250);
        return () => clearTimeout(id);
    }, [panels, LAYOUT_KEY]);

    // Update pdfUrls when pdfList changes
    useEffect(() => {
        if (pdfList.length === 0) {
            setPdfUrls([]);
            return;
        }

        // Clean up old URLs
        pdfUrls.forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });

        // Create new URLs
        const urls = pdfList.map(file => URL.createObjectURL(file));
        setPdfUrls(urls);

        // Update selected PDF URL
        if (selectedPdf && pdfList.includes(selectedPdf)) {
            const idx = pdfList.indexOf(selectedPdf);
            setPdfUrl(urls[idx]);
        } else if (pdfList.length > 0 && !selectedPdf) {
            // Auto-select first PDF if none selected
            const firstPdf = pdfList[0];
            setSelectedPdf(firstPdf);
            setPdfFileName(firstPdf.name);
            setPdfUrl(urls[0]);
        }

        // Save to persistence
        if (isInitialized) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(pdfList.map(f => f.name)));
        }

        // Cleanup function
        return () => {
            urls.forEach(url => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [pdfList, selectedPdf, isInitialized]);

    // Persist project state when pdfList or chatHistory changes (debounced)
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (projectName) {
                saveProjectState(projectName, { pdfFiles: pdfList, chatHistory: chatHistory.map(m => ({ ...m, timestamp: m.timestamp })) as any });
            }
        }, 500);
        return () => clearTimeout(timeout);
    }, [pdfList, chatHistory, projectName]);

    // Handlers
    const handleHideOutline = useCallback(() => {
        setPanels((prevPanels) => {
            const p = prevPanels ?? computeDefaultPanels();
            // Store layout to restore later
            prevOutlineLayoutRef.current = p;
            const gap = 16;
            const freed = (p.outline?.w ?? 0) + gap;
            // Expand viewer leftwards while keeping its right edge constant
            const viewerRight = p.viewer.x + p.viewer.w;
            const newViewerX = Math.max(8, p.viewer.x - freed);
            const newViewerW = Math.max(340, viewerRight - newViewerX);
            return { ...p, viewer: { ...p.viewer, x: newViewerX, w: newViewerW, z: Date.now() } };
        });
        setIsOutlineVisible(false);
    }, [computeDefaultPanels]);

    const handleShowOutline = useCallback(() => {
        setIsOutlineVisible(true);
        setPanels((prevPanels) => {
            const p = prevPanels ?? computeDefaultPanels();
            const base = prevOutlineLayoutRef.current ?? computeDefaultPanels();
            prevOutlineLayoutRef.current = null;
            // Restore viewer and outline from saved layout
            return { ...p, outline: base.outline, viewer: base.viewer };
        });
    }, [computeDefaultPanels]);
    const toggleSidebarMinimize = useCallback(() => {
        setIsSidebarMinimized((prevMin) => {
            const nextMin = !prevMin;
            setPanels((prevPanels) => {
                const p = prevPanels ?? computeDefaultPanels();
                if (nextMin) {
                    // Collapse list to a narrow visible strip and shift outline/viewer left to cover freed space
                    prevLayoutRef.current = p;
                    const collapsedW = 56; // narrow strip for tabs-like browsing
                    const origW = p.list?.w ?? 0;
                    const freed = Math.max(0, origW - collapsedW);
                    const maxZ = Math.max(p.list.z, p.outline.z, p.viewer.z, p.insights.z);
                    const next: Record<PanelKey, PanelState> = {
                        ...p,
                        list: { ...p.list, w: collapsedW, z: maxZ + 2 },
                        outline: p.outline,
                        viewer: p.viewer,
                        insights: p.insights,
                    } as any;
                    if (freed > 0) {
                        const gap = 16;
                        if (isOutlineVisible) {
                            const newOutlineX = Math.max(8, p.outline.x - freed);
                            const newOutlineW = p.outline.w + freed;
                            const outlineRight = newOutlineX + newOutlineW; // keep the right edge steady visually
                            const viewerRight = p.viewer.x + p.viewer.w; // preserve original right bound against insights
                            const candidateX = Math.max(8, p.viewer.x - freed);
                            const newViewerX = Math.max(candidateX, outlineRight + gap);
                            const newViewerW = Math.max(340, viewerRight - newViewerX);
                            next.outline = { ...p.outline, x: newOutlineX, w: newOutlineW, z: Date.now() };
                            next.viewer = { ...p.viewer, x: newViewerX, w: newViewerW, z: Date.now() };
                        } else {
                            // No outline: shift viewer left while keeping its right edge constant
                            const viewerRight = p.viewer.x + p.viewer.w;
                            const newViewerX = Math.max(8, p.viewer.x - freed);
                            const newViewerW = Math.max(340, viewerRight - newViewerX);
                            next.viewer = { ...p.viewer, x: newViewerX, w: newViewerW, z: Date.now() };
                        }
                    }
                    return next;
                } else {
                    // Restore previous layout if available
                    const base = prevLayoutRef.current ?? computeDefaultPanels();
                    prevLayoutRef.current = null;
                    return { ...p, ...base };
                }
            });
            return nextMin;
        });
    }, [computeDefaultPanels, isOutlineVisible]);
    const handlePdfSelection = (file: File) => {
        const idx = pdfList.indexOf(file);
        setSelectedPdf(file);
        setPdfFileName(file.name);
        setPdfUrl(pdfUrls[idx]);
        setNavigationPage(undefined); // Reset navigation when switching PDFs
    };

    const handlePageNavigation = (page: number, searchText?: string) => {
        const baseMessage = `Arena: Received navigation request for page ${page}`;
        const fullMessage = searchText ? `${baseMessage} with search: ${searchText}` : baseMessage;
        console.log(fullMessage);
        setNavigationPage(page);
        // Text highlighting will be implemented in future updates
    };

    // Navigate to a source across PDFs from Insights
    // Store last searchText for highlight after navigation
    const lastSearchTextRef = useRef<string | undefined>(undefined);

    const handleNavigateToSource = ({ fileName, page, searchText }: { fileName: string; page: number; searchText?: string }) => {
        try {
            if (!fileName) return;
            const baseFileName = fileName.split(/[\\/]/).pop()?.trim().toLowerCase() || '';
            const idx = pdfList.findIndex(f => {
                const pdfFileName = f.name.toLowerCase();
                return pdfFileName === baseFileName || baseFileName.includes(pdfFileName) || pdfFileName.includes(baseFileName);
            });
            if (idx === -1) {
                console.warn('Source PDF not found in current project:', fileName, 'Available PDFs:', pdfList.map(f => f.name));
                return;
            }
            const target = pdfList[idx];
            const goTo = Math.max(0, (Number(page) || 1) - 1);
            const doNav = () => setNavigationPage(goTo);
            if (!selectedPdf || selectedPdf.name !== target.name) {
                setSelectedPdf(target);
                setPdfFileName(target.name);
                const url = pdfUrls[idx];
                if (url) setPdfUrl(url);
                window.setTimeout(doNav, 300);
            } else {
                doNav();
            }
            if (searchText) {
                lastSearchTextRef.current = searchText;
            }
        } catch (e) {
            console.debug('Failed to navigate to source', e);
        }
    };

    // Highlight after navigation complete
    const handleNavigationComplete = () => {
        const sectionTitle = lastSearchTextRef.current;
        if (!sectionTitle) return;
        const adobeApis = (window as any).__ADOBE_APIS__;
        (async () => {
            if (!sectionTitle.trim()) return;
            try {
                if (!adobeApis || typeof adobeApis.search !== 'function') {
                    console.warn('Adobe APIs not ready for highlighting');
                    return;
                }
                const fullTitle = sectionTitle.trim();
                const words = fullTitle.split(/\s+/);
                const firstTwo = words.slice(0, 2).join(' ');
                console.log('[Highlight] Trying full section title:', fullTitle);
                let result = await adobeApis.search(fullTitle);
                const empty = !result || (Array.isArray(result) && result.length === 0);
                if (empty && words.length > 2) {
                    console.log('[Highlight] Full title not found, trying first 2 words:', firstTwo);
                    result = await adobeApis.search(firstTwo);
                }
                if ((!result || (Array.isArray(result) && result.length === 0)) && words.length >= 1) {
                    for (const w of words.slice(0, 3)) { // try up to first 3 meaningful words
                        if (w.length < 3) continue;
                        try {
                            console.log('[Highlight] Fallback single word search:', w);
                            const r = await adobeApis.search(w);
                            if (r && (!Array.isArray(r) || r.length > 0)) break;
                        } catch {}
                    }
                }
            } catch (err) {
                console.error('Highlight attempt failed:', err);
            }
        })();
    };

    // Handle selected text search in chat
    const handleSelectedTextSearch = async (selectedText: string) => {
        // Open chat
        setIsChatOpen(true);
        
        // Clear chat history and show only the current search
        const botMessage = {
            id: generateUUID(),
            type: 'bot' as const,
            message: `Selected text: "${selectedText}"\n\nSearching for relevant sources...`,
            timestamp: new Date()
        };
        setChatHistory([botMessage]); // Replace entire chat history

        // Query the backend for relevant sources
        const cacheKey = sessionStorage.getItem('cache_key');
        if (!cacheKey) {
            const errorMessage = {
                id: generateUUID(),
                type: 'bot' as const,
                message: 'PDFs not cached yet. Please upload PDFs first.',
                timestamp: new Date()
            };
            setChatHistory([errorMessage]); // Replace with error message only
            return;
        }

        try {
            const formData = new FormData();
            formData.append('cache_key', cacheKey);
            formData.append('task', selectedText);
            formData.append('k', '5');

            const response = await fetch(API_ENDPOINTS.QUERY_PDFS, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                const resultsMessage = {
                    id: generateUUID(),
                    type: 'bot' as const,
                    message: `Selected text: "${selectedText}"\n\nFound ${data.subsection_analysis.length} relevant sections:`,
                    timestamp: new Date(),
                    results: data.subsection_analysis
                };
                setChatHistory([resultsMessage]); // Replace with results only
            } else {
                const errorMessage = {
                    id: generateUUID(),
                    type: 'bot' as const,
                    message: 'Sorry, I encountered an error searching for relevant sources.',
                    timestamp: new Date()
                };
                setChatHistory([errorMessage]); // Replace with error message only
            }
        } catch (error) {
            console.error('Error searching for selected text:', error);
            const errorMessage = {
                id: generateUUID(),
                type: 'bot' as const,
                message: 'Sorry, I encountered an error searching for relevant sources.',
                timestamp: new Date()
            };
            setChatHistory([errorMessage]); // Replace with error message only
        }
    };

    // Add PDF handler
    const handleAddPdf = () => {
        fileInputRef.current?.click();
    };

    // File upload handler (add to list)
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const filesInput = event.target.files;
        if (!filesInput?.length) return;

        // Convert FileList to Array
        const newFiles = Array.from(filesInput).filter(file => file.type === 'application/pdf');

        // For each new file trigger append endpoint sequentially
        for (const f of newFiles) {
            setIsCachingAppend(true);
            setAppendStatus(`Uploading ${f.name}…`);
            try {
                const formData = new FormData();
                formData.append('project_name', projectName);
                formData.append('file', f);
                const resp = await fetch(API_ENDPOINTS.APPEND_PDF, { method: 'POST', body: formData });
                if (!resp.ok) { 
                    console.error('Append failed', await resp.text()); 
                    continue; 
                }
                const data = await resp.json();
                const key = data.cache_key;
                setAppendStatus(`Processing embeddings for ${f.name}…`);
                // Poll cache status
                for (let i=0;i<180;i++) { // up to ~90s
                    const statusResp = await fetch(API_ENDPOINTS.CACHE_STATUS(key));
                    if (statusResp.ok) {
                        const sData = await statusResp.json();
                        if (sData.ready) break;
                    }
                    await new Promise(r=>setTimeout(r,500));
                }
                // On success add to list
                setPdfList(prev => addNewFiles(prev, [f]));
            } catch (e) { 
                console.error('Error appending pdf', e); 
            } finally { 
                setIsCachingAppend(false); 
                setAppendStatus(''); 
            }
        }

        // If the user selected only one file and it's new, set it as selected
        if (newFiles.length === 1) {
            const file = newFiles[0];
            const alreadyExists = pdfList.some(existingFile => sameFile(existingFile, file));
            if (!alreadyExists) {
                setSelectedPdf(file);
                setPdfFileName(file.name);
                setNavigationPage(undefined);
            }
        }

        // Reset input so the same files can be chosen again later
        event.target.value = '';
    };

    // Improved Remove PDF from sidebar
    const handleRemoveSidebarPdf = (file: File) => {
        const currentIndex = pdfList.indexOf(file);
        if (currentIndex === -1) return;

        const newList = pdfList.filter(f => f !== file);
        setPdfList(newList);

        if (newList.length === 0) {
            // No PDFs left
            setSelectedPdf(null);
            setPdfFileName('');
            setPdfUrl(null);
        } else if (file === selectedPdf) {
            // If the removed file was selected, select the next or previous
            let newSelectedIndex;
            if (currentIndex < newList.length) {
                // Select the next PDF
                newSelectedIndex = currentIndex;
            } else {
                // Select the previous PDF
                newSelectedIndex = newList.length - 1;
            }

            const newSelectedPdf = newList[newSelectedIndex];
            setSelectedPdf(newSelectedPdf);
            setPdfFileName(newSelectedPdf.name);
            setNavigationPage(undefined);
        }
    };

    // Update the return statement to show loading state
    return (
        <>
            {isLoading ? (
                <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0a1653] to-indigo-900 relative overflow-hidden">
                    {/* Animated aurora while loading */}
                    <div className="aurora-bg">
                        <div className="aurora-blob" style={{left:'-10%', top:'-8%'}} />
                        <div className="aurora-blob blob-2" />
                        <div className="aurora-blob blob-3" />
                    </div>
                    <div className="text-center glass-panel rounded-2xl px-10 py-8 gradient-ring">
                        <div className="relative mx-auto mb-5 h-16 w-16 rounded-full bg-gradient-to-br from-indigo-400/40 to-fuchsia-400/40 shadow-inner flex items-center justify-center">
                            <div className="h-11 w-11 rounded-full border-2 border-white/30 border-t-transparent animate-spin" />
                        </div>
                        <p className="text-white/90 font-medium tracking-wide">Warming up DocumInt…</p>
                    </div>
                </div>
            ) : (
                <div className="h-screen flex flex-col relative overflow-hidden">
                    {isCachingAppend && <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center"><div className="animate-spin h-14 w-14 border-4 border-blue-600 border-t-transparent rounded-full mb-4"/><div className="text-sm text-gray-700">{appendStatus || 'Updating embeddings…'}</div></div>}
                    {/* Page-wide purple gradient underlay */}
                    <div className="page-purple-gradient" />
                    {/* Background aurora */}
                    <div className="aurora-bg">
                        <div className="aurora-blob" style={{left:'-8%', top:'-10%'}} />
                        <div className="aurora-blob blob-2" />
                        <div className="aurora-blob blob-3" />
                        <div className="aurora-blob blob-4" />
                    </div>
                    {/* Hidden file input */}
                    <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />

                    {/* Unified Layout using DRP; editable toggles with isFreeLayout */}
                    <div ref={canvasRef} className="relative flex-1 z-[1] select-none">
                        {/* Minimized list remains visible as a narrow strip; no extra restore button needed */}
                        {/* Layout Controls (only in edit mode) */}
                        {isFreeLayout && (
                            <div className="absolute left-1/2 -translate-x-1/2 top-4 z-[55] flex gap-2">
                                <button className="px-3 py-1.5 rounded-full chip-neo hover-lift text-xs" onClick={() => { if (!panels) return; setPanels(p=> p? { ...p, list: { ...p.list, z: Date.now() } }:p); setHighlightKey('list'); setTimeout(()=>setHighlightKey(null), 900); }}>PDFs</button>
                                <button className="px-3 py-1.5 rounded-full chip-neo hover-lift text-xs" onClick={() => { if (!panels) return; setPanels(p=> p? { ...p, viewer: { ...p.viewer, z: Date.now() } }:p); setHighlightKey('viewer'); setTimeout(()=>setHighlightKey(null), 900); }}>Viewer</button>
                                <button className="px-3 py-1.5 rounded-full chip-neo hover-lift text-xs" onClick={() => { if (!panels) return; setPanels(p=> p? { ...p, outline: { ...p.outline, z: Date.now() } }:p); setHighlightKey('outline'); setTimeout(()=>setHighlightKey(null), 900); }}>Outline</button>
                                <button className="px-3 py-1.5 rounded-full chip-neo hover-lift text-xs" onClick={() => { if (!panels) return; setPanels(p=> p? { ...p, insights: { ...p.insights, z: Date.now() } }:p); setHighlightKey('insights'); setTimeout(()=>setHighlightKey(null), 900); }}>Insights</button>
                            </div>
                        )}

                        {/* Panels */}
                        {(() => { const p = ensurePanels(); return (
                            <>
                                <DRP id="list" title="PDFs" editable={isFreeLayout} state={p.list} setState={(s)=>setPanels(prev=>prev?{...prev,list:s}:prev)} boundsRef={canvasRef} minW={240} minH={200} highlight={highlightKey==='list'}>
                                    <div className={`glass-panel glass-dark rounded-2xl overflow-hidden w-full h-full gradient-ring sheen ${highlightKey==='list' ? 'focus-flash' : ''}`}> 
                                        <PDFListSidebar projectName={projectName} files={pdfList} selectedPdf={selectedPdf} onPdfSelect={handlePdfSelection} isMinimized={isSidebarMinimized} onToggleMinimize={toggleSidebarMinimize} onRemovePdf={handleRemoveSidebarPdf} onBack={() => navigate('/projects')} onAddPdf={handleAddPdf} />
                                    </div>
                                </DRP>

                                {isOutlineVisible && (
                                    <DRP id="outline" title="Outline" editable={isFreeLayout} state={p.outline} setState={(s)=>setPanels(prev=>prev?{...prev,outline:s}:prev)} boundsRef={canvasRef} minW={280} minH={220} highlight={highlightKey==='outline'}>
                                        <div className={`glass-panel rounded-2xl overflow-hidden w-full h-full gradient-ring flex flex-col ${highlightKey==='outline' ? 'focus-flash' : ''}`}>
                                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 backdrop-blur-md">
                                                <h3 className="font-semibold text-slate-800 tracking-wide">Document Outline</h3>
                                                <button onClick={handleHideOutline} className="p-1.5 rounded-full hover:bg-white/60 transition hover-lift" title="Hide outline">
                                                    <ChevronLeft size={18} className="text-slate-700" />
                                                </button>
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <PDFOutlineSidebar pdfFile={selectedPdf} onPageNavigation={handlePageNavigation} className="h-full overflow-y-auto" />
                                            </div>
                                        </div>
                                    </DRP>
                                )}

                                <DRP id="viewer" title="Viewer" editable={isFreeLayout} state={p.viewer} setState={(s)=>setPanels(prev=>prev?{...prev,viewer:s}:prev)} boundsRef={canvasRef} minW={520} minH={360} highlight={highlightKey==='viewer'}>
                                    <div className={`relative w-full h-full glass-panel rounded-3xl gradient-ring ${highlightKey==='viewer' ? 'focus-flash' : ''}`}>
                                        {!isOutlineVisible && (
                                            <button onClick={handleShowOutline} className="absolute top-1/2 -translate-y-1/2 -left-8 z-20 p-2 rounded-full text-white btn-neo hover-lift" title="Show outline">
                                                <ChevronRight size={20} />
                                            </button>
                                        )}
                                        <PDFViewer pdfFile={selectedPdf} pdfUrl={pdfUrl} pdfFileName={pdfFileName} isAdobeLoaded={isAdobeLoaded} onFileUpload={handleAddPdf} navigationPage={navigationPage} onNavigationComplete={handleNavigationComplete} />
                                    </div>
                                </DRP>

                                <DRP id="insights" title="Insights" editable={isFreeLayout} state={p.insights} setState={(s)=>setPanels(prev=>prev?{...prev,insights:s}:prev)} boundsRef={canvasRef} minW={340} minH={280} highlight={highlightKey==='insights'}>
                                    <div className={`glass-panel rounded-2xl overflow-hidden w-full h-full gradient-ring p-3 pb-2 ${highlightKey==='insights' ? 'focus-flash' : ''}`}>
                                        <Insights
                                            projectName={projectName}
                                            onNavigateToPage={handlePageNavigation}
                                            onNavigateToSource={handleNavigateToSource}
                                            onOpenMindmap={() => setIsMindmapVisible(true)}
                                        />
                                    </div>
                                </DRP>
                            </>
                        ); })()}

                        {/* Selection Bulb Component */}
                        <SelectionBulb 
                            apis={isAdobeLoaded} 
                            onGenerateInsight={(selectedText: string) => {
                                // This will be called by SelectionBulb to generate insights
                                console.log('Generating insight for:', selectedText);
                            }}
                            onSearchInChat={handleSelectedTextSearch}
                        />

                        {/* Chat FAB */}
                        <Chat
                            chatHistory={chatHistory}
                            chatMessage={chatMessage}
                            pdfFiles={pdfList}
                            projectName={projectName}
                            isOpen={isChatOpen}
                            onToggle={() => setIsChatOpen(prev => !prev)}
                            onNavigateToPage={handlePageNavigation}
                            onNavigateToSource={handleNavigateToSource}
                        />
                    </div>

                    {/* Mindmap Overlay */}
                    <div
                        className={`fixed top-0 left-0 w-full h-full z-50 transition-transform duration-500 ease-in-out ${isMindmapVisible ? 'translate-x-0' : 'translate-x-full'}`}
                    >
                        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-xl" />
                        {isMindmapVisible && (
                            <MindMap
                                onClose={() => setIsMindmapVisible(false)}
                                onNavigateToSource={handleNavigateToSource}
                            />
                        )}
                    </div>
                </div>
            )}
            {/* Edit Layout toggle + Reset (visible in edit mode) */}
            {!isMindmapVisible && (
            <div className="fixed top-3 right-3 z-[60] flex items-center gap-2">
                {isFreeLayout && (
                    <button
                        className="px-3 py-1.5 rounded-full chip-neo hover-lift text-sm"
                        onClick={resetToDefaults}
                        title="Reset layout to defaults"
                    >
                        Reset layout
                    </button>
                )}
                <button className="px-3 py-1.5 rounded-full btn-neo hover-lift text-sm flex items-center gap-2" onClick={() => setIsFreeLayout(v=>!v)} title="Toggle free layout">
                    <Move size={16} /> {isFreeLayout ? 'Exit layout' : 'Edit layout'}
                </button>
            </div>
            )}
        </>
    );
};

export default Arena;

const addNewFiles = (current: File[], incoming: File[]) => {
    const updated = [...current];
    for (const f of incoming) {
        if (!updated.some(ex => sameFile(ex, f))) updated.push(f);
    }
    return updated;
};

// Draggable + Resizable Panel (no external deps)
type DRPProps = {
    id: string; title?: string; state: { x:number; y:number; w:number; h:number; z:number };
    setState: (s: { x:number; y:number; w:number; h:number; z:number }) => void;
    boundsRef: React.RefObject<HTMLDivElement | null>; children: React.ReactNode; editable: boolean;
    minW?: number; minH?: number; highlight?: boolean;
};

const DRP: React.FC<DRPProps> = ({ id, title, state, setState, boundsRef, children, editable, minW=200, minH=160, highlight }) => {
    const elRef = useRef<HTMLDivElement>(null);

    const clamp = (x:number,y:number,w:number,h:number) => {
        const b = boundsRef.current?.getBoundingClientRect();
        const BW = b?.width ?? window.innerWidth; const BH = b?.height ?? window.innerHeight;
        const nx = Math.max(0, Math.min(x, BW - Math.max(w, 80)));
        const ny = Math.max(0, Math.min(y, BH - Math.max(h, 80)));
        const nw = Math.max(minW, Math.min(w, BW - nx));
        const nh = Math.max(minH, Math.min(h, BH - ny));
        return { nx, ny, nw, nh };
    };

    const bringToFront = () => {
        setState({ ...state, z: Date.now() });
    };

    const onDragStart = (e: React.MouseEvent) => {
        if (!editable) { return; }
        e.preventDefault();
        bringToFront();
        const startX = e.clientX; const startY = e.clientY;
        const start = { ...state };
        const move = (ev: MouseEvent) => {
            const dx = ev.clientX - startX; const dy = ev.clientY - startY;
            const { nx, ny } = clamp(start.x + dx, start.y + dy, start.w, start.h);
            setState({ ...state, x: nx, y: ny, z: Date.now() });
        };
        const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    };

    const makeResize = (dir: 'e'|'s'|'se'|'w'|'n'|'sw'|'ne'|'nw') => (e: React.MouseEvent) => {
        if (!editable) { return; }
        e.preventDefault();
        bringToFront();
        const startX = e.clientX; const startY = e.clientY; const start = { ...state };
        const move = (ev: MouseEvent) => {
            let x=start.x, y=start.y, w=start.w, h=start.h;
            const dx = ev.clientX - startX; const dy = ev.clientY - startY;
            if (dir.includes('e')) w = start.w + dx;
            if (dir.includes('s')) h = start.h + dy;
            if (dir.includes('w')) { w = start.w - dx; x = start.x + dx; }
            if (dir.includes('n')) { h = start.h - dy; y = start.y + dy; }
            const { nx, ny, nw, nh } = clamp(x,y,w,h);
            setState({ x: nx, y: ny, w: nw, h: nh, z: Date.now() });
        };
        const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    };

    return (
        <div
            ref={elRef}
            onMouseDown={bringToFront}
            style={{ position:'absolute', left: state.x, top: state.y, width: state.w, height: state.h, zIndex: state.z }}
            className={`group ${highlight ? 'focus-flash' : ''}`}
        >
            {/* Drag handle overlay */}
            {editable && (
                <div className="absolute left-0 top-0 right-0 h-8 flex items-center gap-2 px-3 text-white/90" onMouseDown={onDragStart}>
                    <div className="pointer-events-none absolute inset-0 rounded-t-2xl bg-gradient-to-r from-purple-600/70 via-fuchsia-600/60 to-indigo-600/70 opacity-90" />
                    <Move size={16} className="relative z-10" />
                    <span className="relative z-10 text-[13px] tracking-wide">{title ?? id}</span>
                </div>
            )}
            {/* Content clipping for rounded corners */}
            <div className={`w-full h-full ${editable ? 'pt-8' : ''}`}>
                {children}
            </div>
            {/* Resize handles */}
            {editable && (
                <>
                    <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize" onMouseDown={makeResize('e')} />
                    <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize" onMouseDown={makeResize('w')} />
                    <div className="absolute left-0 bottom-0 w-full h-2 cursor-ns-resize" onMouseDown={makeResize('s')} />
                    <div className="absolute left-0 top-0 w-full h-2 cursor-ns-resize" onMouseDown={makeResize('n')} />
                    <div className="absolute right-0 bottom-0 w-3 h-3 cursor-nwse-resize" onMouseDown={makeResize('se')} />
                    <div className="absolute left-0 bottom-0 w-3 h-3 cursor-nesw-resize" onMouseDown={makeResize('sw')} />
                    <div className="absolute right-0 top-0 w-3 h-3 cursor-nesw-resize" onMouseDown={makeResize('ne')} />
                    <div className="absolute left-0 top-0 w-3 h-3 cursor-nwse-resize" onMouseDown={makeResize('nw')} />
                </>
            )}
        </div>
    );
};