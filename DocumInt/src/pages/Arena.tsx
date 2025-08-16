import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronLeft, ChevronRight, BrainCircuit
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import PDFViewer from '../components/PDFViewer';
import Chat from '../components/Chat';
import PDFListSidebar from '../components/PDFListSidebar';
import PDFOutlineSidebar from '../components/PDFOutlineSidebar';
import MindMap from '../components/Mindmap';
import Insights from '../components/Insights';
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
    const [activeTab, setActiveTab] = useState('quick');
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

    // Chat state
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<{ id: string; type: "bot" | "user"; message: string; timestamp: Date; persona?: string; task?: string; results?: any[] }[]>([
        { id: crypto.randomUUID(), type: 'bot', message: 'Hello! Upload PDFs to get started, then I can help you analyze them with persona-based search!', timestamp: new Date() }
    ]);

    // Loading state
    const [isLoading, setIsLoading] = useState(true);

    // PDF list state with persistence
    const [pdfList, setPdfList] = useState<File[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Storage key for persistence
    const STORAGE_KEY = `arena_pdfs_${projectName}`;

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
                saveProjectState(projectName, { pdfFiles: pdfList, persona: undefined, task: undefined, chatHistory: chatHistory.map(m => ({ ...m, timestamp: m.timestamp })) as any });
            }
        }, 500);
        return () => clearTimeout(timeout);
    }, [pdfList, chatHistory, projectName]);

    // Handlers
    const handlePdfSelection = (file: File) => {
        const idx = pdfList.indexOf(file);
        setSelectedPdf(file);
        setPdfFileName(file.name);
        setPdfUrl(pdfUrls[idx]);
        setNavigationPage(undefined); // Reset navigation when switching PDFs
    };

    const handlePageNavigation = (page: number) => {
        console.log(`Arena: Received navigation request for page ${page}`);
        setNavigationPage(page);
    };

    // Add PDF handler
    const handleAddPdf = () => {
        fileInputRef.current?.click();
    };

    // File upload handler (add to list)
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const filesInput = event.target.files;
        if (!filesInput?.length) return;

        // Convert FileList to Array
        const newFiles = Array.from(filesInput).filter(file => file.type === 'application/pdf');

        setPdfList(prev => addNewFiles(prev, newFiles));

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
            <style>{`
                /* Hide scrollbars globally while maintaining scroll functionality */
                ::-webkit-scrollbar {
                    display: none;
                }
                
                /* Hide scrollbars for Firefox */
                * {
                    scrollbar-width: none;
                }
                
                /* Ensure smooth scrolling */
                * {
                    -ms-overflow-style: none;
                    scroll-behavior: smooth;
                }
            `}</style>
            {isLoading ? (
                <div className="h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-900 mb-4"></div>
                        <p className="text-gray-600">Loading DocumInt...</p>
                    </div>
                </div>
            ) : (
                <div className="h-screen bg-gray-50 flex flex-col relative overflow-hidden">
                    {/* Hidden file input */}
                    <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />

                    {/* Main Content Layout */}
                    <div className="flex flex-1">
                        {/* Left Sidebars Container */}
                        <div className="flex">
                            {/* PDF List Sidebar */}
                            <PDFListSidebar
                                projectName={projectName}
                                files={pdfList}
                                selectedPdf={selectedPdf}
                                onPdfSelect={handlePdfSelection}
                                isMinimized={isSidebarMinimized}
                                onToggleMinimize={() => setIsSidebarMinimized(!isSidebarMinimized)}
                                onRemovePdf={handleRemoveSidebarPdf}
                                onBack={() => navigate('/')}
                            />

                            {/* PDF Outline Sidebar */}
                            <div className={`border-r border-gray-200 transition-all duration-300 ease-in-out ${isOutlineVisible ? 'w-80' : 'w-0 overflow-hidden'
                                }`}>
                                <div className="h-full bg-gray-50 flex flex-col">
                                    <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                                        <h3 className="font-semibold text-gray-700">Document Outline</h3>
                                        <button
                                            onClick={() => setIsOutlineVisible(false)}
                                            className="p-1 hover:bg-gray-200 rounded-full"
                                            title="Hide outline"
                                        >
                                            <ChevronLeft size={18} className="text-gray-600" />
                                        </button>
                                    </div>
                                    {/* Scrollable outline content */}
                                    <div className="flex-1 overflow-hidden">
                                        <PDFOutlineSidebar
                                            pdfFile={selectedPdf}
                                            onPageNavigation={handlePageNavigation}
                                            className="h-full overflow-y-auto"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PDF Viewer with Toggle Button */}
                        <div className="flex-1 flex flex-col bg-white relative">
                            {/* Toggle Button for Outline - positioned at top-left of PDF viewer */}
                            {!isOutlineVisible && (
                                <button
                                    onClick={() => setIsOutlineVisible(true)}
                                    className="absolute top-4 -left-4 z-20 p-2 hover:bg-gray-100 rounded-full text-[#0a1653] bg-white shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl"
                                    title="Show outline"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            )}

                            <button
                                onClick={() => setIsMindmapVisible(true)}
                                className="absolute top-4 -right-90 z-30 p-2 rounded-full text-white bg-[#0a1653] shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl hover:bg-[#091240]"
                                title="Open Mindmap"
                            >
                                <BrainCircuit size={20} className="text-white" />
                            </button>


                            <PDFViewer
                                pdfFile={selectedPdf}
                                pdfUrl={pdfUrl}
                                pdfFileName={pdfFileName}
                                isAdobeLoaded={isAdobeLoaded}
                                onFileUpload={handleAddPdf}
                                navigationPage={navigationPage}
                            />
                        </div>

                        {/* Chat Panel */}
                        <div className={`lg:static lg:w-96 lg:z-auto lg:translate-x-0 flex flex-col`}>
                            <div className="p-3 pb-2 border-b border-gray-200 bg-gray-50">
                                <Insights projectName={projectName} />
                            </div>
                            <div className="min-h-0 flex-1">
                                <Chat
                                    chatHistory={chatHistory}
                                    chatMessage={chatMessage}
                                    activeTab={activeTab}
                                    pdfFiles={pdfList} // changed from original 'files' to dynamic pdfList
                                    projectName={projectName} // added to ensure backend receives project scoping
                                    onMessageChange={setChatMessage}
                                    onSendMessage={(message, persona, task, results) => {
                                        if (message.trim()) {
                                            const newMessage = {
                                                id: crypto.randomUUID(),
                                                type: 'user' as const,
                                                message,
                                                timestamp: new Date(),
                                                persona,
                                                task,
                                                results
                                            };
                                            setChatHistory(prev => [...prev, newMessage]);
                                            setChatMessage('');
                                        }
                                    }}
                                    onTabChange={setActiveTab}
                                    onNavigateToPage={handlePageNavigation}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mindmap Overlay */}
                    <div
                        className={`fixed top-0 left-0 w-full h-full bg-white z-50 transition-transform duration-500 ease-in-out ${isMindmapVisible ? 'translate-x-0' : 'translate-x-full'
                            }`}
                    >
                        {isMindmapVisible && <MindMap onClose={() => setIsMindmapVisible(false)} />}
                    </div>
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