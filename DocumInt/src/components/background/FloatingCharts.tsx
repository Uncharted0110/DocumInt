const FloatingCharts = () => {
  return (
    <>
      {/* Floating Chart Elements */}
      <div className="absolute top-32 right-40 w-16 h-12 bg-white/80 rounded-lg shadow-2xl opacity-60 animate-pulse border border-blue-400/70" style={{ animationDelay: '1s' }}>
        <div className="p-2 h-full flex items-end justify-between">
          <div className="w-1 bg-blue-500 rounded-full" style={{ height: '60%' }}></div>
          <div className="w-1 bg-blue-600 rounded-full" style={{ height: '80%' }}></div>
          <div className="w-1 bg-blue-700 rounded-full" style={{ height: '40%' }}></div>
          <div className="w-1 bg-blue-800 rounded-full" style={{ height: '90%' }}></div>
          <div className="w-1 bg-blue-900 rounded-full" style={{ height: '70%' }}></div>
        </div>
      </div>

      <div className="absolute bottom-40 right-10 w-20 h-14 bg-white/80 rounded-lg shadow-2xl opacity-65 animate-pulse border border-indigo-400/70" style={{ animationDelay: '3s' }}>
        <div className="p-2">
          <div className="w-3 h-3 bg-indigo-500 rounded-full mb-1"></div>
          <div className="flex space-x-0.5">
            <div className="w-3 h-1 bg-indigo-600 rounded"></div>
            <div className="w-4 h-1 bg-indigo-700 rounded"></div>
            <div className="w-2 h-1 bg-indigo-800 rounded"></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FloatingCharts;