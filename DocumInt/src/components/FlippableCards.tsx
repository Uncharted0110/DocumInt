import React, { useState } from 'react';
import { RotateCcwIcon, RotateCw } from 'lucide-react';

export type FlippableCardItem = {
    id: string;
    frontTitle: string;
    frontSubtitle?: string;
    frontIcon?: React.ReactNode;
    accentColor?: string; // Tailwind classes for front bg/border
    backContent: React.ReactNode;
    // Optional expanded content
    frontExpandedContent?: React.ReactNode;
    backExpandedContent?: React.ReactNode;
};

interface FlippableCardsProps {
    items: FlippableCardItem[];
    className?: string;
    collapsedHeightClass?: string; // Tailwind height for collapsed state
    expandedHeightClass?: string;  // Tailwind height for expanded state
}

const FlippableCards: React.FC<FlippableCardsProps> = ({
    items,
    className,
    collapsedHeightClass = 'h-28',
    expandedHeightClass = 'h-80',
}) => {
    const [flipped, setFlipped] = useState<Record<string, boolean>>({});
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const toggleFlip = (id: string) =>
        setFlipped(prev => ({ ...prev, [id]: !prev[id] }));

    const toggleExpanded = (id: string) =>
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    return (
        <div className={['w-full', className].filter(Boolean).join(' ')}>
            <div className="flex flex-col gap-3">
                {items.map(item => {
                    const isFlipped = !!flipped[item.id];
                    const isExpanded = !!expanded[item.id];

                    return (
                        <div
                            key={item.id}
                            role="button"
                            aria-expanded={isExpanded}
                            tabIndex={0}
                            onClick={() => toggleExpanded(item.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleExpanded(item.id);
                                }
                            }}
                            className={[
                                'relative w-full cursor-pointer select-none [perspective:1000px]',
                                'rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400',
                                'transition-all duration-300',
                                isExpanded ? expandedHeightClass : collapsedHeightClass
                            ].join(' ')}
                        >
                            {/* Flip button (does not trigger expand) */}
                            <button
                                type="button"
                                aria-pressed={isFlipped}
                                aria-label={isFlipped ? 'Flip back' : 'Flip card'}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFlip(item.id);
                                }}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="absolute right-2 top-2 z-10 text-[11px] px-2 py-1 "
                            >
                                {isFlipped ? <RotateCw size={16} /> : <RotateCcwIcon size={16} />}

                            </button>

                            <div
                                className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
                                style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                            >
                                {/* Front */}
                                <div className={['absolute inset-0 rounded-lg border bg-white p-3 shadow-sm [backface-visibility:hidden]', item.accentColor || ''].join(' ')}>
                                    {/* Collapsed Front Header */}
                                    <div className="flex items-center gap-3">
                                        {item.frontIcon && (
                                            <div className="flex-shrink-0 text-indigo-600">
                                                {item.frontIcon}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="font-semibold text-gray-800 truncate">{item.frontTitle}</div>
                                            {item.frontSubtitle && (
                                                <div className="text-xs text-gray-500 truncate">{item.frontSubtitle}</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Front Content (optional) */}
                                    {isExpanded && item.frontExpandedContent && (
                                        <div className="mt-3 text-sm text-gray-700 overflow-auto h-[calc(100%-2rem)] pr-1">
                                            {item.frontExpandedContent}
                                        </div>
                                    )}

                                    <div className="absolute bottom-2 right-2 text-[11px] text-gray-400">
                                        {isExpanded ? 'Click to collapse' : 'Click to expand'}
                                    </div>
                                </div>

                                {/* Back */}
                                <div className="absolute inset-0 rounded-lg border bg-white p-3 shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                    {/* Back content: show expanded variant if expanded and provided */}
                                    <div className="h-full w-full overflow-hidden">
                                        <div className="text-xs text-gray-700 leading-snug space-y-1 overflow-auto h-full pr-1">
                                            {isExpanded && item.backExpandedContent
                                                ? item.backExpandedContent
                                                : item.backContent}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2 right-2 text-[11px] text-gray-400">
                                        {isExpanded ? 'Click to collapse' : 'Click to expand'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FlippableCards;