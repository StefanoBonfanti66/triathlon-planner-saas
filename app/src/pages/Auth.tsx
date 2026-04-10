import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Trophy, Mail, Lock, User, Shield } from 'lucide-react';

// V4.0 - Automated Team Onboarding
const Auth: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // V6.3.3 - Rilevazione ultra-robusta dello stato di recovery
    const [isRecovery, setIsRecovery] = useState(() => {
        const url = window.location.href;
        const hash = window.location.hash;
        return url.includes('type=recovery') || 
               hash.includes('type=recovery') ||
               url.includes('access_token=') ||
               hash.includes('access_token=') ||
               url.includes('error_code=otp_expired') ||
               hash.includes('error_code=otp_expired');
    });
    
    useEffect(() => {
        // Controllo periodico per i primi secondi (nel caso in cui l'URL cambi durante il caricamento)
        const checkUrl = () => {
            const url = window.location.href;
            const hash = window.location.hash;
            if (url.includes('recovery') || hash.includes('recovery') || url.includes('access_token') || hash.includes('access_token')) {
                console.log("Recovery token detected in URL");
                setIsRecovery(true);
            }
        };

        const interval = setInterval(checkUrl, 500);
        setTimeout(() => clearInterval(interval), 5000);

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Auth Event Details:", event, session?.user?.email);
            
            if (event === 'PASSWORD_RECOVERY') {
                setIsRecovery(true);
                setSession(session);
            } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                setSession(session);
                // Non resettare mai isRecovery se nell'URL c'è traccia di recovery
                if (window.location.href.includes('recovery') || window.location.hash.includes('recovery')) {
                    setIsRecovery(true);
                }
            } else if (event === 'SIGNED_OUT') {
                setSession(null);
            }
        });
        return () => {
            subscription.unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [teamCode, setTeamCode] = useState(''); // Nuovo stato per il codice team
    const [isSignUp, setIsSignUp] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            alert("Password aggiornata con successo! Ora puoi accedere.");
            setIsRecovery(false);
            setSession(null);
            await supabase.auth.signOut();
            window.location.href = '/login'; // Reset pulito
        } catch (error: any) {
            alert(error.message);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);

        try {
            if (isSignUp) {
                // 1. Verifica se il codice team è valido prima di procedere
                const { data: teamData, error: teamError } = await supabase
                    .from('teams')
                    .select('id')
                    .eq('join_code', teamCode.trim().toUpperCase())
                    .single();

                if (teamError || !teamData) {
                    alert("Codice Squadra non valido. Contatta il tuo responsabile di team.");
                    setAuthLoading(false);
                    return;
                }

                // 2. Registrazione utente con metadati per il Trigger SQL
                const { data, error } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: { 
                        emailRedirectTo: window.location.origin + '/login',
                        data: { 
                            full_name: fullName,
                            team_code: teamCode.trim().toUpperCase() // Letto dal Trigger SQL
                        } 
                    }
                });
                
                if (error) throw error;

                // RIMOSSO: Inserimento manuale in profiles che causava 403.
                // Ora ci pensa il Trigger 'handle_new_user' sul database.

                if (!data.session) alert('Registrazione effettuata! Controlla la mail.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (error: any) {
            console.error("Errore Auth:", error.message);
            alert(error.message);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            alert("Inserisci la tua email per ricevere il link di ripristino.");
            return;
        }
        setAuthLoading(true);
        // Forza il redirect verso /login per gestire il ritorno
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/login',
        });
        if (error) alert(error.message);
        else alert("Email di ripristino inviata! Controlla la tua posta.");
        setAuthLoading(false);
    };

    if (loading) {
        return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-black uppercase tracking-widest text-slate-600">Caricamento...</div>;
    }

    if (isRecovery) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 max-w-md w-full">
                    <div className="flex flex-col items-center mb-8">
                        <div className="mb-4 bg-blue-600 p-4 rounded-3xl shadow-lg">
                            <Lock className="h-10 w-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Nuova Password</h1>
                        <p className="text-slate-600 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 text-center">Imposta le tue nuove credenziali di accesso</p>
                    </div>
                    
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="relative">
                            <label htmlFor="recovery-password" className="sr-only">Nuova Password</label>
                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                            <input 
                                id="recovery-password"
                                type="password" 
                                placeholder="Inserisci la nuova password" 
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-medium"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={authLoading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all disabled:opacity-50"
                        >
                            {authLoading ? 'Salvataggio...' : 'Aggiorna Password'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (session && !isRecovery) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 max-w-md w-full">
                <div className="flex flex-col items-center mb-8">
                    <div className="mb-4 bg-slate-900 p-4 rounded-3xl shadow-lg">
                        <Trophy className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Race Planner SaaS</h1>
                    <p className="text-slate-600 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Multi-Team Management</p>
                </div>
                
                <form onSubmit={handleAuth} className="space-y-4">
                    {isSignUp && (
                        <>
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
                            <div className="relative">
                                <label htmlFor="auth-teamcode" className="sr-only">Codice Squadra</label>
                                <Shield className="absolute left-4 top-3.5 w-5 h-5 text-blue-600" />
                                <input 
                                    id="auth-teamcode"
                                    type="text" 
                                    placeholder="Codice Squadra" 
                                    className="w-full pl-12 pr-4 py-3.5 bg-blue-50 border-2 border-blue-100 rounded-2xl focus:border-blue-500 outline-none text-sm font-bold placeholder:text-blue-300 uppercase"
                                    value={teamCode}
                                    onChange={(e) => setTeamCode(e.target.value)}
                                    required
                                />
                            </div>
                        </>
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
