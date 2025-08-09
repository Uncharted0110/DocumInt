import { ReactNode } from 'react';
import AnimatedBackground from './AnimatedBackground';
import GradientOverlays from './GradientOverlays';

interface BackgroundLayoutProps {
  children: ReactNode;
  className?: string;
}

const BackgroundLayout = ({ children, className = "" }: BackgroundLayoutProps) => {
  return (
    <div className={`min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 ${className}`}>
      <AnimatedBackground />
      {children}
      <GradientOverlays />
    </div>
  );
};

export default BackgroundLayout;