const AdditionalElements = () => {
  return (
    <>
      {/* Additional Floating Particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-blue-300 rounded-full opacity-20 animate-pulse"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`
          }}
        ></div>
      ))}
    </>
  );
};

export default AdditionalElements;