import React, { useState, useRef } from 'react';
import { FlipHorizontal2, X } from 'lucide-react';

export type FlippableCardItem = {
  id: string;
  frontTitle: string;
  frontSubtitle?: string;
  frontIcon?: React.ReactNode;
  accentColor?: string;
  backContent?: React.ReactNode;
  frontExpandedContent?: React.ReactNode;
  backExpandedContent?: React.ReactNode;
  audio?: {
    sources: { src: string; type?: string }[];
    title?: string;
    autoPlayOnFlip?: boolean;
    loop?: boolean;
  };
};

interface FlippableCardsProps {
  items: FlippableCardItem[];
  className?: string;
  collapsedHeightClass?: string;
  expandedHeightClass?: string;
  onFlip?: (id: string, flipped: boolean) => void; // NEW
  onDelete?: (id: string) => void; // NEW: Delete callback
}

const FlippableCards: React.FC<FlippableCardsProps> = ({
  items,
  className,
  collapsedHeightClass = 'h-28',
  expandedHeightClass = 'h-80',
  onFlip,
  onDelete,
}) => {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const stopAudio = (id: string) => {
    const audio = audioRefs.current[id];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  return (
    <div className={['w-full', className].filter(Boolean).join(' ')}>
      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const isFlipped = !!flipped[item.id];
          const isExpanded = !!expanded[item.id];

          const toggleExpanded = (id: string) => {
            const next = !isExpanded;
            setExpanded((p) => ({ ...p, [id]: next }));
            if (!next) stopAudio(id);
          };

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
                isExpanded ? expandedHeightClass : collapsedHeightClass,
              ].join(' ')}
            >
              {/* Flip icon button */}
              <button
                type="button"
                aria-pressed={isFlipped}
                aria-label={isFlipped ? 'Flip back' : 'Flip card'}
                title={isFlipped ? 'Flip back' : 'Flip card'}
                onClick={(e) => {
                  e.stopPropagation();
                  const next = !isFlipped;
                  setFlipped((p) => ({ ...p, [item.id]: next }));
                  onFlip?.(item.id, next); // notify parent
                  if (!next) stopAudio(item.id);
                }}
                onKeyDown={(e) => e.stopPropagation()}
                className="absolute right-2 top-2 z-10 px-2 py-1 rounded-md border bg-white/80 hover:bg-white shadow-sm"
              >
                <FlipHorizontal2 size={14} className={isFlipped ? 'text-indigo-600' : 'text-gray-600'} />
              </button>

              {/* Delete button */}
              {onDelete && (
                <button
                  type="button"
                  aria-label="Delete insight"
                  title="Delete insight"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="absolute right-12 top-2 z-10 px-2 py-1 rounded-md border bg-white/80 hover:bg-red-50 shadow-sm hover:border-red-200"
                >
                  <X size={14} className="text-gray-600 hover:text-red-600" />
                </button>
              )}

              <div
                className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
                style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
              >
                {/* Front */}
                <div className={['absolute inset-0 rounded-lg border bg-white p-3 shadow-sm [backface-visibility:hidden]', item.accentColor || ''].join(' ')}>
                  <div className="flex items-center gap-3">
                    {item.frontIcon && <div className="flex-shrink-0 text-indigo-600">{item.frontIcon}</div>}
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 truncate">{item.frontTitle}</div>
                      {item.frontSubtitle && <div className="text-xs text-gray-500 truncate">{item.frontSubtitle}</div>}
                    </div>
                  </div>

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
                  <div className="h-full w-full overflow-hidden">
                    <div className="flex flex-col gap-2 h-full overflow-auto pr-1">
                      {item.audio && item.audio.sources?.length ? (
                        <div className="w-full">
                          {item.audio.title && <div className="text-xs text-gray-600 mb-1 truncate">{item.audio.title}</div>}
                          <audio
                            ref={(el) => {
                              audioRefs.current[item.id] = el;
                            }}
                            controls
                            loop={!!item.audio.loop}
                            preload="metadata"
                            className="w-full"
                          >
                            {item.audio.sources.map((s, i) => (
                              <source key={i} src={s.src} type={s.type} />
                            ))}
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      ) : null}

                      <div className="text-xs text-gray-700 leading-snug space-y-1">
                        {isExpanded && item.backExpandedContent ? item.backExpandedContent : item.backContent}
                      </div>
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