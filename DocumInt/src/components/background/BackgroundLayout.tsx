import { type PropsWithChildren } from "react";
import { createPortal } from "react-dom";
import AnimatedBackground from "./AnimatedBackground";
import GradientOverlays from "./GradientOverlays";
import FloatingShapes from "./FloatingShapes";
import FloatingDocuments from "./FloatingDocuments";
import DataFlowLines from "./DataFlowLines";
import FloatingCharts from "./FloatingCharts";
import AIElements from "./AIElements";
import AdditionalElements from "./AdditionalElements";

const BackgroundCanvas = () => (
  <div className="fixed inset-0 pointer-events-none z-0">
    {/* Order them as you prefer; all stay pinned to the viewport */}
    <AnimatedBackground />
    <GradientOverlays />
    <FloatingShapes />
    <FloatingDocuments />
    <DataFlowLines />
    <FloatingCharts />
    <AIElements />
    <AdditionalElements />
  </div>
);

const BackgroundLayout = ({ children }: PropsWithChildren) => {
  return (
    <>
      {typeof document !== "undefined" ? createPortal(<BackgroundCanvas />, document.body) : null}
      <div className="relative z-10 min-h-screen overflow-x-hidden">
        {children}
      </div>
    </>
  );
};

export default BackgroundLayout;