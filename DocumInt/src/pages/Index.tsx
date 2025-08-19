import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScrollLayer from '../components/ScrollLayer';
import BackgroundLayout from '../components/background/BackgroundLayout';
import NewProjectForm from '../components/NewProjectForm';
import { Lightbulb, Podcast, Route, BrainCircuit, ChevronDown } from 'lucide-react';
import logo from '../assets/logo.png';

const Index = () => {
  const navigate = useNavigate();
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);

  // Keep only 2 layers
  const layers = [
    {
      title: "Immersive",
      subtitle: "Experience",
      description:
        "Discover the future of web interactions through layered scrolling experiences that captivate and engage.",
      accentTextClass: "text-purple-300",
      showArrow: true,
    },
    {
      title: "Modern",
      subtitle: "Design",
      description:
        "Built with cutting-edge technology to deliver smooth, responsive animations across all devices.",
      accentTextClass: "text-blue-400",
    },
  ];

  return (
    <BackgroundLayout>
      <div className="relative z-10">
        {/* Spacer to allow scrolling */}
        <div style={{ height: `${layers.length * 100}vh` }} />

        {/* Render the 2 layers */}
        {layers.map((layer, index) => (
          <ScrollLayer
            key={index}
            layerIndex={index}
            className="overflow-hidden"
          >
            {index === 0 ? (
              // First layer: ignore pointer events so clicks pass through if needed
              <div className="relative h-screen w-full flex flex-col items-center justify-center text-center bg-transparent pointer-events-none">
                <img
                  src={logo}
                  alt="DocumInt logo"
                  className="w-100 h-100 mx-auto object-contain"
                />
                <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight drop-shadow">
                  <span className="text-white">Docum</span>
                  <span className="text-blue-400">Int</span>
                </h1>
                {/* Scroll down hint */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/35 pointer-events-none">
                  <span className="text-xs uppercase tracking-wider">Scroll down</span>
                  <ChevronDown className="w-6 h-6 animate-bounce" />
                </div>
              </div>
            ) : (
              // Second layer: transparent full-screen About Us panel
              <div className="relative h-screen w-full pointer-events-auto">
                <div className="absolute inset-0 bg-transparent border border-white/20 rounded-2xl p-6">
                  <div className="max-w-6xl mx-auto h-full flex flex-col">
                    <div className="text-center mt-12 md:mt-24 lg:mt-32">
                      <h2 className="text-white text-4xl md:text-6xl font-bold mb-2 drop-shadow">
                        About <span className={layer.accentTextClass}>DocumInt</span>
                      </h2>
                      <p className="text-white/90 max-w-2xl mx-auto text-2xl">
                        Read between the lines
                      </p>
                    </div>

                    <div className="mt-8 md:mt-20 flex justify-center">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                        {/* Connecting the dots */}
                        <div className="flex flex-col items-center text-center gap-3">
                          <span className="p-3 rounded-full bg-white/10 border border-white/20">
                            <Route className="w-15 h-15 text-white" />
                          </span>
                          <div className="text-white font-semibold">Connecting the dots</div>
                          <div className="text-white/70 text-sm max-w-[12rem]">Link concepts and evidence seamlessly.</div>
                        </div>

                        {/* Insights generation */}
                        <div className="flex flex-col items-center text-center gap-3">
                          <span className="p-3 rounded-full bg-white/10 border border-white/20">
                            <Lightbulb className="w-15 h-15 text-white" />
                          </span>
                          <div className="text-white font-semibold">Insights</div>
                          <div className="text-white/70 text-sm max-w-[12rem]">Surface patterns and key takeaways.</div>
                        </div>

                        {/* Podcast generation */}
                        <div className="flex flex-col items-center text-center gap-3">
                          <span className="p-3 rounded-full bg-white/10 border border-white/20">
                            <Podcast className="w-15 h-15 text-white" />
                          </span>
                          <div className="text-white font-semibold">Podcast</div>
                          <div className="text-white/70 text-sm max-w-[12rem]">Turn docs into engaging audio shows.</div>
                        </div>

                        {/* Mindmap */}
                        <div className="flex flex-col items-center text-center gap-3">
                          <span className="p-3 rounded-full bg-white/10 border border-white/20">
                            <BrainCircuit className="w-15 h-15 text-white" />
                          </span>
                          <div className="text-white font-semibold">Mindmap</div>
                          <div className="text-white/70 text-sm max-w-[12rem]">Visualize structure and relationships.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollLayer>
        ))}

        {showNewProjectForm && (
          <NewProjectForm
            onClose={() => setShowNewProjectForm(false)}
            onSubmit={(name, files) => {
              setShowNewProjectForm(false);
              navigate('/arena', { state: { projectName: name, files } });
            }}
          />
        )}
      </div>
    </BackgroundLayout>
  );
};

export default Index;
