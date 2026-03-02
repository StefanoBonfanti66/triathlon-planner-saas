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
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user?.id) {
        // Carica i dati del team prima di togliere il caricamento
        await fetchTeamData(session.user.id);
      }
      
      setLoading(false);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) fetchTeamData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchTeamData = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id, is_team_admin')
        .eq('id', userId)
        .single();

      if (profile) {
        const isSuperAdmin = session?.user?.email === ADMIN_EMAIL;
        console.log("Profile loaded:", { name: session?.user?.email, is_team_admin: profile.is_team_admin, is_super_admin: isSuperAdmin });
        
        if (profile.team_id) {
          const { data: teamData } = await supabase
            .from('teams')
            .select('*, secondary_color')
            .eq('id', profile.team_id)
            .single();
          
          if (teamData) {
            setTeam({ ...teamData, is_team_admin: profile.is_team_admin, is_super_admin: isSuperAdmin });
          } else {
            setTeam({ name: 'Team non trovato', is_team_admin: profile.is_team_admin, is_super_admin: isSuperAdmin });
          }
        } else {
          // Gestione utenti senza team (o SuperAdmin)
          setTeam({ 
            name: isSuperAdmin ? 'Super Admin' : 'Nessun Team', 
            is_super_admin: isSuperAdmin, 
            is_team_admin: profile.is_team_admin 
          });
        }
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
    }
  };

  // Rimosso l'useEffect separato per evitare ricaricamenti multipli

  const fetchAdminData = async () => {
    if (session?.user?.email !== ADMIN_EMAIL) return;
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: plans } = await supabase.from('user_plans').select('user_id');
    const { data: teams } = await supabase.from('teams').select('id, name');

    if (profiles && plans && teams) {
      const stats = profiles.map(p => ({ 
        ...p, 
        raceCount: plans.filter(pl => pl.user_id === p.id).length,
        teamName: teams.find(t => t.id === p.team_id)?.name || 'Nessun Team'
      }));
      setAdminData(stats);
    }
  };

  useEffect(() => {
    if (isAdminView) fetchAdminData();
  }, [isAdminView]);

  if (loading) return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-black uppercase tracking-widest text-slate-600">Caricamento...</div>;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100">
      <Header session={session} team={team} onOpenAdmin={() => setIsAdminView(true)} />
      <main>
        <Outlet /> 
      </main>

      {/* MODALE ADMIN SPOSTATA QUI PER ACCESSIBILITÀ GLOBALE */}
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
