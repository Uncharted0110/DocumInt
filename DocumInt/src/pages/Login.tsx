import { useNavigate } from 'react-router-dom';
import { Magic } from 'magic-sdk';
import { OAuthExtension } from '@magic-ext/oauth';
import verticalLogo from '../assets/verticalLogo.png';

const Login = () => {
  const navigate = useNavigate();

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    const magic = new Magic(import.meta.env.VITE_MAGIC_PUBLISHABLE_KEY, {
      extensions: [new OAuthExtension()],
    });
    console.log("http://localhost:5173/projects");
    await magic.oauth.loginWithRedirect({
      provider: 'google',
      redirectURI: "http://localhost:5173/projects",

    });

  };

  const handleGuest = () => {
    navigate('/projects',);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900">
      {/* Enhanced Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

        {/* AI Brain/Neural Network Nodes */}
        <div className="absolute top-60 left-40 w-32 h-32 opacity-15">
          <div className="relative">
            <div className="absolute top-0 left-0 w-3 h-3 bg-purple-300 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
            <div className="absolute top-2 right-0 w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
            <div className="absolute bottom-0 left-2 w-2.5 h-2.5 bg-indigo-400 rounded-full animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}></div>
            <div className="absolute bottom-1 right-1 w-2 h-2 bg-cyan-400 rounded-full animate-ping" style={{ animationDuration: '2.5s', animationDelay: '2s' }}></div>
            {/* Connecting lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
              <line x1="6" y1="6" x2="36" y2="12" stroke="url(#nodeGradient)" strokeWidth="1" opacity="0.6">
                <animate attributeName="stroke-dasharray" values="0,100;100,0" dur="4s" repeatCount="indefinite" />
              </line>
              <line x1="6" y1="6" x2="14" y2="36" stroke="url(#nodeGradient)" strokeWidth="1" opacity="0.6">
                <animate attributeName="stroke-dasharray" values="0,100;100,0" dur="3s" repeatCount="indefinite" />
              </line>
            </svg>
          </div>
        </div>

        {/* Magnifying Glass with Search Elements */}
        <div className="absolute top-80 right-60 w-16 h-16 opacity-10 animate-spin" style={{ animationDuration: '20s' }}>
          <div className="relative">
            <div className="w-10 h-10 border-2 border-gray-300 rounded-full"></div>
            <div className="absolute top-8 left-8 w-6 h-1 bg-gray-300 rounded-full transform rotate-45"></div>
            <div className="absolute top-2 left-2 w-6 h-6 border border-gray-400 rounded-full flex items-center justify-center">
              <div className="w-2 h-0.5 bg-gray-400 rounded"></div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-60 right-32 w-12 h-12 opacity-15 animate-spin" style={{ animationDuration: '15s' }}>
          <div className="relative">
            <div className="w-8 h-8 border-2 border-blue-300 rounded-full"></div>
            <div className="absolute top-6 left-6 w-4 h-1 bg-blue-300 rounded-full transform rotate-45"></div>
          </div>
        </div>

        {/* Code Blocks with Syntax Highlighting Effect */}
        <div className="absolute top-96 right-80 w-24 h-12 bg-gray-900/10 rounded-md p-2 opacity-20 border border-gray-300/30">
          <div className="space-y-0.5">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
              <div className="w-8 h-0.5 bg-blue-400 rounded"></div>
            </div>
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-green-400 rounded-full"></div>
              <div className="w-12 h-0.5 bg-green-400 rounded"></div>
            </div>
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
              <div className="w-6 h-0.5 bg-orange-400 rounded"></div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-20 left-80 w-24 h-16 bg-gray-900/10 rounded-md p-2 opacity-15 border border-gray-300/30">
          <div className="space-y-0.5">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-red-400 rounded-full"></div>
              <div className="w-10 h-0.5 bg-red-400 rounded"></div>
            </div>
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
              <div className="w-8 h-0.5 bg-cyan-400 rounded"></div>
            </div>
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
              <div className="w-14 h-0.5 bg-yellow-400 rounded"></div>
            </div>
          </div>
        </div>

        {/* Enhanced AI Data Flow Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-8" viewBox="0 0 800 600">
          <path d="M100,100 Q200,50 300,100 T500,150" stroke="url(#gradient1)" strokeWidth="3" fill="none">
            <animate attributeName="stroke-dasharray" values="0,1000;1000,0;0,1000" dur="8s" repeatCount="indefinite" />
          </path>
          <path d="M600,400 Q500,350 400,400 T200,450" stroke="url(#gradient2)" strokeWidth="3" fill="none">
            <animate attributeName="stroke-dasharray" values="0,800;800,0;0,800" dur="10s" repeatCount="indefinite" />
          </path>
          <path d="M150,500 Q300,450 450,500 T700,400" stroke="url(#gradient3)" strokeWidth="2" fill="none">
            <animate attributeName="stroke-dasharray" values="0,1200;1200,0;0,1200" dur="12s" repeatCount="indefinite" />
          </path>
          <circle cx="300" cy="100" r="3" fill="#3b82f6" opacity="0.3">
            <animate attributeName="r" values="2;5;2" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="500" cy="150" r="2" fill="#6366f1" opacity="0.4">
            <animate attributeName="r" values="1;4;1" dur="4s" repeatCount="indefinite" />
          </circle>
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
              <stop offset="50%" stopColor="#6366f1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="1" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

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
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Glass Card Container */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 w-full max-w-md">
          {/* Logo/Brand Area */}
          <div className="text-center mb-8">
            <img
              src={verticalLogo}
              alt="DocumInt Logo"
              className="w-64 h-64 mx-auto object-contain"
            />
            <p className="text-gray-600 text-sm">Intelligent Document Processing</p>
          </div>

          {/* Login Buttons */}
          <div className="space-y-4">
            <button
              onClick={() => handleSocialLogin('google')}
              className="w-full flex items-center justify-center px-6 py-4 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md group"
            >
              <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => handleSocialLogin('github')}
              className="w-full flex items-center justify-center px-6 py-4 bg-gray-900 hover:bg-gray-800 rounded-xl text-white font-medium transition-all duration-200 shadow-sm hover:shadow-md group"
            >
              <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500"></span>
              </div>
            </div>

            <button
              onClick={handleGuest}
              className="w-full px-6 py-4 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-gray-700 font-medium transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200"
            >
              Continue as Guest
            </button>
          </div>
        </div>


      </div>

      {/* Additional Gradient Overlays */}
      <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-gradient-radial from-blue-200/30 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-indigo-200/20 to-transparent rounded-full blur-3xl"></div>
    </div>
  );
};

export default Login;
