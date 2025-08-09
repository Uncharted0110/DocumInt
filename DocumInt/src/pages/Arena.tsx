import React, { useState, useEffect, useRef } from 'react';
import {
    FileText, Plus, Trash2, Edit3, Download, Upload, RefreshCw,
    Brain, Zap, Eye, Copy, Settings, Share2, Bookmark, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ToolBar from '../components/ToolBar';
import PDFViewer from '../components/PDFViewer';
import Chat from '../components/Chat';
import PDFListSidebar from '../components/PDFListSidebar';
import PDFOutlineSidebar from '../components/PDFOutlineSidebar';

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

const Arena = () => {
    // State management
    const location = useLocation();
    const { projectName, files } = location.state as LocationState;
    const fileInputRef = useRef<HTMLInputElement>(null);

    // UI state
    const [activeToolbar, setActiveToolbar] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('quick');
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
    const [isOutlineVisible, setIsOutlineVisible] = useState(true);

    // PDF state
    const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
    const [pdfUrls, setPdfUrls] = useState<string[]>([]);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfFileName, setPdfFileName] = useState('');
    const [isAdobeLoaded, setIsAdobeLoaded] = useState(false);
    const [navigationPage, setNavigationPage] = useState<number | undefined>(undefined);
    const [PdfFile, setPdfFile] = useState<File | null>(null);

    // Chat state
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<{ id: string; type: "bot" | "user"; message: string; timestamp: Date; persona?: string; task?: string; results?: any[] }[]>([
        { id: crypto.randomUUID(), type: 'bot', message: 'Hello! Upload PDFs to get started, then I can help you analyze them with persona-based search!', timestamp: new Date() }
    ]);

    // Custom bookmarks state
    const [customBookmarks, setCustomBookmarks] = useState<Array<{
        id: string;
        title: string;
        page: number;
        level: "H1" | "H2" | "H3";
        isCustom: boolean;
        color?: string;
    }>>([]);

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
                    setPdfFile(firstPdf);
                    setPdfFileName(firstPdf.name);
                }
            } else {
                // First time initialization
                setPdfList(files || []);

                if (files && files.length > 0) {
                    const firstPdf = files[0];
                    setSelectedPdf(firstPdf);
                    setPdfFile(firstPdf);
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
                setPdfFile(firstPdf);
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

    const handleAddBookmark = React.useCallback((bookmark: {
        title: string;
        page: number;
        level: "H1" | "H2" | "H3";
        isCustom: boolean;
        color?: string;
    }) => {
        const newBookmark = {
            ...bookmark,
            id: crypto.randomUUID()
        };
        setCustomBookmarks(prev => [...prev, newBookmark]);
        
        // Optionally save to localStorage or backend
        try {
            const saved = localStorage.getItem(`bookmarks-${pdfFileName}`);
            const existing = saved ? JSON.parse(saved) : [];
            const updated = [...existing, newBookmark];
            localStorage.setItem(`bookmarks-${pdfFileName}`, JSON.stringify(updated));
        } catch (error) {
            console.warn('Failed to save bookmark:', error);
        }
    }, [pdfFileName]);

    const handleDeleteBookmark = React.useCallback((bookmarkId: string) => {
        setCustomBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
        
        // Optionally remove from localStorage or backend
        try {
            const saved = localStorage.getItem(`bookmarks-${pdfFileName}`);
            if (saved) {
                const existing = JSON.parse(saved);
                const updated = existing.filter((b: any) => b.id !== bookmarkId);
                localStorage.setItem(`bookmarks-${pdfFileName}`, JSON.stringify(updated));
            }
        } catch (error) {
            console.warn('Failed to delete bookmark:', error);
        }
    }, [pdfFileName]);

    // Load custom bookmarks when PDF changes
    React.useEffect(() => {
        if (pdfFileName) {
            try {
                const saved = localStorage.getItem(`bookmarks-${pdfFileName}`);
                if (saved) {
                    const bookmarks = JSON.parse(saved);
                    setCustomBookmarks(bookmarks);
                } else {
                    setCustomBookmarks([]);
                }
            } catch (error) {
                console.warn('Failed to load bookmarks:', error);
                setCustomBookmarks([]);
            }
        }
    }, [pdfFileName]);
    const toolbarOptions = [
        {
            id: 'pdf',
            title: 'PDF',
            icon: <FileText size={20} />,
            actions: [
                { id: 'add-pdf', icon: <Plus size={18} />, title: 'Add PDF', desc: 'Upload new PDF' },
                { id: 'delete-pdf', icon: <Trash2 size={18} />, title: 'Delete PDF', desc: 'Remove current PDF' },
                { id: 'download-pdf', icon: <Download size={18} />, title: 'Download PDF', desc: 'Save PDF locally' }
            ]
        },
        {
            id: 'mindmap',
            title: 'Mindmap',
            icon: <Brain size={20} />,
            actions: [
                { id: 'create-mindmap', icon: <Plus size={18} />, title: 'Create Mindmap', desc: 'Generate mindmap from document' },
                { id: 'view-mindmap', icon: <Eye size={18} />, title: 'View Mindmap', desc: 'Open existing mindmap' },
                { id: 'export-mindmap', icon: <Download size={18} />, title: 'Export Mindmap', desc: 'Save mindmap as image' }
            ]
        },
        {
            id: 'conversion',
            title: 'Conversion',
            icon: <RefreshCw size={20} />,
            actions: [
                { id: 'to-word', icon: <Upload size={18} />, title: 'To Word', desc: 'Convert to DOCX format' },
                { id: 'to-text', icon: <Copy size={18} />, title: 'To Text', desc: 'Extract plain text' },
                { id: 'to-html', icon: <Edit3 size={18} />, title: 'To HTML', desc: 'Convert to web format' }
            ]
        },
        {
            id: 'summary',
            title: 'Summary',
            icon: <Zap size={20} />,
            actions: [
                { id: 'generate-summary', icon: <Plus size={18} />, title: 'Generate Summary', desc: 'AI-powered summary' },
                { id: 'key-points', icon: <Eye size={18} />, title: 'Key Points', desc: 'Extract main points' },
                { id: 'export-summary', icon: <Download size={18} />, title: 'Export Summary', desc: 'Save summary as document' }
            ]
        },
        {
            id: 'search',
            title: 'Search',
            icon: <Search size={20} />,
            actions: [
                { id: 'full-text-search', icon: <Search size={18} />, title: 'Full Text Search', desc: 'Search through entire document' },
                { id: 'semantic-search', icon: <Brain size={18} />, title: 'Semantic Search', desc: 'AI-powered content search' },
                { id: 'bookmarks', icon: <Bookmark size={18} />, title: 'Bookmarks', desc: 'Manage document bookmarks' }
            ]
        },
        {
            id: 'sharing',
            title: 'Share',
            icon: <Share2 size={20} />,
            actions: [
                { id: 'share-link', icon: <Share2 size={18} />, title: 'Share Link', desc: 'Generate shareable link' },
                { id: 'export-share', icon: <Download size={18} />, title: 'Export & Share', desc: 'Export and share document' },
                { id: 'collaborate', icon: <Eye size={18} />, title: 'Collaborate', desc: 'Enable collaborative editing' }
            ]
        },
        {
            id: 'settings',
            title: 'Settings',
            icon: <Settings size={20} />,
            actions: [
                { id: 'preferences', icon: <Settings size={18} />, title: 'Preferences', desc: 'Configure app settings' },
                { id: 'themes', icon: <Eye size={18} />, title: 'Themes', desc: 'Change app appearance' },
                { id: 'shortcuts', icon: <Plus size={18} />, title: 'Shortcuts', desc: 'View keyboard shortcuts' }
            ]
        }
    ];

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

        setPdfList(prev => {
            const updatedList = [...prev];

            newFiles.forEach(file => {
                const exists = updatedList.some(
                    existingFile => existingFile.name === file.name && existingFile.size === file.size
                );
                if (!exists) {
                    updatedList.push(file);
                }
            });

            return updatedList;
        });

        // If the user selected only one file and it's new, set it as selected
        if (newFiles.length === 1) {
            const file = newFiles[0];
            const alreadyExists = pdfList.some(
                existingFile => existingFile.name === file.name && existingFile.size === file.size
            );
            if (!alreadyExists) {
                setSelectedPdf(file);
                setPdfFile(file);
                setPdfFileName(file.name);
                setNavigationPage(undefined);
            }
        }

        // Reset input so the same files can be chosen again later
        event.target.value = '';
    };



    // Improved Delete PDF handler
    const handleDeletePdf = () => {
        if (!selectedPdf || pdfList.length === 0) return;

        const currentIndex = pdfList.indexOf(selectedPdf);
        if (currentIndex === -1) return;

        const newList = pdfList.filter((_, i) => i !== currentIndex);
        setPdfList(newList);

        if (newList.length === 0) {
            // No PDFs left
            setSelectedPdf(null);
            setPdfFile(null);
            setPdfFileName('');
            setPdfUrl(null);
        } else {
            // Select the next PDF or previous if it was the last one
            let newSelectedIndex;
            if (currentIndex < newList.length) {
                // Select the next PDF (same index in new array)
                newSelectedIndex = currentIndex;
            } else {
                // Select the previous PDF (last PDF was deleted)
                newSelectedIndex = newList.length - 1;
            }

            const newSelectedPdf = newList[newSelectedIndex];
            setSelectedPdf(newSelectedPdf);
            setPdfFile(newSelectedPdf);
            setPdfFileName(newSelectedPdf.name);
            setNavigationPage(undefined);
        }
    };

    // Download PDF handler
    const handleDownloadPdf = () => {
        if (!selectedPdf) return;
        const idx = pdfList.indexOf(selectedPdf);
        const url = pdfUrls[idx];
        if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = selectedPdf.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Toolbar action dispatcher
    const handleToolbarAction = (actionId: string, toolId: string) => {
        if (toolId === 'pdf') {
            if (actionId === 'add-pdf') handleAddPdf();
            if (actionId === 'delete-pdf') handleDeletePdf();
            if (actionId === 'download-pdf') handleDownloadPdf();
        }
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
            setPdfFile(null);
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
            setPdfFile(newSelectedPdf);
            setPdfFileName(newSelectedPdf.name);
            setNavigationPage(undefined);
        }
    };

    // Update the return statement to show loading state
    return (
        <>
            {isLoading ? (
                <div className="h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-900 mb-4"></div>
                        <p className="text-gray-600">Loading DocumInt...</p>
                    </div>
                </div>
            ) : (
                <div className="h-screen bg-gray-50 flex flex-col">
                    {/* Hidden file input */}
                    <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />

                    {/* Top Header Toolbar */}
                    <ToolBar
                        toolbarOptions={toolbarOptions}
                        activeToolbar={activeToolbar}
                        onToggleToolbar={(toolId: string) => setActiveToolbar(activeToolbar === toolId ? null : toolId)}
                        onCloseToolbar={() => setActiveToolbar(null)}
                        onActionClick={handleToolbarAction}
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
                        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
                            <Chat
                                chatHistory={chatHistory}
                                chatMessage={chatMessage}
                                activeTab={activeTab}
                                pdfFiles={files}
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
            )}
        </>
    );
};

export default Arena;