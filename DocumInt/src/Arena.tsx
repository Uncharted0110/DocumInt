import React, { useState, useEffect, useRef } from 'react';
import {
    FileText, Plus, Trash2, Edit3, Download, Upload, RefreshCw,
    Brain, Zap, Eye, Copy, Settings, Share2, Bookmark, Search, File
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ToolBar from './components/ToolBar';
import PDFViewer from './components/PDFViewer';
import Chat from './components/Chat';
import PDFListSidebar from './components/PDFListSidebar';

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

    // PDF state
    const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
    const [pdfUrls, setPdfUrls] = useState<string[]>([]);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfFileName, setPdfFileName] = useState('');
    const [isAdobeLoaded, setIsAdobeLoaded] = useState(false);

    // Chat state
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory] = useState<{ id: string; type: "bot" | "user"; message: string; }[]>([
        { id: crypto.randomUUID(), type: 'bot', message: 'Hello! Upload a PDF to get started, then I can help you analyze it!' }
    ]);

    // Load Adobe PDF Embed API
    useEffect(() => {
        if (window.AdobeDC) {
            setIsAdobeLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://documentservices.adobe.com/view-sdk/viewer.js';
        script.onload = () => setIsAdobeLoaded(true);
        script.onerror = () => console.error('Failed to load Adobe PDF Embed API');
        document.head.appendChild(script);
    }, []);

    // Initialize PDFs
    // Replace the existing useEffect for PDF initialization
    useEffect(() => {
        if (files && files.length > 0) {
            // Create URLs for all PDFs
            const urls = files.map(file => URL.createObjectURL(file));
            setPdfUrls(urls);

            // Select and load the first PDF by default
            const firstPdf = files[0];
            setSelectedPdf(firstPdf);
            setPdfFile(firstPdf);
            setPdfFileName(firstPdf.name);
            setPdfUrl(urls[0]);
        }

        // Cleanup function to revoke URLs on unmount
        return () => {
            pdfUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, []); // Empty dependency array to run only once on mount

    // Handlers
    const handlePdfSelection = (file: File) => {
        setSelectedPdf(file);
        setPdfFile(file);
        setPdfFileName(file.name);
        setPdfUrl(pdfUrls[files.indexOf(file)]);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files?.length) return;

        const file = files[0];
        if (file.type === 'application/pdf') {
            setPdfFile(file);
            setPdfFileName(file.name);
            setPdfUrl(URL.createObjectURL(file));
        }
    };

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

    return (
        <div className="h-screen bg-gray-50 flex flex-col">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
            />

            {/* Top Header Toolbar */}
            <ToolBar
                toolbarOptions={toolbarOptions}
                activeToolbar={activeToolbar}
                onToggleToolbar={(toolId: string) => setActiveToolbar(activeToolbar === toolId ? null : toolId)}
                onCloseToolbar={() => setActiveToolbar(null)}
                onActionClick={() => { }}
            />

            {/* Main Content Layout */}
            <div className="flex flex-1">
                <PDFListSidebar
                    projectName={projectName}
                    files={files}
                    selectedPdf={selectedPdf}
                    onPdfSelect={handlePdfSelection}
                />

                <div className="flex-1 flex flex-col bg-white">
                    <PDFViewer
                        pdfFile={selectedPdf}
                        pdfUrl={pdfUrl}
                        pdfFileName={pdfFileName}
                        isAdobeLoaded={isAdobeLoaded}
                        onFileUpload={() => fileInputRef.current?.click()}
                    />
                </div>

                <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
                    <Chat
                        chatHistory={chatHistory}
                        chatMessage={chatMessage}
                        activeTab={activeTab}
                        pdfFile={pdfFile}
                        onMessageChange={setChatMessage}
                        onSendMessage={() => { }}
                        onTabChange={setActiveTab}
                    />
                </div>
            </div>
        </div>
    );
};

export default Arena;