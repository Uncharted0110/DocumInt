const GradientOverlays = () => {
  return (
    <>
      {/* Additional Gradient Overlays */}
      <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-gradient-radial from-blue-200/30 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-indigo-200/20 to-transparent rounded-full blur-3xl"></div>
    </>
  );
};

export default GradientOverlays;