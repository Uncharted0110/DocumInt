import FloatingDocuments from './FloatingDocuments';
import FloatingCharts from './FloatingCharts';
import AIElements from './AIElements';
import DataFlowLines from './DataFlowLines';
import FloatingShapes from './FloatingShapes';
import AdditionalElements from './AdditionalElements';

interface AnimatedBackgroundProps {
  className?: string;
}

const AnimatedBackground = ({ className = "" }: AnimatedBackgroundProps) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <FloatingDocuments />
      <FloatingCharts />
      <AIElements />
      <DataFlowLines />
      <FloatingShapes />
      <AdditionalElements />
    </div>
  );
};

export default AnimatedBackground;