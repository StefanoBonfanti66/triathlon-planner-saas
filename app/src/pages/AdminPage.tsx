/**
 * Race Planner SaaS - Super Admin Dashboard
 * Author: Stefano Bonfanti
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Shield, Users, Trophy, Plus, Edit2, Trash2, 
  Settings, Save, X, ExternalLink, Mail, CheckCircle, Upload
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

const ADMIN_EMAIL = "bonfantistefano4@gmail.com";

const AdminPage: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false); // Stato per il caricamento file
    const [activeTab, setActiveTab] = useState<'atleti' | 'team'>('atleti');
    
    const [profiles, setProfiles] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [plansCount, setPlansCount] = useState<Record<string, number>>({});
    
    // Form Team
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<any>(null);
    const [teamForm, setTeamForm] = useState({
        name: '',
        join_code: '',
        primary_color: '#3b82f6',
        secondary_color: '#1e293b',
        logo_url: '',
        website_url: ''
    });

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user?.email === ADMIN_EMAIL) {
                fetchAllData();
            } else {
                setLoading(false);
            }
        });
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        const [profRes, teamsRes, plansRes] = await Promise.all([
            supabase.from('profiles').select('*').order('full_name'),
            supabase.from('teams').select('*').order('name'),
            supabase.from('user_plans').select('user_id')
        ]);

        if (profRes.data) setProfiles(profRes.data);
        if (teamsRes.data) setTeams(teamsRes.data);
        
        if (plansRes.data) {
            const counts: Record<string, number> = {};
            plansRes.data.forEach(p => {
                counts[p.user_id] = (counts[p.user_id] || 0) + 1;
            });
            setPlansCount(counts);
        }
        setLoading(false);
    };

    const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload su bucket 'team-logos'
            const { error: uploadError } = await supabase.storage
                .from('team-logos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Recupera Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('team-logos')
                .getPublicUrl(filePath);

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
            // Update: usiamo l'ID esistente
            const res = await supabase.from('teams').update(payload).eq('id', editingTeam.id);
            error = res.error;
        } else {
            // Insert: non inviamo l'ID, lasciamo che il DB lo generi (gen_random_uuid)
            const res = await supabase.from('teams').insert([payload]);
            error = res.error;
        }

        if (error) {
            alert("Errore nel salvataggio del team: " + error.message);
        } else {
            setIsTeamModalOpen(false);
            setEditingTeam(null);
            setTeamForm({ name: '', join_code: '', primary_color: '#3b82f6', secondary_color: '#1e293b', logo_url: '', website_url: '' });
            fetchAllData();
        }
    };

    const handleUpdateAthleteTeam = async (userId: string, teamId: string | null) => {
        const { error } = await supabase
            .from('profiles')
            .update({ team_id: teamId })
            .eq('id', userId);
        
        if (error) alert("Errore aggiornamento atleta: " + error.message);
        else fetchAllData();
    };

    const handleDeleteAthlete = async (userId: string, name: string) => {
        if (!window.confirm(`Sei sicuro di voler eliminare l'atleta ${name}? Questa azione rimuoverà anche i suoi piani gara.`)) return;
        
        // 1. Elimina i piani (per vincolo FK)
        await supabase.from('user_plans').delete().eq('user_id', userId);
        // 2. Elimina il profilo
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        
        if (error) alert("Errore eliminazione: " + error.message);
        else fetchAllData();
    };

    const handleDeleteTeam = async (teamId: string, name: string) => {
        const athletesInTeam = profiles.filter(p => p.team_id === teamId).length;
        if (athletesInTeam > 0) {
            alert(`Impossibile eliminare il team ${name}. Ci sono ancora ${athletesInTeam} atleti associati. Spostali prima di procedere.`);
            return;
        }
        
        if (!window.confirm(`Sei sicuro di voler eliminare il team ${name}?`)) return;
        
        const { error } = await supabase.from('teams').delete().eq('id', teamId);
        if (error) alert("Errore eliminazione team: " + error.message);
        else fetchAllData();
    };

    if (!loading && session?.user?.email !== ADMIN_EMAIL) {
        return <Navigate to="/" replace />;
    }

    if (loading) return <div className="p-20 text-center font-black uppercase text-slate-400">Accesso alla torre di controllo...</div>;

    return (
        <div className="max-w-6xl mx-auto px-4 py-10">
            {/* HEADER DASHBOARD */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-500 p-4 rounded-[2rem] text-white shadow-xl rotate-3">
                        <Shield className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">SaaS Command Center</h1>
                        <p className="text-slate-500 font-bold text-sm">Benvenuto Stefano. Gestisci i tuoi team e i tuoi atleti.</p>
                    </div>
                </div>
                
                <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem]">
                    <button 
                        onClick={() => setActiveTab('atleti')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'atleti' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Atleti</div>
                    </button>
                    <button 
                        onClick={() => setActiveTab('team')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'team' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        <div className="flex items-center gap-2"><Trophy className="w-4 h-4" /> Team</div>
                    </button>
                </div>
            </div>

            {/* CONTENUTO TAB ATLETI */}
            {activeTab === 'atleti' && (
                <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atleta</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Attuale</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Gare</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {profiles.map((atleta) => (
                                    <tr key={atleta.id} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-700">{atleta.full_name || 'N/A'}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{atleta.id.substring(0,8)}...</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <select 
                                                value={atleta.team_id || ''} 
                                                onChange={(e) => handleUpdateAthleteTeam(atleta.id, e.target.value || null)}
                                                className="bg-slate-100 border-none rounded-xl px-3 py-2 text-xs font-black uppercase text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                            >
                                                <option value="">Nessun Team</option>
                                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-black">
                                                {plansCount[atleta.id] || 0}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button 
                                                onClick={() => handleDeleteAthlete(atleta.id, atleta.full_name)}
                                                className="p-2 text-slate-400 hover:text-red-600 transition-colors" 
                                                title="Elimina atleta"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CONTENUTO TAB TEAM */}
            {activeTab === 'team' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button 
                            onClick={() => {
                                setEditingTeam(null);
                                setTeamForm({ name: '', join_code: '', primary_color: '#3b82f6', secondary_color: '#1e293b', logo_url: '', website_url: '' });
                                setIsTeamModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all"
                        >
                            <Plus className="w-4 h-4" /> Nuovo Team
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teams.map((team) => (
                            <div key={team.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-slate-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                                
                                <div className="flex items-center gap-4 mb-6 relative z-10">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl p-2 flex items-center justify-center border border-slate-100">
                                        <img src={team.logo_url || "/Logo.png"} alt="" className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 uppercase leading-none mb-1">{team.name}</h3>
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 text-white uppercase tracking-tighter">
                                            {team.join_code}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-8 relative z-10">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-400 uppercase">Brand Colors</span>
                                        <div className="flex gap-1">
                                            <div className="w-6 h-6 rounded-lg shadow-inner border border-white" style={{ backgroundColor: team.primary_color }} title="Primario"></div>
                                            <div className="w-6 h-6 rounded-lg shadow-inner border border-white" style={{ backgroundColor: team.secondary_color }} title="Secondario"></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-400 uppercase">Atleti Iscritti</span>
                                        <span className="font-black text-slate-700">{profiles.filter(p => p.team_id === team.id).length}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-auto pt-6 border-t border-slate-50 relative z-10">
                                    <button 
                                        onClick={() => {
                                            setEditingTeam(team);
                                            setTeamForm({
                                                name: team.name,
                                                join_code: team.join_code || '',
                                                primary_color: team.primary_color || '#3b82f6',
                                                secondary_color: team.secondary_color || '#1e293b',
                                                logo_url: team.logo_url || '',
                                                website_url: team.website_url || ''
                                            });
                                            setIsTeamModalOpen(true);
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-50 hover:text-blue-600 transition-all"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" /> Modifica
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteTeam(team.id, team.name)}
                                        className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
                                        title="Elimina Team"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <a 
                                        href={team.website_url} 
                                        target="_blank" 
                                        className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODALE FORM TEAM */}
            {isTeamModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-start mb-8">
                            <div className="bg-blue-50 p-4 rounded-3xl text-blue-600 shadow-sm">
                                <Trophy className="w-8 h-8" />
                            </div>
                            <button onClick={() => setIsTeamModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">
                            {editingTeam ? 'Modifica Team' : 'Nuovo Team'}
                        </h3>
                        <p className="text-slate-500 font-bold text-sm mb-8">Inserisci i dettagli del team per il branding dinamico.</p>

                        <form onSubmit={handleSaveTeam} className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nome Squadra</label>
                                <input 
                                    type="text" 
                                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold"
                                    value={teamForm.name}
                                    onChange={e => setTeamForm({...teamForm, name: e.target.value})}
                                    placeholder="Es: Valdigne Triathlon"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Codice Iscrizione</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold uppercase"
                                        value={teamForm.join_code}
                                        onChange={e => setTeamForm({...teamForm, join_code: e.target.value})}
                                        placeholder="VALDIGNE2026"
                                        required
                                    />
                                </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Colore Primario</label>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="color" 
                                            className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-none"
                                            value={teamForm.primary_color}
                                            onChange={e => setTeamForm({...teamForm, primary_color: e.target.value})}
                                        />
                                        <span className="text-xs font-black text-slate-600 uppercase">{teamForm.primary_color}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Colore Secondario</label>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="color" 
                                            className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-none"
                                            value={teamForm.secondary_color}
                                            onChange={e => setTeamForm({...teamForm, secondary_color: e.target.value})}
                                        />
                                        <span className="text-xs font-black text-slate-600 uppercase">{teamForm.secondary_color}</span>
                                    </div>
                                </div>
                            </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Logo Team</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                        {teamForm.logo_url ? (
                                            <img src={teamForm.logo_url} alt="Preview" className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <Upload className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            id="logo-upload"
                                            className="hidden"
                                            onChange={handleUploadLogo}
                                            disabled={uploading}
                                        />
                                        <label 
                                            htmlFor="logo-upload"
                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${uploading ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                        >
                                            {uploading ? 'Caricamento...' : 'Carica Immagine'}
                                        </label>
                                        <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">PNG o JPG, max 2MB. Oppure incolla URL sotto.</p>
                                    </div>
                                </div>
                                <input 
                                    type="text" 
                                    className="w-full mt-3 px-5 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-[10px] font-medium"
                                    value={teamForm.logo_url}
                                    onChange={e => setTeamForm({...teamForm, logo_url: e.target.value})}
                                    placeholder="O incolla URL diretto..."
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Sito Web</label>
                                <input 
                                    type="text" 
                                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-medium"
                                    value={teamForm.website_url}
                                    onChange={e => setTeamForm({...teamForm, website_url: e.target.value})}
                                    placeholder="https://..."
                                />
                            </div>

                            <button 
                                type="submit"
                                className="w-full mt-6 py-4 bg-slate-900 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" /> Salva Configurazione
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
