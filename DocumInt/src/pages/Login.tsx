import React from 'react';
import { redirect, useNavigate } from 'react-router-dom';
import { Magic } from 'magic-sdk';
import { OAuthExtension } from '@magic-ext/oauth';



const Login = () => {
    const navigate = useNavigate();

    const handleSocialLogin = async (provider: 'google' | 'github') => {
        const magic = new Magic(import.meta.env.VITE_MAGIC_PUBLISHABLE_KEY, {
            extensions: [new OAuthExtension()],
        });
        console.log("http://localhost:5173/projects");
        await magic.oauth.loginWithRedirect({
            provider:'google',
            redirectURI: "http://localhost:5173/projects",
            
        });
        
    };

    const handleGuest = () => {
        navigate('/projects',);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <h1 className="text-2xl font-bold mb-6">Login to DocumInt</h1>
            <button onClick={() => handleSocialLogin('google')} className="mb-4 px-6 py-2 bg-blue-600 text-white rounded">Login with Google</button>
            <button onClick={() => handleSocialLogin('github')} className="mb-4 px-6 py-2 bg-gray-800 text-white rounded">Login with GitHub</button>
            <button onClick={handleGuest} className="px-6 py-2 bg-gray-300 text-gray-800 rounded">Continue as Guest</button>
        </div>
    );
};

export default Login;
