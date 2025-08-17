import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Book, Settings } from 'lucide-react';
import NewProjectForm from '../components/NewProjectForm';
import { BackgroundLayout } from '../components/background';
import { listProjects, loadProject, deleteProject } from '../utils/projectStorage';
import type { ProjectMetadata } from '../utils/projectStorage';

const Home = () => {
  const navigate = useNavigate();
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    (async () => {
      const list = await listProjects();
      // Sort by updatedAt desc
      list.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setProjects(list);
      setLoadingProjects(false);
    })();
  }, []);

  const openProject = async (name: string) => {
    const data = await loadProject(name);
    if (data) {
      navigate('/arena', { state: { projectName: name, files: data.pdfFiles } });
    }
  };

  const handleDelete = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    await deleteProject(name);
    setProjects(prev => prev.filter(p => p.name !== name));
  };

  const handleCreateProject = (name: string, files: File[]) => {
    console.log('Creating project:', { name, files });
    navigate('/arena', { state: { projectName: name, files } });
  };

  const renderProjects = () => {
    if (loadingProjects) return <div className="col-span-full text-white/90">Loading saved projects...</div>;
    if (projects.length === 0) return <div className="col-span-full text-white/90">No saved projects yet.</div>;
    return projects.map(p => (
      <button key={p.name} onClick={() => openProject(p.name)} className="text-left bg-white/90 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 hover:bg-white/95 transition-all duration-300 transform hover:scale-105 relative group focus:outline-none focus:ring-2 focus:ring-blue-500" title={`Open project ${p.name}`}> 
        <button onClick={(e) => handleDelete(e, p.name)} title="Delete project" className="absolute top-2 right-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Delete project ${p.name}`}>×</button>
        <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
          <Book className="text-purple-600" size={24} />
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1 truncate" title={p.name}>{p.name}</h2>
        <p className="text-xs text-gray-500 mb-2">Updated {new Date(p.updatedAt).toLocaleString()}</p>
        <p className="mt-2 text-xs text-gray-500">{p.pdfFileNames.length} PDF(s)</p>
      </button>
    ));
  };

  return (
    <BackgroundLayout>
      <div className="relative z-10 min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8 drop-shadow-lg">DocumInt Projects</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* New Project Card */}
            <button 
              onClick={() => setShowNewProjectForm(true)}
              className="bg-white/90 backdrop-blur-xl rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer p-6 border border-white/20 hover:bg-white/95 transform hover:scale-105 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                <FileText className="text-blue-600" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">New Project</h2>
              <p className="text-gray-600">Create a new document Arena</p>
            </button>

            {/* Recent / Saved Projects */}
            {renderProjects()}

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

export default Home;