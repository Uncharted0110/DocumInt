const AIElements = () => {
  return (
    <>
      {/* AI Brain/Neural Network Nodes */}
      <div className="absolute top-60 left-40 w-32 h-32 opacity-15">
        <div className="relative">
          <div className="absolute top-0 left-0 w-3 h-3 bg-purple-300 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
          <div className="absolute top-2 right-0 w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
          <div className="absolute bottom-0 left-2 w-2.5 h-2.5 bg-indigo-400 rounded-full animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-1 right-1 w-2 h-2 bg-cyan-400 rounded-full animate-ping" style={{ animationDuration: '2.5s', animationDelay: '2s' }}></div>
          {/* Connecting lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
            <line x1="6" y1="6" x2="36" y2="12" stroke="url(#nodeGradient)" strokeWidth="1" opacity="0.6">
              <animate attributeName="stroke-dasharray" values="0,100;100,0" dur="4s" repeatCount="indefinite" />
            </line>
            <line x1="6" y1="6" x2="14" y2="36" stroke="url(#nodeGradient)" strokeWidth="1" opacity="0.6">
              <animate attributeName="stroke-dasharray" values="0,100;100,0" dur="3s" repeatCount="indefinite" />
            </line>
            <defs>
              <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="1" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Magnifying Glass with Search Elements */}
      <div className="absolute top-80 right-60 w-16 h-16 opacity-10 animate-spin" style={{ animationDuration: '20s' }}>
        <div className="relative">
          <div className="w-10 h-10 border-2 border-gray-300 rounded-full"></div>
          <div className="absolute top-8 left-8 w-6 h-1 bg-gray-300 rounded-full transform rotate-45"></div>
          <div className="absolute top-2 left-2 w-6 h-6 border border-gray-400 rounded-full flex items-center justify-center">
            <div className="w-2 h-0.5 bg-gray-400 rounded"></div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-60 right-32 w-12 h-12 opacity-15 animate-spin" style={{ animationDuration: '15s' }}>
        <div className="relative">
          <div className="w-8 h-8 border-2 border-blue-300 rounded-full"></div>
          <div className="absolute top-6 left-6 w-4 h-1 bg-blue-300 rounded-full transform rotate-45"></div>
        </div>
      </div>

      {/* Code Blocks with Syntax Highlighting Effect */}
      <div className="absolute top-96 right-80 w-24 h-12 bg-gray-900/10 rounded-md p-2 opacity-20 border border-gray-300/30">
        <div className="space-y-0.5">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
            <div className="w-8 h-0.5 bg-blue-400 rounded"></div>
          </div>
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-green-400 rounded-full"></div>
            <div className="w-12 h-0.5 bg-green-400 rounded"></div>
          </div>
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
            <div className="w-6 h-0.5 bg-orange-400 rounded"></div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-20 left-80 w-24 h-16 bg-gray-900/10 rounded-md p-2 opacity-15 border border-gray-300/30">
        <div className="space-y-0.5">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-red-400 rounded-full"></div>
            <div className="w-10 h-0.5 bg-red-400 rounded"></div>
          </div>
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
            <div className="w-8 h-0.5 bg-cyan-400 rounded"></div>
          </div>
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
            <div className="w-14 h-0.5 bg-yellow-400 rounded"></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIElements;