import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Book, Settings } from 'lucide-react';
import NewProjectForm from '../components/NewProjectForm';
import { BackgroundLayout } from '../components/background';

const App = () => {
  const navigate = useNavigate();
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);

  const handleCreateProject = (name: string, files: File[]) => {
    console.log('Creating project:', { name, files });
    navigate('/arena', { state: { projectName: name, files } });
  };

  return (
    <BackgroundLayout>
      <div className="relative z-10 min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8 drop-shadow-lg">DocumInt Projects</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* New Project Card */}
            <div 
              onClick={() => setShowNewProjectForm(true)}
              className="bg-white/90 backdrop-blur-xl rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer p-6 border border-white/20 hover:bg-white/95 transform hover:scale-105"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                <FileText className="text-blue-600" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">New Project</h2>
              <p className="text-gray-600">Create a new document Arena</p>
            </div>

            {/* Recent Projects Card */}
            <div className="bg-white/90 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 hover:bg-white/95 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
                <Book className="text-purple-600" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Recent Projects</h2>
              <p className="text-gray-600">No recent projects</p>
            </div>

            {/* Settings Card */}
            <div className="bg-white/90 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 hover:bg-white/95 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-4">
                <Settings className="text-gray-600" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Settings</h2>
              <p className="text-gray-600">Configure application settings</p>
            </div>
          </div>
        </div>

        {showNewProjectForm && (
          <NewProjectForm
            onClose={() => setShowNewProjectForm(false)}
            onSubmit={handleCreateProject}
          />
        )}
      </div>
    </BackgroundLayout>
  );
};

export default App;