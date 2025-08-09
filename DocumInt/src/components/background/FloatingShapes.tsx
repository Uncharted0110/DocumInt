const FloatingShapes = () => {
  return (
    <>
      {/* Floating Geometric Shapes with Gradients */}
      <div className="absolute top-40 left-60 w-6 h-6 bg-gradient-to-br from-blue-300 to-indigo-400 rounded-full opacity-25 animate-ping shadow-lg" style={{ animationDuration: '4s' }}></div>
      <div className="absolute bottom-80 left-96 w-8 h-8 bg-gradient-to-br from-cyan-300 to-blue-400 rounded-lg opacity-20 animate-ping shadow-lg" style={{ animationDuration: '6s' }}></div>
      <div className="absolute top-20 right-96 w-4 h-4 bg-gradient-to-br from-indigo-300 to-purple-400 rounded-full opacity-25 animate-ping shadow-lg" style={{ animationDuration: '5s' }}></div>

      {/* Cloud Computing Icons */}
      <div className="absolute top-72 left-24 w-14 h-8 opacity-20">
        <div className="relative">
          <div className="absolute bottom-0 left-2 w-8 h-4 bg-blue-200 rounded-full"></div>
          <div className="absolute bottom-1 left-0 w-6 h-3 bg-blue-300 rounded-full"></div>
          <div className="absolute bottom-1 right-0 w-4 h-3 bg-blue-300 rounded-full"></div>
          <div className="absolute bottom-2 left-4 w-3 h-2 bg-blue-400 rounded-full"></div>
        </div>
      </div>

      {/* Database/Server Icons */}
      <div className="absolute bottom-72 right-24 w-8 h-10 opacity-20">
        <div className="space-y-0.5">
          <div className="w-full h-2 bg-gray-300 rounded-full"></div>
          <div className="w-full h-2 bg-gray-400 rounded-full"></div>
          <div className="w-full h-2 bg-gray-500 rounded-full"></div>
          <div className="w-full h-2 bg-gray-600 rounded-full"></div>
        </div>
      </div>
    </>
  );
};

export default FloatingShapes;