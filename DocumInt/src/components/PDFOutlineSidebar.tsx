import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, FileText, Hash, Book, Star } from 'lucide-react';

interface OutlineItem {
  level: "H1" | "H2" | "H3";
  text: string;
  page: number;
}

interface CustomBookmark {
  id: string;
  title: string;
  page: number;
  level: "H1" | "H2" | "H3";
  isCustom: boolean;
  color?: string;
}

interface PDFOutlineData {
  title: string;
  outline: OutlineItem[];
}

interface PDFOutlineSidebarProps {
  pdfFile: File | null;
  onPageNavigation: (page: number) => void;
  className?: string;
  customBookmarks?: CustomBookmark[];
  onAddBookmark?: (bookmark: Omit<CustomBookmark, 'id'>) => void;
  onDeleteBookmark?: (bookmarkId: string) => void;
}

const PDFOutlineSidebar: React.FC<PDFOutlineSidebarProps> = ({
  pdfFile,
  onPageNavigation,
  className = "",
  customBookmarks = [],
}) => {
  const [outlineData, setOutlineData] = useState<PDFOutlineData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [, setCurrentPage] = useState(1);

  // Merge extracted outline with custom bookmarks
  const mergedOutline = React.useMemo(() => {
    const extracted = outlineData?.outline || [];
    const combined = [
      ...extracted.map(item => ({
        ...item,
        id: `outline-${item.text}-${item.page}`,
        isCustom: false as const
      })),
      ...customBookmarks.map(bookmark => ({
        level: bookmark.level,
        text: bookmark.title, // Map title to text
        page: bookmark.page,
        id: bookmark.id,
        isCustom: bookmark.isCustom,
        color: bookmark.color
      }))
    ];
    
    // Sort by page number
    return combined.sort((a, b) => a.page - b.page);
  }, [outlineData, customBookmarks]);

  // Extract outline when PDF file changes
  useEffect(() => {
    if (pdfFile) {
      extractOutline(pdfFile);
    } else {
      setOutlineData(null);
      setError(null);
    }
  }, [pdfFile]);

  const extractOutline = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/extract-outline', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setOutlineData(data);
      
      // Auto-expand H1 sections by default
      const h1Sections = new Set<string>(
        data.outline
          .filter((item: OutlineItem) => item.level === 'H1')
          .map((item: OutlineItem) => item.text)
      );
      setExpandedSections(h1Sections);
      
    } catch (err) {
      console.error('Error extracting outline:', err);
      setError('Failed to extract outline from PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (sectionText: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionText)) {
      newExpanded.delete(sectionText);
    } else {
      newExpanded.add(sectionText);
    }
    setExpandedSections(newExpanded);
  };

  const handleItemClick = (page: number, itemText: string, isToggle: boolean = false) => {
    console.log(`Outline sidebar: Navigating to page ${page + 1} (0-based index: ${page})`);
    
    // Set active item for visual feedback
    setActiveItem(itemText);
    setCurrentPage(page + 1);
    
    // Clear active state after a moment
    setTimeout(() => setActiveItem(null), 2000);
    
    // Navigate to the page
    onPageNavigation(page);
    
    // Add visual feedback to the clicked element
    const clickedElement = document.activeElement as HTMLElement;
    if (clickedElement && !isToggle) {
      clickedElement.style.backgroundColor = '#dbeafe';
      clickedElement.style.transform = 'scale(0.98)';
      clickedElement.style.transition = 'all 0.2s ease';
      
      setTimeout(() => {
        clickedElement.style.backgroundColor = '';
        clickedElement.style.transform = '';
      }, 300);
    }
  };

  const getIndentClass = (level: string) => {
    switch (level) {
      case 'H1': return 'pl-2';
      case 'H2': return 'pl-6';
      case 'H3': return 'pl-10';
      default: return 'pl-2';
    }
  };

  const getIconForLevel = (level: string, isCustom?: boolean) => {
    if (isCustom) {
      return <Star size={14} className="text-yellow-500" />;
    }
    switch (level) {
      case 'H1': return <Book size={16} className="text-blue-600" />;
      case 'H2': return <FileText size={14} className="text-green-600" />;
      case 'H3': return <Hash size={12} className="text-purple-600" />;
      default: return <FileText size={14} className="text-gray-600" />;
    }
  };

  const groupOutlineByH1 = (outline: (OutlineItem & { id?: string; isCustom?: boolean; color?: string })[]) => {
    const groups: { 
      h1: (OutlineItem & { id?: string; isCustom?: boolean; color?: string }) | null; 
      children: (OutlineItem & { id?: string; isCustom?: boolean; color?: string })[] 
    }[] = [];
    let currentGroup: { 
      h1: (OutlineItem & { id?: string; isCustom?: boolean; color?: string }) | null; 
      children: (OutlineItem & { id?: string; isCustom?: boolean; color?: string })[] 
    } = { h1: null, children: [] };

    outline.forEach(item => {
      if (item.level === 'H1') {
        if (currentGroup.h1 || currentGroup.children.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = { h1: item, children: [] };
      } else {
        currentGroup.children.push(item);
      }
    });

    if (currentGroup.h1 || currentGroup.children.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  };

  if (!pdfFile) {
    return (
      <div className={`bg-gray-50 border-r border-gray-200 h-full flex flex-col ${className}`}>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <FileText size={48} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">No PDF loaded</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col h-full ${className}`}>
      {/* Header */}
      

      {/* Content - Independently scrollable */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          {isLoading && (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-xs text-gray-500">Extracting outline...</p>
            </div>
          )}

          {error && (
            <div className="p-4 text-center">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          {(outlineData || customBookmarks.length > 0) && !isLoading && (
            <div className="py-2">
              {mergedOutline.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-500">No outline or bookmarks found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {groupOutlineByH1(mergedOutline).map((group, groupIndex) => (
                    <div key={`group-${groupIndex}-${group.h1?.text || 'orphaned'}`}>
                      {/* H1 Section Header */}
                      {group.h1 && (
                        <div>
                          <div className="flex">
                            {/* Toggle button for sections with children */}
                            {group.children.length > 0 && (
                              <button
                                onClick={() => toggleSection(group.h1!.text)}
                                className="p-2 hover:bg-gray-50 flex items-center justify-center transition-colors flex-shrink-0"
                                aria-label="Toggle section"
                              >
                                {expandedSections.has(group.h1.text) ? 
                                  <ChevronDown size={14} className="text-gray-400" /> : 
                                  <ChevronRight size={14} className="text-gray-400" />
                                }
                              </button>
                            )}
                            
                            {/* Main navigation button */}
                            <button
                              onClick={() => handleItemClick(group.h1!.page, group.h1!.text)}
                              className={`flex-1 flex items-center justify-between p-2 hover:bg-gray-50 text-left group transition-colors min-w-0 ${
                                activeItem === group.h1.text ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                              } ${group.children.length === 0 ? 'ml-8' : ''}`}
                            >
                              <div className="flex items-center min-w-0 flex-1">
                                <div className="flex-shrink-0">
                                  {getIconForLevel(group.h1.level, group.h1.isCustom)}
                                </div>
                                <span className={`ml-2 text-sm font-medium truncate ${
                                  group.h1.isCustom ? 'text-blue-700' : 'text-gray-800'
                                }`} title={group.h1.text}>
                                  {group.h1.text}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex-shrink-0 ml-2">
                                  {group.h1.page + 1}
                                </span>
                              </div>
                            </button>
                          </div>

                          {/* H2 and H3 children */}
                          {group.children.length > 0 && expandedSections.has(group.h1.text) && (
                            <div className="border-l-2 border-blue-100 ml-4">
                              {group.children.map((item, itemIndex) => (
                                <button
                                  key={`${item.text}-${item.page}-${itemIndex}`}
                                  onClick={() => handleItemClick(item.page, `${item.level}-${item.text}`)}
                                  className={`w-full flex items-center justify-between p-1.5 hover:bg-gray-50 text-left group transition-colors min-w-0 ${getIndentClass(item.level)} ${
                                    activeItem === `${item.level}-${item.text}` ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                                  }`}
                                >
                                  <div className="flex items-center min-w-0 flex-1">
                                    <div className="flex-shrink-0">
                                      {getIconForLevel(item.level, item.isCustom)}
                                    </div>
                                    <span className={`ml-2 text-xs truncate ${
                                      item.isCustom ? 'text-blue-700' : 'text-gray-700'
                                    }`} title={item.text}>
                                      {item.text}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0 ml-2">
                                      {item.page + 1}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Orphaned H2/H3 items (no parent H1) */}
                      {!group.h1 && group.children.map((item, itemIndex) => (
                        <button
                          key={`orphaned-${item.text}-${item.page}-${itemIndex}`}
                          onClick={() => handleItemClick(item.page, `orphaned-${item.text}`)}
                          className={`w-full flex items-center justify-between p-2 hover:bg-gray-50 text-left group transition-colors min-w-0 ${getIndentClass(item.level)} ${
                            activeItem === `orphaned-${item.text}` ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-center min-w-0 flex-1">
                            <div className="flex-shrink-0">
                              {getIconForLevel(item.level, item.isCustom)}
                            </div>
                            <span className={`ml-2 text-sm truncate ${
                              item.isCustom ? 'text-blue-700' : 'text-gray-700'
                            }`} title={item.text}>
                              {item.text}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {item.page + 1}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PDFOutlineSidebar;