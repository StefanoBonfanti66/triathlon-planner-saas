/**
 * Race Planner SaaS - Super Admin Dashboard
 * Author: Stefano Bonfanti
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Shield, Users, Trophy, Plus, Edit2, Trash2, 
  Save, X, ExternalLink, Mail, Upload, Download, FileText, Copy, Camera
} from 'lucide-react';
import { Navigate, NavLink, Link } from 'react-router-dom';
import racesData from "../races_full.json";

const ADMIN_EMAIL = "bonfantistefano4@gmail.com";

const AdminPage: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [myProfile, setMyProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'atleti' | 'team' | 'social'>('atleti');
    const [searchTerm, setSearchTerm] = useState('');
    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    
    const [profiles, setProfiles] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [allPlans, setAllPlans] = useState<any[]>([]);
    const [plansCount, setPlansCount] = useState<Record<string, number>>({});
    
    // Social Stats State
    const [socialMonth, setSocialMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
    const socialCardRef = React.useRef<HTMLDivElement>(null);

    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<any>(null);
    const [teamForm, setTeamForm] = useState({
        name: '',
        join_code: '',
        primary_color: '#3b82f6',
        secondary_color: '#1e293b',
        logo_url: '',
        website_url: '',
        telegram_chat_id: ''
    });

    const isSuperAdmin = session?.user?.email === ADMIN_EMAIL;

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            
            if (session?.user) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                setMyProfile(profile);
                
                if (session.user.email === ADMIN_EMAIL || profile?.is_team_admin) {
                    fetchAllData(session.user.email === ADMIN_EMAIL, profile?.team_id);
                } else {
                    setLoading(false);
                }
            }
        };
        init();
    }, []);

    const fetchAllData = async (superAdmin: boolean, teamId?: string) => {
        setLoading(true);
        let profQuery = supabase.from('profiles').select('*').is('deleted_at', null).order('full_name');
        let teamsQuery = supabase.from('teams').select('*').order('name');
        let plansQuery = supabase.from('user_plans').select('user_id, race_id').is('deleted_at', null);
        
        if (!superAdmin && teamId) {
            profQuery = profQuery.eq('team_id', teamId);
            teamsQuery = teamsQuery.eq('id', teamId);
            plansQuery = plansQuery.eq('team_id', teamId);
        }

        const [profRes, teamsRes, plansRes] = await Promise.all([
            profQuery,
            teamsQuery,
            plansQuery
        ]);

        if (profRes.data) setProfiles(profRes.data);
        if (teamsRes.data) setTeams(teamsRes.data);
        
        if (plansRes.data) {
            setAllPlans(plansRes.data);
            const counts: Record<string, number> = {};
            plansRes.data.forEach(p => {
                counts[p.user_id] = (counts[p.user_id] || 0) + 1;
            });
            setPlansCount(counts);
        }
        setLoading(false);
    };

    const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
        if (!isSuperAdmin) return;
        const { error } = await supabase.from('profiles').update({ is_team_admin: !currentStatus }).eq('id', userId);
        if (error) alert("Errore: " + error.message);
        else fetchAllData(true, myProfile?.team_id);
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        alert(`Codice ${code} copiato!`);
    };

    const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('team-logos').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('team-logos').getPublicUrl(fileName);
            setTeamForm(prev => ({ ...prev, logo_url: publicUrl }));
        } catch (error: any) {
            alert("Errore caricamento logo: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { 
            ...teamForm, 
            join_code: teamForm.join_code.toUpperCase().trim() 
        };
        let error;
        if (editingTeam) {
            const res = await supabase.from('teams').update(payload).eq('id', editingTeam.id);
            error = res.error;
        } else {
            const res = await supabase.from('teams').insert([payload]);
            error = res.error;
        }
        if (error) {
            alert("Errore nel salvataggio del team: " + error.message);
        } else {
            setIsTeamModalOpen(false);
            setEditingTeam(null);
            setTeamForm({ name: '', join_code: '', primary_color: '#3b82f6', secondary_color: '#1e293b', logo_url: '', website_url: '', telegram_chat_id: '' });
            fetchAllData(isSuperAdmin, myProfile?.team_id);
        }
    };

    const handleUpdateAthleteTeam = React.useCallback(async (userId: string, teamId: string | null) => {
        const { error } = await supabase.from('profiles').update({ team_id: teamId }).eq('id', userId);
        if (error) alert("Errore aggiornamento atleta: " + error.message);
        else fetchAllData(isSuperAdmin, myProfile?.team_id);
    }, [isSuperAdmin, myProfile?.team_id]);

    const handleDeleteAthlete = React.useCallback(async (userId: string, name: string) => {
        if (!window.confirm(`Eliminare ${name}?`)) return;
        
        // 1. Aggiornamento UI IMMEDIATO (priorità alta)
        setProfiles(prev => prev.filter(p => p.id !== userId));

        // 2. Esecuzione in background (non blocca l'interfaccia)
        try {
            const timestamp = new Date().toISOString();
            // Eseguiamo le cancellazioni in PARALLELO (Soft Delete)
            Promise.all([
                supabase.from('user_plans').update({ deleted_at: timestamp }).eq('user_id', userId),
                supabase.from('profiles').update({ deleted_at: timestamp }).eq('id', userId)
            ]).then(([resPlans, resProf]) => {
                if (resProf.error || resPlans.error) {
                    alert("Errore durante l'eliminazione: " + (resProf.error?.message || resPlans.error?.message));
                    fetchAllData(isSuperAdmin, myProfile?.team_id); // Revert
                }
            });
        } catch (error: any) {
            console.error("Errore silente:", error);
        }
    }, [isSuperAdmin, myProfile?.team_id]);

    const handleDeleteTeam = React.useCallback(async (teamId: string, name: string) => {
        if (profiles.filter(p => p.team_id === teamId).length > 0) {
            alert(`Sposta prima gli atleti di ${name}.`);
            return;
        }
        if (!window.confirm(`Eliminare team ${name}?`)) return;
        const { error } = await supabase.from('teams').delete().eq('id', teamId);
        if (error) alert("Errore: " + error.message);
        else fetchAllData(isSuperAdmin, myProfile?.team_id);
    }, [profiles, isSuperAdmin, myProfile?.team_id]);

    const handleExportExcel = async () => {
        if (!profiles.length) return;
        const teamId = myProfile?.team_id || (editingTeam?.id);
        const teamName = teams.find(t => t.id === (isSuperAdmin ? teams[0]?.id : teamId))?.name || 'team';
        
        setLoading(true);
        try {
            const userIds = profiles.map(p => p.id);
            const { data: allTeamPlans, error } = await supabase
                .from('user_plans')
                .select('user_id, race_id')
                .in('user_id', userIds)
                .is('deleted_at', null);

            if (error) throw error;

            // Raggruppa per gara
            const raceGroups: Record<string, string[]> = {};
            allTeamPlans?.forEach(p => {
                if (!raceGroups[p.race_id]) raceGroups[p.race_id] = [];
                const athleteName = profiles.find(prof => prof.id === p.user_id)?.full_name || 'N/A';
                raceGroups[p.race_id].push(athleteName);
            });

            // Costruisci il CSV (compatibile Excel con separatore punto e virgola)
            let csvContent = "Gara;Data;Località;Atleti\n";
            
            // Ordiniamo le gare per data (usando i dati locali per velocità)
            const sortedRaces = [...(racesData as any[])].sort((a,b) => a.date.split("-").reverse().join("-").localeCompare(b.date.split("-").reverse().join("-")));

            sortedRaces.forEach(race => {
                const participants = raceGroups[race.id];
                if (participants && participants.length > 0) {
                    const row = [
                        `"${race.title.replace(/"/g, '""')}"`,
                        `"${race.date}"`,
                        `"${race.location.replace(/"/g, '""')}"`,
                        `"${participants.join(', ')}"`
                    ].join(';');
                    csvContent += row + "\n";
                }
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `elenco-gare-${teamName.toLowerCase().replace(/\s+/g, '-')}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            alert("Errore export excel: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExportTeamBackup = async () => {
        if (!profiles.length) return;
        const teamId = myProfile?.team_id || (editingTeam?.id);
        const teamName = teams.find(t => t.id === (isSuperAdmin ? teams[0]?.id : teamId))?.name || 'team';
        
        setLoading(true);
        try {
            const userIds = profiles.map(p => p.id);
            const { data: allTeamPlans, error } = await supabase
                .from('user_plans')
                .select('*')
                .in('user_id', userIds)
                .is('deleted_at', null);

            if (error) throw error;

            const backupData = {
                team: teams.find(t => t.id === (isSuperAdmin ? teams[0]?.id : teamId)),
                athletes: profiles,
                plans: allTeamPlans,
                exported_at: new Date().toISOString(),
                version: "4.5"
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `backup-${teamName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            alert("Errore durante l'export: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredProfiles = React.useMemo(() => 
        profiles.filter(p => (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())),
    [profiles, searchTerm]);

    const filteredTeams = React.useMemo(() => 
        teams.filter(t => (t.name || '').toLowerCase().includes(teamSearchTerm.toLowerCase()) || (t.join_code || '').toLowerCase().includes(teamSearchTerm.toLowerCase())),
    [teams, teamSearchTerm]);

    if (!loading && !isSuperAdmin && !myProfile?.is_team_admin) return <Navigate to="/" replace />;
    if (loading) return <div className="p-20 text-center font-black uppercase text-slate-400">Caricamento...</div>;

    return (
        <div className="max-w-6xl mx-auto px-4 py-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-500 p-4 rounded-[2rem] text-white shadow-xl rotate-3"><Shield className="w-8 h-8" /></div>
                    <div><h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">{isSuperAdmin ? 'SaaS Command Center' : `Gestione ${teams[0]?.name || 'Team'}`}</h1><p className="text-slate-500 font-bold text-sm">{isSuperAdmin ? 'Benvenuto Stefano.' : `Benvenuto ${myProfile?.full_name}.`}</p></div>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem]">
                    <button onClick={() => setActiveTab('atleti')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'atleti' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><div className="flex items-center gap-2"><Users className="w-4 h-4" /> Atleti</div></button>
                    {isSuperAdmin && <button onClick={() => setActiveTab('team')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'team' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><div className="flex items-center gap-2"><Trophy className="w-4 h-4" /> Team</div></button>}
                    <button onClick={() => setActiveTab('social')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'social' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}><div className="flex items-center gap-2"><Camera className="w-4 h-4" /> Social</div></button>
                </div>
            </div>

            {activeTab === 'atleti' && (
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative group max-w-md w-full"><Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" /><input type="text" placeholder="Cerca atleta..." className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-500 outline-none text-sm font-medium shadow-sm transition-all placeholder:text-slate-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={handleExportExcel}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all shrink-0 shadow-sm"
                            >
                                <FileText className="w-4 h-4" /> Esporta Elenco Gare (Excel)
                            </button>
                            <button 
                                onClick={handleExportTeamBackup}
                                className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shrink-0 shadow-sm"
                            >
                                <Download className="w-4 h-4" /> Scarica Backup Team
                            </button>
                        </div>
                    </div>
                    <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                            <thead><tr className="bg-slate-100"><th className="px-8 py-5 text-[11px] font-black text-slate-600 uppercase tracking-widest">Atleta</th><th className="px-8 py-5 text-[11px] font-black text-slate-600 uppercase tracking-widest">Team</th><th className="px-8 py-5 text-[11px] font-black text-slate-600 uppercase tracking-widest text-center">Gare</th><th className="px-8 py-5 text-[11px] font-black text-slate-600 uppercase tracking-widest text-right">Azioni</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProfiles.map((atleta) => (
                                    <tr key={atleta.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-800 flex items-center gap-2">
                                                        {atleta.full_name || 'N/A'}
                                                        {atleta.is_team_admin && <span title="Team Admin"><Shield className="w-3 h-3 text-amber-500 fill-current" /></span>}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{atleta.id.substring(0,8)}...</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5"><select value={atleta.team_id || ''} onChange={(e) => handleUpdateAthleteTeam(atleta.id, e.target.value || null)} className="bg-slate-100 border-none rounded-xl px-3 py-2 text-xs font-black uppercase text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" disabled={!isSuperAdmin}><option value="">Nessun Team</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></td>
                                        <td className="px-8 py-5 text-center"><span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-black">{plansCount[atleta.id] || 0}</span></td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {isSuperAdmin && (
                                                    <button 
                                                        onClick={() => handleToggleAdmin(atleta.id, atleta.is_team_admin)} 
                                                        className={`p-2 rounded-lg transition-colors ${atleta.is_team_admin ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
                                                        title={atleta.is_team_admin ? "Rimuovi privilegi Admin" : "Nomina Team Admin"}
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleDeleteAthlete(atleta.id, atleta.full_name)} 
                                                    className="p-2 text-slate-400 hover:text-red-700 transition-colors"
                                                    aria-label={`Elimina atleta ${atleta.full_name}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                        
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'social' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="bg-white p-2 rounded-2xl border border-slate-100 flex items-center gap-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 pl-3">Mese:</label>
                            <select 
                                value={socialMonth} 
                                onChange={(e) => setSocialMonth(e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-800 outline-none p-2 cursor-pointer"
                            >
                                {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                                    <option key={m} value={m}>{new Date(2026, parseInt(m)-1, 1).toLocaleString('it-IT', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={async () => {
                                    if (socialCardRef.current) {
                                        const { toPng } = await import('html-to-image');
                                        const dataUrl = await toPng(socialCardRef.current, { backgroundColor: '#0f172a', width: 1080, height: 1350 });
                                        const link = document.createElement('a');
                                        link.download = `social-stats-${socialMonth}-2026.png`;
                                        link.href = dataUrl;
                                        link.click();
                                    }
                                }}
                                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-purple-700 transition-all"
                            >
                                <Download className="w-4 h-4" /> Scarica Immagine
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* LISTA DATI */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                            <h3 className="text-xl font-black text-slate-800 uppercase mb-6 flex items-center gap-3">
                                <Trophy className="w-6 h-6 text-yellow-500" /> 
                                Top Athletes - {new Date(2026, parseInt(socialMonth)-1, 1).toLocaleString('it-IT', { month: 'long' })}
                            </h3>
                            <div className="space-y-4">
                                {(() => {
                                    // 1. Filtra piani per mese
                                    const relevantPlans = allPlans.filter(p => {
                                        const race = (racesData as any[]).find(r => r.id === p.race_id);
                                        if (!race) return false;
                                        const [d, m, y] = race.date.split("-");
                                        return m === socialMonth;
                                    });

                                    // 2. Conta per user
                                    const counts: Record<string, number> = {};
                                    relevantPlans.forEach(p => { counts[p.user_id] = (counts[p.user_id] || 0) + 1; });

                                    // 3. Ordina e prendi top 10
                                    const sortedUsers = Object.entries(counts)
                                        .sort(([,a], [,b]) => b - a)
                                        .slice(0, 10);

                                    if (sortedUsers.length === 0) return <div className="text-center py-10 text-slate-400 font-bold">Nessuna gara in questo mese.</div>;

                                    return sortedUsers.map(([userId, count], index) => {
                                        const profile = profiles.find(p => p.id === userId);
                                        return (
                                            <div key={userId} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-xs ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-white border text-slate-500'}`}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{profile?.full_name || 'Sconosciuto'}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase">{profile?.team_id || 'No Team'}</div>
                                                    </div>
                                                </div>
                                                <div className="text-xl font-black text-slate-800">{count} <span className="text-[10px] font-bold text-slate-400 uppercase">Gare</span></div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>

                        {/* ANTEPRIMA CARD */}
                        <div className="relative overflow-hidden rounded-[2.5rem] border-4 border-slate-100 bg-slate-900 flex items-center justify-center p-4 min-h-[600px]">
                            <p className="absolute text-[10px] font-black text-white/30 uppercase tracking-[0.3em] top-6 z-20">Anteprima Social Card</p>
                            
                            {/* Container di scaling per l'anteprima */}
                            <div className="w-full flex items-center justify-center overflow-hidden" style={{ height: '550px' }}>
                                <div 
                                    ref={socialCardRef}
                                    className="w-[1080px] h-[1350px] bg-slate-950 text-white relative flex flex-col items-center p-20 shrink-0"
                                    style={{ transform: 'scale(0.38)', transformOrigin: 'center center' }}
                                >
                                    {(() => {
                                        // Trova il team corrente per la card
                                        const currentTeam = isSuperAdmin 
                                            ? (teams.find(t => t.id === profiles.find(p => p.id === allPlans.find(pl => {
                                                const r = (racesData as any[]).find(rd => rd.id === pl.race_id);
                                                return r && r.date.split("-")[1] === socialMonth;
                                              })?.user_id)?.team_id) || teams[0])
                                            : teams.find(t => t.id === myProfile?.team_id);

                                        return (
                                            <>
                                                {/* Background Elements */}
                                                <div className="absolute top-0 right-0 w-[900px] h-[900px] bg-gradient-to-bl from-purple-500/30 to-transparent rounded-full blur-[120px] -mr-40 -mt-40"></div>
                                                <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-gradient-to-tr from-blue-500/30 to-transparent rounded-full blur-[120px] -ml-20 -mb-20"></div>
                                                <img src={currentTeam?.logo_url || "/Logo.png"} className="absolute top-20 right-20 w-48 opacity-10 grayscale brightness-200" alt="" />

                                                {/* Header */}
                                                <div className="w-full text-center mb-20 relative z-10">
                                                    <div className="inline-block px-12 py-6 bg-purple-600 rounded-full mb-8 shadow-2xl shadow-purple-900/50">
                                                        <span className="text-4xl font-black uppercase tracking-[0.3em]">Athlete of the Month</span>
                                                    </div>
                                                    <h1 className="text-[10rem] font-black uppercase tracking-tighter mb-4 leading-none">
                                                        {new Date(2026, parseInt(socialMonth)-1, 1).toLocaleString('it-IT', { month: 'long' })}
                                                    </h1>
                                                    <p className="text-5xl font-bold uppercase tracking-[0.6em] text-white/40">Ranking 2026</p>
                                                </div>

                                                {/* List */}
                                                <div className="w-full max-w-5xl space-y-10 relative z-10">
                                                    {(() => {
                                                        const relevantPlans = allPlans.filter(p => {
                                                            const race = (racesData as any[]).find(r => r.id === p.race_id);
                                                            return race && race.date.split("-")[1] === socialMonth;
                                                        });
                                                        const counts: Record<string, number> = {};
                                                        relevantPlans.forEach(p => { counts[p.user_id] = (counts[p.user_id] || 0) + 1; });
                                                        
                                                        const topAtleti = Object.entries(counts)
                                                            .sort(([,a], [,b]) => b - a)
                                                            .slice(0, 5);

                                                        if (topAtleti.length === 0) return <div className="text-center text-4xl font-bold text-white/20 mt-40 uppercase tracking-widest">No Races this Month</div>;

                                                        return topAtleti.map(([userId, count], index) => {
                                                                const profile = profiles.find(p => p.id === userId);
                                                                return (
                                                                    <div key={userId} className="flex items-center justify-between p-10 bg-white/5 rounded-[4rem] border border-white/10 backdrop-blur-xl shadow-2xl">
                                                                        <div className="flex items-center gap-12">
                                                                            <div className={`w-28 h-28 flex items-center justify-center rounded-[2.5rem] text-6xl font-black ${index === 0 ? 'bg-yellow-400 text-yellow-950' : index === 1 ? 'bg-slate-300 text-slate-900' : index === 2 ? 'bg-orange-400 text-orange-950' : 'bg-white/10 text-white'}`}>
                                                                                {index + 1}
                                                                            </div>
                                                                            <div className="text-6xl font-black">{profile?.full_name}</div>
                                                                        </div>
                                                                        <div className="flex flex-col items-center bg-white/10 px-10 py-6 rounded-[3rem] border border-white/5">
                                                                            <span className="text-6xl font-black text-purple-400">{count}</span>
                                                                            <span className="text-xl font-black uppercase tracking-[0.2em] opacity-40">Gare</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            });
                                                    })()}
                                                </div>

                                                {/* Footer */}
                                                <div className="mt-auto w-full flex items-center justify-between opacity-50 relative z-10">
                                                    <div className="flex items-center gap-8">
                                                        <img src={currentTeam?.logo_url || "/Logo.png"} className="w-24 h-24 object-contain grayscale brightness-200" alt="" />
                                                        <div className="text-left">
                                                            <div className="text-3xl font-black uppercase tracking-widest">{currentTeam?.name || 'Race Planner'}</div>
                                                            <div className="text-2xl font-bold">{currentTeam?.website_url || 'raceplanner.saas'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-2xl font-black opacity-40 uppercase tracking-[0.4em]">Official Ranking</div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'team' && isSuperAdmin && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative group max-w-md w-full"><Trophy className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" /><input type="text" placeholder="Cerca team..." className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-500 outline-none text-sm font-medium shadow-sm transition-all placeholder:text-slate-400" value={teamSearchTerm} onChange={(e) => setTeamSearchTerm(e.target.value)} /></div>
                        <button onClick={() => { setEditingTeam(null); setTeamForm({ name: '', join_code: '', primary_color: '#3b82f6', secondary_color: '#1e293b', logo_url: '', website_url: '' }); setIsTeamModalOpen(true); }} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all shrink-0"><Plus className="w-4 h-4" /> Nuovo Team</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTeams.map((team) => (
                            <div key={team.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-slate-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                                <div className="flex items-center gap-4 mb-6 relative z-10">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl p-2 flex items-center justify-center border border-slate-100"><img src={team.logo_url || "/Logo.png"} alt="" className="max-w-full max-h-full object-contain" /></div>
                                    <div className="flex-1">
                                        <h3 className="font-black text-slate-800 uppercase leading-none mb-1">{team.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 text-white uppercase tracking-tighter">{team.join_code}</span>
                                            <button 
                                                onClick={() => handleCopyCode(team.join_code)}
                                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                                title="Copia codice invito"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3 mb-8 relative z-10">
                                    <div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-500 uppercase">Colors</span><div className="flex gap-1"><div className="w-6 h-6 rounded-lg border border-slate-200" style={{ backgroundColor: team.primary_color }}></div><div className="w-6 h-6 rounded-lg border border-slate-200" style={{ backgroundColor: team.secondary_color }}></div></div></div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-500 uppercase">Telegram Notifications</span>
                                        {team.telegram_chat_id ? (
                                            <span className="flex items-center gap-1 text-blue-600 font-black"><Camera className="w-3 h-3" /> Active</span>
                                        ) : (
                                            <span className="text-slate-300 font-bold italic">Not set</span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-500 uppercase">Atleti</span><span className="font-black text-slate-800">{profiles.filter(p => p.team_id === team.id).length}</span></div>
                                </div>
                                <div className="flex items-center gap-2 mt-auto pt-6 border-t border-slate-50 relative z-10">
                                    <button 
                                        onClick={() => { setEditingTeam(team); setTeamForm({ name: team.name, join_code: team.join_code || '', primary_color: team.primary_color || '#3b82f6', secondary_color: team.secondary_color || '#1e293b', logo_url: team.logo_url || '', website_url: team.website_url || '', telegram_chat_id: team.telegram_chat_id || '' }); setIsTeamModalOpen(true); }} 
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-50 hover:text-blue-600 transition-all"
                                        aria-label={`Modifica team ${team.name}`}
                                    >
                                        <Edit2 className="w-3.5 h-3.5" /> Modifica
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteTeam(team.id, team.name)} 
                                        className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
                                        aria-label={`Elimina team ${team.name}`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <a 
                                        href={team.website_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all"
                                        aria-label={`Visita sito web di ${team.name}`}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isTeamModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-start mb-8"><div className="bg-blue-50 p-4 rounded-3xl text-blue-600 shadow-sm"><Trophy className="w-8 h-8" /></div><button onClick={() => setIsTeamModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-6 h-6 text-slate-400" /></button></div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">{editingTeam ? 'Modifica Team' : 'Nuovo Team'}</h3>
                        <form onSubmit={handleSaveTeam} className="space-y-5">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nome</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Codice</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold uppercase" value={teamForm.join_code} onChange={e => setTeamForm({...teamForm, join_code: e.target.value})} required /></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Colori</label><div className="flex items-center gap-2"><input type="color" className="w-10 h-10 rounded-xl cursor-pointer" value={teamForm.primary_color} onChange={e => setTeamForm({...teamForm, primary_color: e.target.value})} /><input type="color" className="w-10 h-10 rounded-xl cursor-pointer" value={teamForm.secondary_color} onChange={e => setTeamForm({...teamForm, secondary_color: e.target.value})} /></div></div>
                            </div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Logo</label><div className="flex items-center gap-4"><div className="w-16 h-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">{teamForm.logo_url ? <img src={teamForm.logo_url} alt="Preview" className="max-w-full max-h-full object-contain" /> : <Upload className="w-6 h-6 text-slate-300" />}</div><div className="flex-1"><input type="file" accept="image/*" id="logo-upload" className="hidden" onChange={handleUploadLogo} disabled={uploading} /><label htmlFor="logo-upload" className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${uploading ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>{uploading ? 'Caricamento...' : 'Carica'}</label></div></div><input type="text" className="w-full mt-3 px-5 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-[10px] font-medium" value={teamForm.logo_url} onChange={e => setTeamForm({...teamForm, logo_url: e.target.value})} placeholder="URL..." /></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Sito</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-medium" value={teamForm.website_url} onChange={e => setTeamForm({...teamForm, website_url: e.target.value})} /></div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">ID Gruppo Telegram (Multi-Team)</label>
                                <input 
                                    type="text" 
                                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-medium" 
                                    value={teamForm.telegram_chat_id} 
                                    onChange={e => setTeamForm({...teamForm, telegram_chat_id: e.target.value})} 
                                    placeholder="Es: -100123456789"
                                />
                                <p className="text-[9px] text-slate-400 mt-1 font-bold italic">Le notifiche del team verranno inviate a questo ID gruppo.</p>
                            </div>
                            <button type="submit" className="w-full mt-6 py-4 bg-slate-900 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Salva</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
