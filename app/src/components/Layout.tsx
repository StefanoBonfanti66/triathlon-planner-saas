/**
 * Race Planner SaaS - Main Layout
 * Author: Stefano Bonfanti
 */
import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Header from './Header';
import { Shield, X } from 'lucide-react';

const Layout: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminData, setAdminData] = useState<any[]>([]);
  const [team, setTeam] = useState<any>(null);

  const ADMIN_EMAIL = "bonfantistefano4@gmail.com";
  
  useEffect(() => {
    const initSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (currentSession?.user?.id) {
        await fetchTeamData(currentSession.user.id);
      }
      
      setLoading(false);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        // V6.3.3 - Preserviamo l'hash/token nel redirect
        window.location.href = '/login' + window.location.hash;
        return;
      }
      if (newSession?.user?.id !== session?.user?.id) {
        setSession(newSession);
        if (newSession?.user?.id) fetchTeamData(newSession.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [session?.user?.id]);

  const fetchTeamData = async (userId: string) => {
    try {
      let { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('full_name, team_id, is_team_admin, email')
        .eq('id', userId)
        .single();

      if (profError && profError.code === 'PGRST116') {
        const { data: profileByEmail } = await supabase
          .from('profiles')
          .select('id, full_name, team_id, is_team_admin, email')
          .eq('email', session?.user?.email)
          .single();
        
        if (profileByEmail) {
          await supabase.from('profiles').update({ id: userId }).eq('id', profileByEmail.id);
          profile = profileByEmail as any;
        }
      }

      if (profile) {
        const isSuperAdmin = session?.user?.email === ADMIN_EMAIL;
        
        if (profile.team_id) {
          const { data: teamData } = await supabase
            .from('teams')
            .select('*, secondary_color')
            .eq('id', profile.team_id)
            .single();
          
          if (teamData) {
            setTeam({ ...teamData, is_team_admin: profile.is_team_admin || isSuperAdmin, is_super_admin: isSuperAdmin });
          }
        } else {
          setTeam({ 
            name: isSuperAdmin ? 'Super Admin' : 'Nessun Team', 
            is_super_admin: isSuperAdmin, 
            is_team_admin: profile.is_team_admin || isSuperAdmin 
          });
        }
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
    }
  };

  // --- DYNAMIC PWA BRANDING ---
  useEffect(() => {
    if (!team) return;

    const brandName = team.name && team.name !== 'Super Admin' ? `${team.name} Planner` : 'Race Planner 2026';
    document.title = brandName;

    const logo = team.logo_url || '/icon.svg';
    const fullLogoUrl = logo.startsWith('http') ? logo : window.location.origin + logo;
    
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) favicon.href = fullLogoUrl;

    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (appleIcon) appleIcon.href = fullLogoUrl;

    const themeColor = team.primary_color || '#e11d48';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', themeColor);

    const manifest = {
      short_name: team.name?.substring(0, 12) || "Planner",
      name: brandName,
      icons: [
        {
          src: fullLogoUrl,
          sizes: "512x512",
          type: logo.endsWith('.svg') ? "image/svg+xml" : "image/png",
          purpose: "any maskable"
        }
      ],
      start_url: window.location.origin + "/",
      display: "standalone",
      theme_color: themeColor,
      background_color: "#f8fafc"
    };

    const stringManifest = JSON.stringify(manifest);
    const blob = new Blob([stringManifest], {type: 'application/json'});
    const manifestURL = URL.createObjectURL(blob);
    
    const manifestTag = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (manifestTag) {
      manifestTag.href = manifestURL;
    }

    return () => URL.revokeObjectURL(manifestURL);
  }, [team]);

  if (loading) return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-black uppercase tracking-widest text-slate-600">Caricamento...</div>;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100">
      <Header session={session} team={team} onOpenAdmin={() => setIsAdminView(true)} />
      <main>
        <Outlet /> 
      </main>

      {isAdminView && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
              <div className="bg-white rounded-[2.5rem] p-8 max-w-3xl w-full shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-start mb-6"><div className="bg-amber-50 p-3 rounded-2xl"><Shield className="w-6 h-6 text-amber-800" /></div><button onClick={() => setIsAdminView(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors" aria-label="Chiudi pannello admin"><X className="w-5 h-5 text-slate-500" /></button></div>
                  <h3 id="admin-modal-title" className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Gestione Multi-Team (God Mode)</h3>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      <table className="w-full text-left">
                          <thead>
                              <tr className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-100">
                                  <th className="pb-4">Atleta</th>
                                  <th className="pb-4">Team</th>
                                  <th className="pb-4 text-center">Gare</th>
                                  <th className="pb-4 text-right">Ultimo Accesso</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {adminData.map((user) => (
                                  <tr key={user.id} className="text-sm font-bold text-slate-600">
                                      <td className="py-4">{user.full_name || 'N/A'}</td>
                                      <td className="py-4">
                                          <span className="text-[10px] px-2 py-1 bg-slate-100 rounded-lg border border-slate-200 uppercase font-black">
                                              {user.teamName}
                                          </span>
                                      </td>
                                      <td className="py-4 text-center text-blue-600">{user.raceCount}</td>
                                      <td className="py-4 text-right text-[10px] font-black text-slate-500 uppercase">{user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
                  <button onClick={() => setIsAdminView(false)} className="w-full mt-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all">Chiudi</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default Layout;
