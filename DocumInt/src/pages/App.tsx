import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Book, Settings } from 'lucide-react';
import NewProjectForm from '../components/NewProjectForm';

const App = () => {
  const navigate = useNavigate();
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);

  const handleCreateProject = (name: string, files: File[]) => {
    console.log('Creating project:', { name, files });
    navigate('/arena', { state: { projectName: name, files } });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">DocumInt Projects</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* New Project Card */}
          <div 
            onClick={() => setShowNewProjectForm(true)}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-6 border border-gray-200"
          >
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <FileText className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">New Project</h2>
            <p className="text-gray-600">Create a new document Arena</p>
          </div>

          {/* Recent Projects Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
              <Book className="text-purple-600" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Recent Projects</h2>
            <p className="text-gray-600">No recent projects</p>
          </div>

          {/* Settings Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
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
  );
};

export default App;