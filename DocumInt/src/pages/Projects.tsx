import BackgroundLayout from '../components/background/BackgroundLayout';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NewProjectForm from '../components/NewProjectForm';
import { Book, Trash2 } from 'lucide-react';
import { listProjects, loadProject, deleteProject } from '../utils/projectStorage';
import type { ProjectMetadata } from '../utils/projectStorage';

const Projects = () => {
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const list = await listProjects();
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setProjects(list);
      setLoadingProjects(false);
    })();
  }, []);

  const openProject = async (name: string) => {
    const data = await loadProject(name);
    if (data) {
      navigate('/arena', { state: { projectName: name, files: data.pdfFiles, persona: data.persona, task: data.task } });
    }
  };

  const handleDelete = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    await deleteProject(name);
    setProjects(prev => prev.filter(p => p.name !== name));
  };

  const renderProjects = () => {
    if (loadingProjects) return <div className="text-gray-800">Loading saved projects...</div>;
    if (projects.length === 0) return <div className="text-gray-800">No saved projects yet.</div>;

    return (
      <div className="overflow-hidden rounded-lg bg-white/90 backdrop-blur-xl border border-white/20">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-8 px-4 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide bg-white/70">
          <div>Name</div>
          <div className="text-right">Date</div>
          <div className="text-right">PDFs</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Rows */}
        <ul className="divide-y divide-gray-200/70">
          {projects.map((p) => {
            const pdfCount = Array.isArray(p.pdfFileNames) ? p.pdfFileNames.length : 0;
            const dateStr = new Date(p.updatedAt).toLocaleDateString();
            return (
              <li key={p.name} className="hover:bg-white transition-colors">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openProject(p.name)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openProject(p.name)}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-x-8 items-center px-4 py-2 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-7 h-7 bg-purple-100 rounded">
                      <Book className="text-purple-600" size={14} />
                    </div>
                    <span className="truncate text-gray-900 font-medium" title={p.name}>{p.name}</span>
                  </div>
                  <div className="text-gray-700 text-sm text-right">{dateStr}</div>
                  <div className="text-gray-700 text-sm text-right">{pdfCount}</div>
                  <div className="text-right">
                    <button
                      onClick={(e) => handleDelete(e, p.name)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-red-600 transition"
                      aria-label={`Delete project ${p.name}`}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <BackgroundLayout>
      {/* Top-center logo */}
     {!showNewProjectForm && (
       <div className="fixed top-1/10 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
         <img
           src="logo.png"
           alt="DocumInt logo"
           className="h-40 md:h-40 object-contain"
         />
       </div>
     )}
      <div className="relative z-10 h-screen w-full">
        {/* Left half: Create New Project */}
        <div className="absolute inset-y-0 left-0 right-1/2 text-gray-900 flex items-center justify-center p-8 pointer-events-auto border border-white/40">
          <div className="max-w-xl text-left space-y-4">
            <div className="flex items-center gap-3">
              {/* Plus icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" className="text-white">
                <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
              </svg>
              <h3 className="text-2xl md:text-3xl font-semibold text-white">Create New DocumInt</h3>
            </div>
            <p className="text-white">
              Start a fresh project by uploading your documents and setting a task.
            </p>

            <button
              type="button"
              onClick={() => setShowNewProjectForm(true)}
              className="mt-2 inline-flex items-center px-5 py-2.5 rounded-lg bg-white/90 hover:bg-white text-gray-900 shadow border border-white/30 backdrop-blur transition"
            >
              New DocumInt
            </button>
          </div>
        </div>

        {/* Right half: Recent / Saved Projects */}
        <div className="absolute inset-y-0 left-1/2 right-0 bg-white/45 text-gray-900 grid place-items-center p-6 md:p-8 pointer-events-auto border border-white/40">
          <div className="w-full max-w-xl mx-auto flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl md:text-3xl font-semibold">Your Recent DocumInts</h3>
            </div>
            <div className="mt-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
              {renderProjects()}
            </div>
          </div>
        </div>

        {showNewProjectForm && (
          <NewProjectForm
            onClose={() => setShowNewProjectForm(false)}
            onSubmit={(name, files, persona, task) => {
              setShowNewProjectForm(false);
              navigate('/arena', { state: { projectName: name, files, persona, task } });
            }}
          />
        )}
      </div>
    </BackgroundLayout>
  );
};

export default Projects;