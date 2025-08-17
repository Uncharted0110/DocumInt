import { useEffect, useRef, useState } from 'react';
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { cn } from '../lib/utils';

export default function ScrollLayer(props: any) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [, setIsActive] = useState(props.layerIndex === 0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (!layerRef.current) return;

      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const layerTop = props.layerIndex * windowHeight;
      const layerBottom = layerTop + windowHeight;

      // Calculate progress for this layer (0 to 1)
      let progress = 0;
      if (scrollTop >= layerTop && scrollTop <= layerBottom) {
        progress = (scrollTop - layerTop) / windowHeight;
        setIsActive(true);
      } else if (scrollTop > layerBottom) {
        progress = 1;
        setIsActive(false);
      } else {
        setIsActive(props.layerIndex === 0);
      }

      setScrollProgress(progress);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [props.layerIndex]);

  const scale = 1 + (scrollProgress * 1.5); // Scale from 1 to 2.5 (grows out of screen)
  
  // Only show layer if it's the current active one or if previous layer is completely gone
  const currentLayerScroll = window.scrollY / window.innerHeight;
  const shouldShow = currentLayerScroll >= props.layerIndex && currentLayerScroll < props.layerIndex + 1;
  const opacity = shouldShow ? Math.max(0, 1 - scrollProgress) : 0;

  // Visible only while the second layer is in view
  const showProjectsButton =
    props.layerIndex === 1 &&
    shouldShow;

  // Scale the button with scroll: 1.0 -> 1.25 -> 1.0 across the layer
  const p = Math.min(1, Math.max(0, scrollProgress));
  const buttonScale = 1 + 0.25 * Math.sin(p * Math.PI); // peak at mid-scroll

  return (
    <div
      ref={layerRef}
      className={cn(
        "fixed inset-0 w-full h-screen flex flex-col items-center justify-center transition-all duration-300 ease-smooth",
        props.className
      )}
      style={{
        transform: `scale(${scale})`,
        opacity,
        zIndex: 10 - props.layerIndex,
      }}
    >
      <>
        {props.children}

        {/* Floating Projects button for the second layer */}
        {showProjectsButton && typeof document !== "undefined" &&
          createPortal(
            props.floatingButtonRelative ? (
              // Relative: center at top using a fixed, full-width flex container
              <div className="fixed inset-x-0 top-4 z-[2147483647] pointer-events-none flex justify-center">
                <div
                  className="pointer-events-auto transition-transform duration-150 will-change-transform"
                  style={{ transform: `scale(${buttonScale}) translateZ(0)` }}
                >
                  <button
                    type="button"
                    onClick={() => navigate("/projects")}
                    className="px-6 py-3 rounded-lg bg-white/90 hover:bg-white text-gray-900 shadow-lg border border-white/30 backdrop-blur-md transition"
                  >
                    Projects
                  </button>
                </div>
              </div>
            ) : (
              // Absolute: top-center with optional override via floatingButtonPositionClass
              <div className="fixed inset-0 z-[2147483647] pointer-events-none">
                <div
                  className={cn(
                    "absolute pointer-events-auto",
                    props.floatingButtonPositionClass || "bottom-25 left-1/2 -translate-x-1/2 origin-top"
                  )}
                >
                  <div
                    className="transition-transform duration-150 will-change-transform"
                    style={{ transform: `scale(${buttonScale}) translateZ(0)` }}
                  >
                    <button
                      type="button"
                      onClick={() => navigate("/projects")}
                      className="px-6 py-3 rounded-lg bg-white/90 hover:bg-white text-gray-900 shadow-lg border border-white/30 backdrop-blur-md transition"
                    >
                      Go to My Projects
                    </button>
                  </div>
                </div>
              </div>
            ),
            document.body
          )
        }
      </>
    </div>
  );
};
