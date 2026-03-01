import React, { memo } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Trophy, LogOut, Shield, Users, LayoutDashboard, Heart, BookOpen } from 'lucide-react';

const ADMIN_EMAIL = "bonfantistefano4@gmail.com";

const getActiveLinkStyle = (primaryColor?: string) => ({
    backgroundColor: '#eff6ff', // bg-blue-50
    color: primaryColor || '#2563eb' // text-blue-600 or custom primary color
});

const Header = memo(({ session, team, onOpenAdmin }: { session: any, team?: any, onOpenAdmin: () => void }) => {
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <a href={team?.website_url || "https://www.milanotriathlonteam.com/"} target="_blank" rel="noopener noreferrer" className="hover:scale-105 transition-transform" title={team?.name || "Sito Ufficiale"}>
                        <img src={team?.logo_url || "/Logo.png"} alt={`${team?.name || "MTT"} Logo`} className="h-12 w-[140px] object-contain" />
                    </a>
                    <div className="flex flex-col min-w-0">
                        <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase">{team?.name || "Race Planner"}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            {team?.name && (
                                <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded bg-slate-800 uppercase tracking-tighter shrink-0">
                                    {team.name}
                                </span>
                            )}
                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest truncate max-w-[120px] md:max-w-[200px]" 
                                  title={session?.user?.user_metadata?.full_name || session?.user?.email}
                                  style={{ color: team?.primary_color }}>
                                Atleta: {session?.user?.user_metadata?.full_name || session?.user?.email}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <NavLink to="/" end 
                             className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-blue-50 hover:text-blue-600" 
                             style={({ isActive }: { isActive: boolean }) => isActive ? getActiveLinkStyle(team?.primary_color) : undefined}>
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="hidden sm:inline">Dashboard</span>
                    </NavLink>
                    <NavLink to="/calendario-team" 
                             className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-blue-50 hover:text-blue-600" 
                             style={({ isActive }: { isActive: boolean }) => isActive ? getActiveLinkStyle(team?.primary_color) : undefined}>
                        <Users className="w-4 h-4" />
                        <span className="hidden sm:inline">Team</span>
                    </NavLink>
                    <NavLink to="/guida" 
                             className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-blue-50 hover:text-blue-600" 
                             style={({ isActive }: { isActive: boolean }) => isActive ? getActiveLinkStyle(team?.primary_color) : undefined}>
                        <BookOpen className="w-4 h-4" />
                        <span className="hidden sm:inline">Guida</span>
                    </NavLink>
                    
                    <div className="w-px h-6 bg-slate-200 mx-2"></div>
                    
                    {session?.user?.email === ADMIN_EMAIL && (
                        <button onClick={onOpenAdmin} className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-sm font-bold hover:bg-amber-100 transition-all" aria-label="Apri pannello admin"><Shield className="w-4 h-4" /> Admin</button>
                    )}
                    
                    <a 
                        href="https://ko-fi.com/stefanobonfanti" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-sm font-bold hover:bg-rose-100 transition-all" 
                        title="Supporta il progetto"
                        aria-label="Supporta il progetto"
                    >
                        <Heart className="w-4 h-4 fill-current" />
                        <span className="hidden sm:inline">Supporta</span>
                    </a>
                    
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all" title="Logout" aria-label="Esci dall'applicazione"><LogOut className="w-4 h-4" /></button>
                </div>
            </div>
        </header>
    );
});

Header.displayName = 'Header';

export default Header;
