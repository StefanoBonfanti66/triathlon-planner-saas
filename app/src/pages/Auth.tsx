import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Trophy, Mail, Lock, User } from 'lucide-react';

const Auth: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        return () => subscription.unsubscribe();
    }, []);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        const { data, error } = isSignUp 
            ? await supabase.auth.signUp({ 
                email, 
                password,
                options: { data: { full_name: fullName } }
              })
            : await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
            console.error("Errore Auth:", error.message);
            alert(error.message);
        } else {
            if (isSignUp && !data.session) alert('Registrazione effettuata! Controlla la mail.');
        }
        setAuthLoading(false);
    };

    const handleResetPassword = async () => {
        if (!email) {
            alert("Inserisci la tua email per ricevere il link di ripristino.");
            return;
        }
        setAuthLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        if (error) alert(error.message);
        else alert("Email di ripristino inviata! Controlla la tua posta.");
        setAuthLoading(false);
    };

    if (loading) {
        return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-black uppercase tracking-widest text-slate-600">Caricamento...</div>;
    }

    if (session) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 max-w-md w-full">
                <div className="flex flex-col items-center mb-8">
                    <div className="mb-4">
                        <img src="/Logo.png" alt="MTT Logo" className="h-20 w-auto object-contain" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">MTT Season Planner</h1>
                    <p className="text-slate-600 font-bold text-xs uppercase tracking-widest mt-2">Area Atleti</p>
                </div>
                
                <form onSubmit={handleAuth} className="space-y-4">
                    {isSignUp && (
                        <div className="relative">
                            <label htmlFor="auth-fullname" className="sr-only">Nome e Cognome</label>
                            <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                            <input 
                                id="auth-fullname"
                                type="text" 
                                placeholder="Nome e Cognome" 
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-medium"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <div className="relative">
                        <label htmlFor="auth-email" className="sr-only">Email</label>
                        <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                        <input 
                            id="auth-email"
                            type="email" 
                            placeholder="Email" 
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-medium"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative">
                        <label htmlFor="auth-password" className="sr-only">Password</label>
                        <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                        <input 
                            id="auth-password"
                            type="password" 
                            placeholder="Password" 
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-medium"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={authLoading}
                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all disabled:opacity-50"
                    >
                        {authLoading ? 'Attendere...' : (isSignUp ? 'Registrati' : 'Accedi')}
                    </button>
                </form>
                
                <div className="mt-6 flex flex-col gap-4 text-center">
                    {!isSignUp && (
                        <button 
                            onClick={handleResetPassword}
                            className="text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                        >
                            Password dimenticata?
                        </button>
                    )}
                    <button 
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-[10px] font-black text-blue-700 uppercase tracking-widest hover:underline"
                    >
                        {isSignUp ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
