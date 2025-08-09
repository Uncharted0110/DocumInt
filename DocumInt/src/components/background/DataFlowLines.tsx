const DataFlowLines = () => {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-8" viewBox="0 0 800 600">
      <path d="M100,100 Q200,50 300,100 T500,150" stroke="url(#gradient1)" strokeWidth="3" fill="none">
        <animate attributeName="stroke-dasharray" values="0,1000;1000,0;0,1000" dur="8s" repeatCount="indefinite" />
      </path>
      <path d="M600,400 Q500,350 400,400 T200,450" stroke="url(#gradient2)" strokeWidth="3" fill="none">
        <animate attributeName="stroke-dasharray" values="0,800;800,0;0,800" dur="10s" repeatCount="indefinite" />
      </path>
      <path d="M150,500 Q300,450 450,500 T700,400" stroke="url(#gradient3)" strokeWidth="2" fill="none">
        <animate attributeName="stroke-dasharray" values="0,1200;1200,0;0,1200" dur="12s" repeatCount="indefinite" />
      </path>
      <circle cx="300" cy="100" r="3" fill="#3b82f6" opacity="0.3">
        <animate attributeName="r" values="2;5;2" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="500" cy="150" r="2" fill="#6366f1" opacity="0.4">
        <animate attributeName="r" values="1;4;1" dur="4s" repeatCount="indefinite" />
      </circle>
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
          <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
          <stop offset="50%" stopColor="#6366f1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
          <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default DataFlowLines;