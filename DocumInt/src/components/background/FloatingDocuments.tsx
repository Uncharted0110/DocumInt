const FloatingDocuments = () => {
  return (
    <>
      {/* Floating Document Icons with More Detail */}
      <div className="absolute top-20 left-15 w-24 h-24 bg-white/90 rounded-lg shadow-2xl opacity-70 animate-bounce border border-red-400/80" style={{ animationDelay: '0s', animationDuration: '6s' }}>
        <div className="w-full h-2 bg-red-400 rounded-t-lg"></div>
        <div className="p-1 space-y-1">
          <div className="w-8 h-0.5 bg-gray-600 rounded"></div>
          <div className="w-6 h-0.5 bg-gray-600 rounded"></div>
          <div className="w-7 h-0.5 bg-gray-600 rounded"></div>
        </div>
      </div>

      <div className="absolute top-40 right-20 w-10 h-12 bg-white/90 rounded-lg shadow-2xl opacity-65 animate-bounce border border-blue-400/80" style={{ animationDelay: '2s', animationDuration: '8s' }}>
        <div className="w-full h-1.5 bg-blue-400 rounded-t-lg"></div>
        <div className="p-1 space-y-1">
          <div className="w-6 h-0.5 bg-gray-600 rounded"></div>
          <div className="w-5 h-0.5 bg-gray-600 rounded"></div>
        </div>
      </div>

      <div className="absolute bottom-32 left-20 w-11 h-13 bg-white/90 rounded-lg shadow-2xl opacity-70 animate-bounce border border-green-400/80" style={{ animationDelay: '4s', animationDuration: '7s' }}>
        <div className="w-full h-2 bg-green-400 rounded-t-lg"></div>
        <div className="p-1 space-y-1">
          <div className="w-7 h-0.5 bg-gray-600 rounded"></div>
          <div className="w-6 h-0.5 bg-gray-600 rounded"></div>
        </div>
      </div>
    </>
  );
};

export default FloatingDocuments;