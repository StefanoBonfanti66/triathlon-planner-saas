/**
 * Race Planner SaaS - Super Admin Dashboard
 * Author: Stefano Bonfanti
 */
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Shield, Users, Trophy, Plus, Edit2, Trash2, 
  Save, X, ExternalLink, Mail, Upload, Download, FileText, Copy, Camera, FileSpreadsheet, AlertCircle, CheckCircle2, RotateCw, Calendar, Heart
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import racesData from "../races_full.json";
import * as XLSX from 'xlsx';

const ADMIN_EMAIL = "bonfantistefano4@gmail.com";

interface AthleteFormState {
    full_name: string; 
    email: string; // Aggiunto per onboarding
    password?: string; // Password temporanea opzionale
    team_id: string; 
    license_fitri: string; 
    license_fci: string; 
    medical_certificate_expiry: string;
    birth_year: string; 
    birth_date: string; 
    gender: string; 
    shirt_size: string;
    is_licensed: boolean; 
    is_licensed_fci: boolean;
    is_member: boolean; 
    is_team_admin: boolean;
}

interface AthleteModalProps {
    onClose: () => void;
    editingAthlete: any | null;
    athleteForm: AthleteFormState;
    setAthleteForm: React.Dispatch<React.SetStateAction<AthleteFormState>>;
    handleSaveAthlete: (e: React.FormEvent) => Promise<void>;
    teams: any[];
    isSuperAdmin: boolean;
}

const AthleteModal: React.FC<AthleteModalProps> = ({ 
    onClose, editingAthlete, athleteForm, setAthleteForm, handleSaveAthlete, teams, isSuperAdmin 
}) => (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white rounded-[3rem] p-10 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-8"><div className="bg-blue-50 p-4 rounded-3xl text-blue-600"><Users className="w-8 h-8" /></div><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-6 h-6 text-slate-400" /></button></div>
            <h3 className="text-2xl font-black text-slate-800 uppercase mb-6">{editingAthlete ? 'Modifica Anagrafica' : 'Nuovo Atleta'}</h3>
            <form onSubmit={handleSaveAthlete} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Nome Completo</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold" value={athleteForm.full_name} onChange={e => setAthleteForm({...athleteForm, full_name: e.target.value})} required /></div>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Email (Per Onboarding)</label><input type="email" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold" value={athleteForm.email} onChange={e => setAthleteForm({...athleteForm, email: e.target.value})} placeholder="atleta@esempio.it" /></div>
                        {!editingAthlete && (
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Password Temporanea (Opzionale)</label>
                                <input type="text" className="w-full px-5 py-3.5 bg-slate-100 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold" value={athleteForm.password || ''} onChange={e => setAthleteForm({...athleteForm, password: e.target.value})} placeholder="es: Gara2026!" />
                                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Se inserita, l'utente potrà loggarsi subito con questa password.</p>
                            </div>
                        )}
                        <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Team</label><select value={athleteForm.team_id} onChange={e => setAthleteForm({...athleteForm, team_id: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold" required><option value="">Seleziona Team</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Tessera FITRI</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold" value={athleteForm.license_fitri} onChange={e => setAthleteForm({...athleteForm, license_fitri: e.target.value})} /></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Tessera FCI</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold" value={athleteForm.license_fci} onChange={e => setAthleteForm({...athleteForm, license_fci: e.target.value})} /></div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Certificato Medico (Scadenza)</label><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold" value={athleteForm.medical_certificate_expiry} onChange={e => setAthleteForm({...athleteForm, medical_certificate_expiry: e.target.value})} /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Data di Nascita</label><div className="relative"><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold" value={athleteForm.birth_date} onChange={e => { const year = e.target.value.split('-')[0]; setAthleteForm({...athleteForm, birth_date: e.target.value, birth_year: year}); }} /><Calendar className="absolute right-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" /></div></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Anno (Cat)</label><input type="number" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold" value={athleteForm.birth_year} onChange={e => setAthleteForm({...athleteForm, birth_year: e.target.value})} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Sesso</label><select value={athleteForm.gender} onChange={e => setAthleteForm({...athleteForm, gender: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold"><option value="">-</option><option value="M">Maschio</option><option value="F">Femmina</option></select></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Taglia Maglia</label><select value={athleteForm.shirt_size} onChange={e => setAthleteForm({...athleteForm, shirt_size: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold"><option value="">-</option><option value="XS">XS</option><option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL</option></select></div>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-[2rem] space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tesserato FITRI</span><button type="button" onClick={() => setAthleteForm({...athleteForm, is_licensed: !athleteForm.is_licensed})} className={`w-12 h-6 rounded-full transition-all relative ${athleteForm.is_licensed ? 'bg-emerald-500' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${athleteForm.is_licensed ? 'left-7' : 'left-1'}`}></div></button></div>
                        <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tesserato FCI</span><button type="button" onClick={() => setAthleteForm({...athleteForm, is_licensed_fci: !athleteForm.is_licensed_fci})} className={`w-12 h-6 rounded-full transition-all relative ${athleteForm.is_licensed_fci ? 'bg-blue-500' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${athleteForm.is_licensed_fci ? 'left-7' : 'left-1'}`}></div></button></div>
                        <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Socio Associazione</span><button type="button" onClick={() => setAthleteForm({...athleteForm, is_member: !athleteForm.is_member})} className={`w-12 h-6 rounded-full transition-all relative ${athleteForm.is_member ? 'bg-pink-500' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${athleteForm.is_member ? 'left-7' : 'left-1'}`}></div></button></div>
                        {isSuperAdmin && <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Team Admin</span><button type="button" onClick={() => setAthleteForm({...athleteForm, is_team_admin: !athleteForm.is_team_admin})} className={`w-12 h-6 rounded-full transition-all relative ${athleteForm.is_team_admin ? 'bg-amber-500' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${athleteForm.is_team_admin ? 'left-7' : 'left-1'}`}></div></button></div>}
                    </div>
                </div>
                <button type="submit" className="w-full mt-6 py-4 bg-slate-900 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"><Save className="w-4 h-4" /> {editingAthlete ? 'Salva Modifiche' : 'Salva e Invia Invito Email'}</button>
            </form>
        </div>
    </div>
);

const AdminPage: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [myProfile, setMyProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'atleti' | 'team' | 'social' | 'logs' | 'stats'>('atleti');
    const [searchTerm, setSearchTerm] = useState('');
    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    
    const [profiles, setProfiles] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [allPlans, setAllPlans] = useState<any[]>([]);
    const [plansCount, setPlansCount] = useState<Record<string, number>>({});
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    // Athlete Modal State
    const [isAthleteModalOpen, setIsAthleteModalOpen] = useState(false);
    const [editingAthlete, setEditingAthlete] = useState<any>(null);
    const [athleteForm, setAthleteForm] = useState<AthleteFormState>({
        full_name: '', 
        email: '', 
        team_id: '', 
        license_fitri: '', 
        license_fci: '', 
        medical_certificate_expiry: '',
        birth_year: '', 
        birth_date: '', 
        gender: '', 
        shirt_size: '',
        is_licensed: false, 
        is_licensed_fci: false,
        is_member: false, 
        is_team_admin: false
    });

    // Statistiche State
    const [stats, setStats] = useState({
        topRaces: [] as any[],
        categoryDist: {} as Record<string, number>,
        monthlyActivity: {} as Record<string, number>,
        totalAthletes: 0,
        activeAthletes: 0
    });
    
    // Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importData, setImportData] = useState<any[]>([]);
    const [selectedImportTeam, setSelectedImportTeam] = useState<string>('');
    const [importResults, setImportResults] = useState<{success: number, errors: string[]}>({ success: 0, errors: [] });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Social Stats State
    const [socialMonth, setSocialMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
    const [selectedSocialTeam, setSelectedSocialTeam] = useState<string>('');
    const socialCardRef = React.useRef<HTMLDivElement>(null);

    // Team Modal State
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<any>(null);
    const [teamForm, setTeamForm] = useState({
        name: '', join_code: '', primary_color: '#3b82f6', secondary_color: '#1e293b', 
        logo_url: '', website_url: '', telegram_chat_id: '', admin_telegram_chat_id: '', federation_code: ''
    });

    const isSuperAdmin = session?.user?.email === ADMIN_EMAIL;

    // Social Stats Logic Memoizzata
    const socialData = React.useMemo(() => {
        const monthPlans = allPlans.filter(p => {
            const race = (racesData as any[]).find(r => r.id === p.race_id);
            if (!race) return false;
            const [, m] = race.date.split("-");
            const monthMatch = m === socialMonth;
            
            if (isSuperAdmin && selectedSocialTeam) {
                const athlete = profiles.find(prof => prof.id === p.user_id);
                return monthMatch && athlete?.team_id === selectedSocialTeam;
            }
            return monthMatch;
        });

        const counts: Record<string, number> = {};
        monthPlans.forEach(p => { counts[p.user_id] = (counts[p.user_id] || 0) + 1; });

        const sorted = Object.entries(counts)
            .sort(([,a], [,b]) => b - a)
            .map(([userId, count]) => ({
                userId, count,
                profile: profiles.find(p => p.id === userId)
            }))
            .slice(0, 10);

        let displayTeam = teams[0];
        if (isSuperAdmin && selectedSocialTeam) {
            displayTeam = teams.find(t => t.id === selectedSocialTeam) || teams[0];
        } else if (!isSuperAdmin) {
            displayTeam = teams.find(t => t.id === myProfile?.team_id) || teams[0];
        } else if (sorted.length > 0) {
            const topAthleteTeamId = sorted[0].profile?.team_id;
            displayTeam = teams.find(t => t.id === topAthleteTeamId) || teams[0];
        }

        return { topAtleti: sorted, displayTeam };
    }, [socialMonth, selectedSocialTeam, allPlans, profiles, teams, isSuperAdmin, myProfile]);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (session?.user) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                setMyProfile(profile);
                if (profile?.team_id) setSelectedImportTeam(profile.team_id);
                if (session.user.email === ADMIN_EMAIL || profile?.is_team_admin) {
                    fetchAllData(session.user.email === ADMIN_EMAIL, profile?.team_id);
                } else { setLoading(false); }
            }
        };
        init();
    }, []);

    const getFitriCategory = (birthYear: any) => {
        const year = parseInt(birthYear);
        if (!year || isNaN(year)) return "N/D";
        const age = 2026 - year;
        if (age < 6) return "N/A";
        if (age <= 7) return "MC";
        if (age <= 9) return "CU";
        if (age <= 11) return "ES";
        if (age <= 13) return "RA";
        if (age <= 15) return "YA";
        if (age <= 17) return "YB";
        if (age <= 19) return "JU";
        if (age <= 24) return "S1";
        if (age <= 29) return "S2";
        if (age <= 34) return "S3";
        if (age <= 39) return "S4";
        if (age <= 44) return "M1";
        if (age <= 49) return "M2";
        if (age <= 54) return "M3";
        if (age <= 59) return "M4";
        if (age <= 64) return "M5";
        if (age <= 69) return "M6";
        if (age <= 74) return "M7";
        return "M8";
    };

    const fetchAllData = async (superAdmin: boolean, teamId?: string) => {
        setLoading(true);
        let profQuery = supabase.from('profiles').select('*').is('deleted_at', null).order('full_name');
        let teamsQuery = supabase.from('teams').select('*').order('name');
        let plansQuery = supabase.from('user_plans').select('user_id, race_id').is('deleted_at', null);
        let logsQuery = supabase.from('audit_logs').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(50);
        
        if (!superAdmin && teamId) {
            profQuery = profQuery.eq('team_id', teamId);
            teamsQuery = teamsQuery.eq('id', teamId);
            plansQuery = plansQuery.eq('team_id', teamId);
            logsQuery = logsQuery.eq('team_id', teamId);
        }

        const [profRes, teamsRes, plansRes, logsRes] = await Promise.all([profQuery, teamsQuery, plansQuery, logsQuery]);

        if (profRes.data) {
            setProfiles(profRes.data);
            if (plansRes.data) {
                const raceMap: Record<string, number> = {};
                const catMap: Record<string, number> = {};
                const monthMap: Record<string, number> = {};
                const activeUsers = new Set();
                plansRes.data.forEach((p: any) => {
                    raceMap[p.race_id] = (raceMap[p.race_id] || 0) + 1;
                    activeUsers.add(p.user_id);
                    const raceInfo = (racesData as any[]).find(r => r.id === p.race_id);
                    if (raceInfo) {
                        const month = raceInfo.date.split('-')[1];
                        const monthLabel = new Date(2026, parseInt(month) - 1).toLocaleString('it-IT', { month: 'long' });
                        monthMap[monthLabel] = (monthMap[monthLabel] || 0) + 1;
                    }
                });
                profRes.data.forEach(prof => {
                    const category = getFitriCategory(prof.birth_year);
                    if (category && category !== "N/D") catMap[category] = (catMap[category] || 0) + 1;
                });
                setStats({
                    topRaces: Object.entries(raceMap).map(([id, count]) => ({ id, count, title: (racesData as any[]).find(r => r.id === id)?.title || "Gara sconosciuta" })).sort((a, b) => b.count - a.count).slice(0, 5),
                    categoryDist: catMap, monthlyActivity: monthMap, totalAthletes: profRes.data.length, activeAthletes: activeUsers.size
                });
            }
        }
        if (teamsRes.data) setTeams(teamsRes.data);
        if (logsRes.data) setAuditLogs(logsRes.data);
        if (plansRes.data) {
            setAllPlans(plansRes.data);
            const counts: Record<string, number> = {};
            plansRes.data.forEach(p => { counts[p.user_id] = (counts[p.user_id] || 0) + 1; });
            setPlansCount(counts);
        }
        setLoading(false);
    };

    const logAdminAction = async (action: string, details: any = {}) => {
        try {
            await supabase.from('audit_logs').insert({
                admin_id: session?.user?.id,
                team_id: myProfile?.team_id || (isSuperAdmin ? 'system' : null),
                action, details
            });
        } catch (err) { console.error("Errore log:", err); }
    };

    // Handlers Atleti
    const handleUpdateBirthYear = async (userId: string, birthYear: string) => {
        const { error } = await supabase.from('profiles').update({ birth_year: birthYear }).eq('id', userId);
        if (error) alert("Errore: " + error.message);
        else {
            logAdminAction('UPDATE_BIRTH_YEAR', { userId, birthYear });
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, birth_year: birthYear } : p));
        }
    };

    const handleToggleLicensed = async (userId: string, currentStatus: boolean) => {
        const { error } = await supabase.from('profiles').update({ is_licensed: !currentStatus }).eq('id', userId);
        if (error) alert("Errore: " + error.message);
        else {
            logAdminAction('TOGGLE_LICENSED', { userId, newStatus: !currentStatus });
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_licensed: !currentStatus } : p));
        }
    };

    const handleToggleLicensedFci = async (userId: string, currentStatus: boolean) => {
        const { error } = await supabase.from('profiles').update({ is_licensed_fci: !currentStatus }).eq('id', userId);
        if (error) alert("Errore: " + error.message);
        else {
            logAdminAction('TOGGLE_LICENSED_FCI', { userId, newStatus: !currentStatus });
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_licensed_fci: !currentStatus } : p));
        }
    };

    const handleToggleMember = async (userId: string, currentStatus: boolean) => {
        const { error } = await supabase.from('profiles').update({ is_member: !currentStatus }).eq('id', userId);
        if (error) alert("Errore: " + error.message);
        else {
            logAdminAction('TOGGLE_MEMBER', { userId, newStatus: !currentStatus });
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_member: !currentStatus } : p));
        }
    };

    const handleUpdateCertificate = async (userId: string, expiryDate: string) => {
        const { error } = await supabase.from('profiles').update({ medical_certificate_expiry: expiryDate }).eq('id', userId);
        if (error) alert("Errore: " + error.message);
        else {
            logAdminAction('UPDATE_CERTIFICATE', { userId, expiryDate });
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, medical_certificate_expiry: expiryDate } : p));
        }
    };

    const handleUpdateAthleteTeam = async (userId: string, teamId: string | null) => {
        const { error } = await supabase.from('profiles').update({ team_id: teamId }).eq('id', userId);
        if (error) alert("Errore: " + error.message);
        else {
            logAdminAction('UPDATE_ATHLETE_TEAM', { userId, teamId });
            fetchAllData(isSuperAdmin, myProfile?.team_id);
        }
    };

    const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
        if (!isSuperAdmin) return;
        const { error } = await supabase.from('profiles').update({ is_team_admin: !currentStatus }).eq('id', userId);
        if (error) alert("Errore: " + error.message);
        else {
            logAdminAction('TOGGLE_TEAM_ADMIN', { userId, newStatus: !currentStatus });
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_team_admin: !currentStatus } : p));
        }
    };

    const handleDeleteAthlete = async (userId: string, name: string) => {
        if (!window.confirm(`Eliminare ${name}?`)) return;
        const timestamp = new Date().toISOString();
        setProfiles(prev => prev.filter(p => p.id !== userId));
        const { error } = await supabase.from('profiles').update({ deleted_at: timestamp }).eq('id', userId);
        if (error) { alert("Errore: " + error.message); fetchAllData(isSuperAdmin, myProfile?.team_id); }
        else { logAdminAction('DELETE_ATHLETE', { userId, name }); await supabase.from('user_plans').update({ deleted_at: timestamp }).eq('user_id', userId); }
    };

    const handleDeleteTeam = async (teamId: string, name: string) => {
        if (!isSuperAdmin) return;
        if (!window.confirm(`Eliminare definitivamente il team ${name}? Questa azione non può essere annullata.`)) return;
        const { error } = await supabase.from('teams').delete().eq('id', teamId);
        if (error) alert("Errore: " + error.message);
        else { logAdminAction('DELETE_TEAM', { teamId, name }); fetchAllData(isSuperAdmin, myProfile?.team_id); }
    };

    const handleSaveAthlete = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const combinedLicense = [athleteForm.license_fitri, athleteForm.license_fci].filter(Boolean).join('/');
            const payload: any = { 
                full_name: athleteForm.full_name,
                email: athleteForm.email,
                team_id: athleteForm.team_id,
                license_number: combinedLicense,
                medical_certificate_expiry: athleteForm.medical_certificate_expiry || null,
                birth_year: athleteForm.birth_year || null,
                birth_date: athleteForm.birth_date || null,
                gender: athleteForm.gender,
                shirt_size: athleteForm.shirt_size,
                is_licensed: athleteForm.is_licensed,
                is_licensed_fci: athleteForm.is_licensed_fci,
                is_member: athleteForm.is_member,
                is_team_admin: athleteForm.is_team_admin
            };
            
            let error;
            if (editingAthlete) {
                // Rimuoviamo la password dal payload di update del profilo
                const { password, email, ...updatePayload } = payload;
                error = (await supabase.from('profiles').update(updatePayload).eq('id', editingAthlete.id)).error;
            } else {
                // Nuova logica: Crea l'atleta via RPC per la parte anagrafica
                const { data: rpcRes, error: rpcErr } = await supabase.rpc('invite_athlete', {
                    p_full_name: payload.full_name,
                    p_email: payload.email,
                    p_team_id: payload.team_id,
                    p_license_number: payload.license_number,
                    p_medical_expiry: payload.medical_certificate_expiry,
                    p_birth_year: payload.birth_year,
                    p_birth_date: payload.birth_date,
                    p_gender: payload.gender,
                    p_shirt_size: payload.shirt_size,
                    p_is_licensed: payload.is_licensed,
                    p_is_licensed_fci: payload.is_licensed_fci,
                    p_is_member: payload.is_member,
                    p_is_team_admin: payload.is_team_admin
                });
                
                if (rpcErr) throw rpcErr;
                if (rpcRes && !rpcRes.success) throw new Error(rpcRes.message);

                // Gestione Auth: Se c'è una password, creiamo l'utente direttamente
                if (athleteForm.password && athleteForm.password.trim().length >= 6) {
                    const { error: authError } = await supabase.auth.admin.createUser({
                        email: payload.email,
                        password: athleteForm.password,
                        email_confirm: true,
                        user_metadata: { full_name: payload.full_name, team_id: payload.team_id }
                    });
                    if (authError) {
                        console.warn("Creazione Auth diretta fallita: ", authError.message);
                        alert("Profilo creato, ma errore creazione account (password): " + authError.message);
                    }
                } else {
                    // Altrimenti mandiamo il classico invito
                    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(payload.email, {
                        data: { full_name: payload.full_name, team_id: payload.team_id }
                    });
                    if (inviteError) {
                        console.warn("Invito email fallito (Auth API): ", inviteError.message);
                    }
                }
                
                error = null;
            }
            if (error) throw error;
            logAdminAction(editingAthlete ? 'UPDATE_ATHLETE' : 'CREATE_ATHLETE', { name: athleteForm.full_name, email: athleteForm.email });
            setIsAthleteModalOpen(false);
            fetchAllData(isSuperAdmin, myProfile?.team_id);
            
            if (!editingAthlete) {
                if (athleteForm.password) {
                    alert(`Atleta creato con successo! Può loggarsi subito con:\nEmail: ${payload.email}\nPassword: ${athleteForm.password}`);
                } else {
                    alert("Atleta creato con successo. Riceverà l'email di invito se SMTP è attivo.");
                }
            }
        } catch (err: any) { alert("Errore: " + err.message); }
    };

    const formatDisplayName = (name: string) => {
        const parts = (name || '').trim().split(/\s+/);
        if (parts.length <= 1) return name || 'N/A';
        const surname = parts.pop()?.toUpperCase() || '';
        const rest = parts.join(' ');
        return `${surname} ${rest}`;
    };

    const AthleteRow = ({ atleta }: { atleta: any }) => {
        const isExpired = atleta.medical_certificate_expiry && new Date(atleta.medical_certificate_expiry) < new Date();
        const [fitri, fci] = (atleta.license_number || '').split('/');
        
        return (
            <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4">
                    <div className="flex flex-col">
                        <span className="font-black text-slate-800 flex items-center gap-2 text-sm">
                            {formatDisplayName(atleta.full_name)}
                            {atleta.is_team_admin && <Shield className="w-3 h-3 text-amber-500 fill-current" />}
                        </span>
                        <div className="flex flex-col gap-0.5">
                            <select value={atleta.team_id || ''} onChange={(e) => handleUpdateAthleteTeam(atleta.id, e.target.value || null)} className="bg-transparent border-none p-0 text-[10px] font-bold uppercase text-blue-600 focus:ring-0 cursor-pointer" disabled={!isSuperAdmin}><option value="">Nessun Team</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                            {atleta.email && <span className="text-[9px] text-slate-400 font-medium italic">{atleta.email}</span>}
                        </div>
                    </div>
                </td>
                <td className="px-4 py-4">
                    <div className="flex flex-col gap-0.5 min-w-[80px]">
                        <div className="flex items-center gap-1.5"><span className="text-[8px] font-black bg-blue-50 text-blue-600 px-1 rounded">FITRI</span><span className="text-[10px] font-bold text-slate-600">{fitri || '-'}</span></div>
                        <div className="flex items-center gap-1.5"><span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-1 rounded">FCI</span><span className="text-[10px] font-bold text-slate-600">{fci || '-'}</span></div>
                    </div>
                </td>
                <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                        <input type="date" value={atleta.medical_certificate_expiry || ''} onChange={(e) => handleUpdateCertificate(atleta.id, e.target.value)} className={`bg-transparent border-none text-[11px] font-bold p-0 focus:ring-0 ${isExpired ? 'text-red-600' : 'text-slate-600'}`} />
                        {isExpired && <AlertCircle className="w-3 h-3 text-red-500" />}
                    </div>
                </td>
                <td className="px-4 py-4">
                    <div className="flex flex-col">
                        <input type="number" value={atleta.birth_year || ''} onBlur={(e) => handleUpdateBirthYear(atleta.id, e.target.value)} onChange={(e) => setProfiles(prev => prev.map(p => p.id === atleta.id ? { ...p, birth_year: e.target.value } : p))} className="w-12 bg-transparent border-none p-0 text-xs font-bold focus:ring-0" />
                        <span className="text-[9px] font-black uppercase text-slate-400">{getFitriCategory(atleta.birth_year)}</span>
                    </div>
                </td>
                <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                        <button onClick={() => handleToggleLicensed(atleta.id, atleta.is_licensed)} className={`p-1.5 rounded-lg transition-all ${atleta.is_licensed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-300'}`} title="Tesserato FITRI"><CheckCircle2 className="w-4 h-4" /></button>
                        <button onClick={() => handleToggleLicensedFci(atleta.id, atleta.is_licensed_fci)} className={`p-1.5 rounded-lg transition-all ${atleta.is_licensed_fci ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-50 text-slate-300'}`} title="Tesserato FCI"><CheckCircle2 className="w-4 h-4" /></button>
                        <button onClick={() => handleToggleMember(atleta.id, atleta.is_member)} className={`p-1.5 rounded-lg transition-all ${atleta.is_member ? 'bg-pink-50 text-pink-600 border border-pink-100' : 'bg-slate-50 text-slate-300'}`} title="Socio Associazione"><Heart className={`w-4 h-4 ${atleta.is_member ? 'fill-current' : ''}`} /></button>
                    </div>
                </td>
                <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md text-[10px] font-black">{plansCount[atleta.id] || 0}</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => { 
                                const [fit, fc] = (atleta.license_number || '').split('/');
                                setEditingAthlete(atleta); 
                                setAthleteForm({ 
                                    full_name: atleta.full_name || '', 
                                    email: atleta.email || '', 
                                    team_id: atleta.team_id || '', 
                                    license_fitri: fit || '', 
                                    license_fci: fc || '', 
                                    medical_certificate_expiry: atleta.medical_certificate_expiry || '', 
                                    birth_year: atleta.birth_year || '', 
                                    birth_date: atleta.birth_date || '', 
                                    gender: atleta.gender || '', 
                                    shirt_size: atleta.shirt_size || '', 
                                    is_licensed: atleta.is_licensed || false, 
                                    is_licensed_fci: atleta.is_licensed_fci || false,
                                    is_member: atleta.is_member || false, 
                                    is_team_admin: atleta.is_team_admin || false 
                                }); 
                                setIsAthleteModalOpen(true); 
                            }} className="p-1.5 text-slate-300 hover:text-blue-600 transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                            {isSuperAdmin && <button onClick={() => handleToggleAdmin(atleta.id, atleta.is_team_admin)} className={`p-1.5 rounded-lg ${atleta.is_team_admin ? 'text-amber-600 bg-amber-50' : 'text-slate-300'}`}><Shield className="w-3.5 h-3.5" /></button>}
                            <button onClick={() => handleDeleteAthlete(atleta.id, atleta.full_name)} className="p-1.5 text-slate-300 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>
                </td>
            </tr>
        );
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader(); reader.onload = (event) => {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            setImportData(json.map((row: any) => ({ full_name: row['Nome Completo'] || row['Nome'] || row['atleta'], email: row['Email'] || row['email'] })).filter(item => item.full_name));
            setIsImportModalOpen(true); if (fileInputRef.current) fileInputRef.current.value = '';
        }; reader.readAsArrayBuffer(file);
    };

    const confirmBulkImport = async () => {
        setImporting(true); const teamId = isSuperAdmin ? selectedImportTeam : myProfile?.team_id;
        const { data, error } = await supabase.from('profiles').insert(importData.map(a => ({ full_name: a.full_name, team_id: teamId }))).select();
        if (error) { setImportResults({ success: 0, errors: [error.message] }); }
        else { setImportResults({ success: data.length, errors: [] }); logAdminAction('BULK_IMPORT', { count: data.length, teamId }); fetchAllData(isSuperAdmin, myProfile?.team_id); }
        setImporting(false);
    };

    const handleExportAthletesExcel = () => {
        const formatDate = (dateStr: string) => {
            if (!dateStr || dateStr === 'N/D') return dateStr;
            try {
                const [year, month, day] = dateStr.split('-');
                if (!year || !month || !day) return dateStr;
                return `${day}/${month}/${year}`;
            } catch {
                return dateStr;
            }
        };

        const data = profiles.map(p => {
            const [fitri, fci] = (p.license_number || '').split('/');
            return {
                'Cognome': p.last_name || p.full_name?.split(' ')[0] || '',
                'Nome': p.first_name || p.full_name?.split(' ').slice(1).join(' ') || '',
                'Sesso': p.gender || '',
                'Email': p.email || '',
                'Data di Nascita': formatDate(p.birth_date) || '',
                'Nazionalità': p.nationality || 'Italiana',
                'Indirizzo': p.address || '',
                'Città': p.city || '',
                'Provincia': p.province || '',
                'Stato': p.country || 'Italia',
                'CAP': p.zip_code || '',
                'Telefono': p.phone || '',
                'Tessera FITRI': fitri || '',
                'Tessera FCI': fci || '',
                'Squadra Esterna': p.external_team_name || '',
                'Codice Squadra Esterna': p.external_team_code || '',
                'Team Corrente': teams.find(t => t.id === p.team_id)?.name || 'Nessuno',
                'Anno Nascita': p.birth_year || '',
                'Categoria': getFitriCategory(p.birth_year),
                'Tesserato': p.is_licensed ? 'Sì' : 'No',
                'Socio': p.is_member ? 'Sì' : 'No',
                'Scadenza Certificato': formatDate(p.medical_certificate_expiry) || 'N/D',
                'Taglia Maglia': p.shirt_size || '',
                'Gare Pianificate': plansCount[p.id] || 0
            };
        });
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Atleti");
        XLSX.writeFile(wb, `anagrafica-atleti-${new Date().toISOString().split('T')[0]}.xlsx`);
        logAdminAction('EXPORT_ATHLETES_EXCEL', { count: data.length });
    };

    const handleExportExcel = async () => {
        const userIds = profiles.map(p => p.id);
        const { data: plans } = await supabase.from('user_plans').select('user_id, race_id').in('user_id', userIds).is('deleted_at', null);
        const raceGroups: Record<string, string[]> = {};
        plans?.forEach(p => { if (!raceGroups[p.race_id]) raceGroups[p.race_id] = []; raceGroups[p.race_id].push(profiles.find(prof => prof.id === p.user_id)?.full_name || 'N/A'); });
        let csv = "Gara;Data;Atleti\n"; (racesData as any[]).forEach(r => { if (raceGroups[r.id]) csv += `"${r.title}";"${r.date.replace(/-/g, '/')}";"${raceGroups[r.id].join(', ')}"\n`; });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `gare-team.csv`; link.click();
    };

    const handleSaveTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...teamForm, join_code: teamForm.join_code.toUpperCase().trim() };
        let error = editingTeam ? (await supabase.from('teams').update(payload).eq('id', editingTeam.id)).error : (await supabase.from('teams').insert([payload])).error;
        if (error) alert("Errore: " + error.message);
        else { logAdminAction(editingTeam ? 'UPDATE_TEAM' : 'CREATE_TEAM', { teamName: teamForm.name }); setIsTeamModalOpen(false); fetchAllData(isSuperAdmin, myProfile?.team_id); }
    };

    const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `team-logos/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('team-logos').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('team-logos').getPublicUrl(filePath);
            setTeamForm({ ...teamForm, logo_url: publicUrl });
            logAdminAction('UPLOAD_TEAM_LOGO', { fileName, publicUrl });
        } catch (err: any) {
            alert("Errore caricamento: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        alert("Codice copiato!");
    };

    const filteredProfiles = profiles
        .filter(p => (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            const getSortableName = (name: string) => {
                const parts = name.trim().split(/\s+/);
                if (parts.length <= 1) return name.toLowerCase();
                const surname = parts.pop()?.toLowerCase() || '';
                const rest = parts.join(' ').toLowerCase();
                return `${surname} ${rest}`;
            };
            return getSortableName(a.full_name || '').localeCompare(getSortableName(b.full_name || ''));
        });
    const filteredTeams = teams.filter(t => (t.name || '').toLowerCase().includes(teamSearchTerm.toLowerCase()) || (t.join_code || '').toLowerCase().includes(teamSearchTerm.toLowerCase()));

    if (!loading && !isSuperAdmin && !myProfile?.is_team_admin) return <Navigate to="/" replace />;
    if (loading) return <div className="p-20 text-center font-black uppercase text-slate-400">Caricamento...</div>;

    return (
        <div className="max-w-6xl mx-auto px-4 py-10">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-4"><div className="bg-amber-500 p-4 rounded-[2rem] text-white shadow-xl rotate-3"><Shield className="w-8 h-8" /></div><div><h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">{isSuperAdmin ? 'SaaS Command Center' : `Gestione ${teams[0]?.name}`}</h1><p className="text-slate-500 font-bold text-sm">Benvenuto Stefano.</p></div></div>
                <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] overflow-x-auto no-scrollbar">
                    {['atleti', 'stats', 'social', 'logs'].map(tab => (<button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{tab}</button>))}
                    {isSuperAdmin && <button onClick={() => setActiveTab('team')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'team' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Team</button>}
                </div>
            </div>

            {activeTab === 'atleti' && (
                <div className="space-y-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative group max-w-md w-full"><Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" /><input type="text" placeholder="Cerca atleta..." className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-2xl outline-none text-sm font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                        <div className="flex flex-wrap gap-2">
                            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileImport} />
                            <button onClick={() => { setEditingAthlete(null); setAthleteForm({ full_name: '', email: '', team_id: isSuperAdmin ? '' : (myProfile?.team_id || ''), license_fitri: '', license_fci: '', medical_certificate_expiry: '', birth_year: '', birth_date: '', gender: '', shirt_size: '', is_licensed: false, is_licensed_fci: false, is_member: false, is_team_admin: false }); setIsAthleteModalOpen(true); }} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all"><Plus className="w-4 h-4" /> Nuovo Atleta</button>
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200"><FileSpreadsheet className="w-4 h-4" /> Importa</button>
                            <button onClick={handleExportAthletesExcel} className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"><Download className="w-4 h-4" /> Esporta Atleti</button>
                            <button onClick={handleExportExcel} className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-emerald-100"><FileText className="w-4 h-4" /> Esporta Gare</button>
                        </div>
                    </div>
                    {isImportModalOpen && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                            <div className="bg-white rounded-[3rem] p-10 max-lg w-full shadow-2xl overflow-hidden flex flex-col">
                                <div className="flex justify-between mb-6"><div className="bg-blue-50 p-4 rounded-3xl text-blue-600"><FileSpreadsheet className="w-8 h-8" /></div><button onClick={() => setIsImportModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-6 h-6 text-slate-400" /></button></div>
                                {importResults.success > 0 ? (
                                    <div className="space-y-6"><div className="p-6 bg-emerald-50 text-emerald-700 rounded-[2rem] font-black uppercase text-sm flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> {importResults.success} Atleti Importati</div><button onClick={() => setIsImportModalOpen(false)} className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] text-xs font-black uppercase">Chiudi</button></div>
                                ) : (
                                    <><h3 className="text-2xl font-black text-slate-800 uppercase mb-2">Conferma Importazione</h3><p className="text-slate-500 font-bold text-sm mb-6">Trovati {importData.length} atleti. Confermi?</p>{isSuperAdmin && (<select value={selectedImportTeam} onChange={(e) => setSelectedImportTeam(e.target.value)} className="w-full mb-6 p-4 bg-slate-50 rounded-2xl font-black uppercase text-xs border-2 border-slate-100">{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>)}<div className="flex gap-4"><button onClick={() => setIsImportModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[1.5rem] text-xs font-black uppercase">Annulla</button><button onClick={confirmBulkImport} disabled={importing} className="flex-[2] py-4 bg-blue-600 text-white rounded-[1.5rem] text-xs font-black uppercase shadow-xl shadow-blue-200">{importing ? 'Importazione...' : 'Conferma'}</button></div></>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 pl-4"><CheckCircle2 className="w-4 h-4" /> Atleti e Soci Attivi ({filteredProfiles.filter(p => p.is_licensed || p.is_licensed_fci || p.is_member).length})</h3>
                        <div className="bg-white rounded-[3rem] shadow-sm border border-emerald-50 overflow-hidden overflow-x-auto">
                            <table className="w-full text-left border-collapse"><thead className="bg-emerald-50/50"><tr className="bg-emerald-50/50 text-[10px] font-black text-emerald-800 uppercase tracking-widest">
                                        <th className="px-4 py-5">Atleta / Team</th>
                                        <th className="px-4 py-5">Tessera</th>
                                        <th className="px-4 py-5">Certificato</th>
                                        <th className="px-4 py-5">Anno/Cat.</th>
                                        <th className="px-4 py-5">Status</th>
                                        <th className="px-4 py-5 text-right">Gare/Azioni</th>
                                    </tr></thead><tbody className="divide-y divide-emerald-50/30">{filteredProfiles.filter(p => p.is_licensed || p.is_licensed_fci || p.is_member).map(atleta => <AthleteRow key={atleta.id} atleta={atleta} />)}</tbody></table>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 pl-4"><X className="w-4 h-4" /> Altre Anagrafiche ({filteredProfiles.filter(p => !p.is_licensed && !p.is_licensed_fci && !p.is_member).length})</h3>
                        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden overflow-x-auto opacity-90 hover:opacity-100 transition-opacity">
                            <table className="w-full text-left border-collapse"><thead className="bg-slate-50"><tr className="text-[11px] font-black text-slate-600 uppercase tracking-widest"><th className="px-8 py-5">Atleta</th><th className="px-8 py-5">Team</th><th className="px-8 py-5">Tessera</th><th className="px-8 py-5">Anno</th><th className="px-8 py-5">Cat.</th><th className="px-8 py-5 text-center">Tesserato</th><th className="px-8 py-5 text-center">Socio</th><th className="px-8 py-5">Certificato</th><th className="px-8 py-5 text-center">Gare</th><th className="px-8 py-5 text-right">Azioni</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredProfiles.filter(p => !p.is_licensed && !p.is_licensed_fci && !p.is_member).map(atleta => <AthleteRow key={atleta.id} atleta={atleta} />)}</tbody></table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'stats' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4"><Users className="w-6 h-6" /></div>
                            <span className="text-3xl font-black text-slate-800">{stats.totalAthletes}</span>
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Atleti Totali</span>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4"><Trophy className="w-6 h-6" /></div>
                            <span className="text-3xl font-black text-slate-800">{stats.activeAthletes}</span>
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Atleti Attivi</span>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4"><Calendar className="w-6 h-6" /></div>
                            <span className="text-3xl font-black text-slate-800">{allPlans.length}</span>
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Iscrizioni 2026</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                            <h3 className="text-xl font-black text-slate-800 uppercase mb-6 flex items-center gap-3"><Trophy className="w-6 h-6 text-amber-500" /> Gare più Gettonate</h3>
                            <div className="space-y-4">
                                {stats.topRaces.map((race, idx) => (
                                    <div key={race.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                                        <div className="w-10 h-10 flex items-center justify-center font-black text-lg text-slate-300 group-hover:text-blue-500">{idx + 1}</div>
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-800 text-sm">{race.title}</div>
                                            <div className="text-[10px] font-black text-blue-600 uppercase">Gara ID: {race.id}</div>
                                        </div>
                                        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-center">
                                            <div className="text-lg font-black text-slate-800">{race.count}</div>
                                            <div className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Atleti</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                            <h3 className="text-xl font-black text-slate-800 uppercase mb-6 flex items-center gap-3"><Users className="w-6 h-6 text-blue-500" /> Categorie</h3>
                            <div className="space-y-4">
                                {Object.entries(stats.categoryDist).sort(([,a], [,b]) => b - a).map(([cat, count]) => {
                                    const percentage = Math.round((count / stats.totalAthletes) * 100);
                                    return (
                                        <div key={cat} className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500"><span>{cat}</span><span>{count} ({percentage}%)</span></div>
                                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${percentage}%` }}></div></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 lg:col-span-2">
                            <h3 className="text-xl font-black text-slate-800 uppercase mb-6 flex items-center gap-3"><Calendar className="w-6 h-6 text-purple-500" /> Attività Mensile</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                {['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'].map(month => {
                                    const count = stats.monthlyActivity[month] || 0;
                                    return (
                                        <div key={month} className={`p-4 rounded-[2rem] border text-center transition-all ${count > 0 ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{month.substring(0,3)}</div>
                                            <div className={`text-2xl font-black ${count > 0 ? 'text-purple-600' : 'text-slate-300'}`}>{count}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'social' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-wrap gap-3">
                            <div className="bg-white p-2 rounded-2xl border border-slate-100 flex items-center gap-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 pl-3">Mese:</label>
                                <select value={socialMonth} onChange={(e) => setSocialMonth(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 outline-none p-2 cursor-pointer">
                                    {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                                        <option key={m} value={m}>{new Date(2026, parseInt(m)-1, 1).toLocaleString('it-IT', { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                            {isSuperAdmin && (
                                <div className="bg-white p-2 rounded-2xl border border-slate-100 flex items-center gap-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 pl-3">Team:</label>
                                    <select value={selectedSocialTeam} onChange={(e) => setSelectedSocialTeam(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 outline-none p-2 cursor-pointer">
                                        <option value="">Auto (Rileva)</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={async () => {
                                if (socialCardRef.current) {
                                    const { toPng } = await import('html-to-image');
                                    const dataUrl = await toPng(socialCardRef.current, { backgroundColor: '#0f172a', width: 1080, height: 1350 });
                                    const link = document.createElement('a');
                                    link.download = `ranking-${socialMonth}-2026.png`; link.href = dataUrl; link.click();
                                }
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-purple-700"
                        >
                            <Download className="w-4 h-4" /> Scarica Immagine
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                            <h3 className="text-xl font-black text-slate-800 uppercase mb-6 flex items-center gap-3"><Trophy className="w-6 h-6 text-yellow-500" /> Ranking Atleti</h3>
                            <div className="space-y-4">
                                {socialData.topAtleti.length === 0 ? <div className="text-center py-10 text-slate-400 font-bold uppercase text-xs tracking-widest">Nessuna gara registrata</div> : 
                                socialData.topAtleti.map((item, idx) => (
                                    <div key={item.userId} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-white text-slate-500'}`}>{idx + 1}</div>
                                            <div><div className="font-bold text-slate-800">{item.profile?.full_name || 'Sconosciuto'}</div></div>
                                        </div>
                                        <div className="text-xl font-black text-slate-800">{item.count} <span className="text-[10px] font-bold text-slate-400 uppercase">Gare</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative overflow-hidden rounded-[2.5rem] border-4 border-slate-100 bg-slate-900 flex items-center justify-center p-4 min-h-[600px]">
                            <div className="w-full flex items-center justify-center" style={{ height: '550px' }}>
                                <div ref={socialCardRef} className="w-[1080px] h-[1350px] bg-slate-950 text-white relative flex flex-col items-center p-20 shrink-0" style={{ transform: 'scale(0.38)', transformOrigin: 'center center' }}>
                                    <div className="absolute top-0 right-0 w-[900px] h-[900px] bg-gradient-to-bl from-purple-500/30 to-transparent rounded-full blur-[120px] -mr-40 -mt-40"></div>
                                    <img src={socialData.displayTeam?.logo_url || "/Logo.png"} className="absolute top-20 right-20 w-48 opacity-10 grayscale brightness-200" alt="" />
                                    <div className="w-full text-center mb-20 relative z-10">
                                        <div className="inline-block px-12 py-6 bg-purple-600 rounded-full mb-8 shadow-2xl shadow-purple-900/50"><span className="text-4xl font-black uppercase tracking-[0.3em]">Athlete of the Month</span></div>
                                        <h1 className="text-[10rem] font-black uppercase tracking-tighter mb-4 leading-none text-white">{new Date(2026, parseInt(socialMonth)-1, 1).toLocaleString('it-IT', { month: 'long' })}</h1>
                                        <p className="text-5xl font-bold uppercase tracking-[0.6em] text-white/40">Ranking 2026</p>
                                    </div>
                                    <div className="w-full max-w-5xl space-y-10 relative z-10">
                                        {socialData.topAtleti.slice(0, 5).map((item, idx) => (
                                            <div key={item.userId} className="flex items-center justify-between p-10 bg-white/5 rounded-[4rem] border border-white/10 backdrop-blur-xl">
                                                <div className="flex items-center gap-12 text-white"><div className={`w-28 h-28 flex items-center justify-center rounded-[2.5rem] text-6xl font-black ${idx === 0 ? 'bg-yellow-400 text-yellow-950' : 'bg-white/10 text-white'}`}>{idx + 1}</div><div className="text-6xl font-black">{item.profile?.full_name}</div></div>
                                                <div className="flex flex-col items-center bg-white/10 px-10 py-6 rounded-[3rem] border border-white/5"><span className="text-6xl font-black text-purple-400">{item.count}</span><span className="text-xl font-black uppercase tracking-[0.2em] opacity-40">Gare</span></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-auto w-full flex items-center justify-between opacity-50 relative z-10">
                                        <div className="flex items-center gap-8"><img src={socialData.displayTeam?.logo_url || "/Logo.png"} className="w-24 h-24 object-contain grayscale brightness-200" alt="" /><div><div className="text-3xl font-black uppercase tracking-widest">{socialData.displayTeam?.name}</div><div className="text-2xl font-bold">raceplanner.saas</div></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center"><h3 className="text-xl font-black uppercase text-slate-800">Log Attività</h3><button onClick={() => fetchAllData(isSuperAdmin, myProfile?.team_id)}><RotateCw className="w-5 h-5 text-slate-400"/></button></div>
                    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-8 py-4">Data</th><th className="px-8 py-4">Admin</th><th className="px-8 py-4">Azione</th><th className="px-8 py-4 text-right">Dettagli</th></tr></thead><tbody className="divide-y divide-slate-50">{auditLogs.map(log => (<tr key={log.id} className="text-[11px]"><td className="px-8 py-4 font-bold">{new Date(log.created_at).toLocaleString('it-IT')}</td><td className="px-8 py-4 font-black">{log.profiles?.full_name || 'Sistema'}</td><td className="px-8 py-4"><span className="px-3 py-1 bg-slate-100 rounded-full">{log.action}</span></td><td className="px-8 py-4 text-slate-400 text-right truncate max-w-xs">{JSON.stringify(log.details)}</td></tr>))}</tbody></table></div>
                </div>
            )}

            {activeTab === 'team' && isSuperAdmin && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">     
                        <div className="relative group max-w-md w-full"><Trophy className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" /><input type="text" placeholder="Cerca team..." className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-500 outline-none text-sm font-medium shadow-sm transition-all placeholder:text-slate-400" value={teamSearchTerm} onChange={(e) => setTeamSearchTerm(e.target.value)} /></div>
                        <button onClick={() => { setEditingTeam(null); setTeamForm({ name: '', join_code: '', primary_color: '#3b82f6', secondary_color: '#1e293b', logo_url: '', website_url: '', telegram_chat_id: '', admin_telegram_chat_id: '', federation_code: '' }); setIsTeamModalOpen(true); }} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all shrink-0"><Plus className="w-4 h-4" /> Nuovo Team</button>
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
                                            <button onClick={() => handleCopyCode(team.join_code)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Copy className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3 mb-8 relative z-10">
                                    <div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-500 uppercase">Colors</span><div className="flex gap-1"><div className="w-6 h-6 rounded-lg border border-slate-200" style={{ backgroundColor: team.primary_color }}></div><div className="w-6 h-6 rounded-lg border border-slate-200" style={{ backgroundColor: team.secondary_color }}></div></div></div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-500 uppercase">Telegram Notifications</span>
                                        {team.telegram_chat_id ? (<span className="flex items-center gap-1 text-blue-600 font-black"><Camera className="w-3 h-3" /> Active</span>) : (<span className="text-slate-300 font-bold italic">Not set</span>)}
                                    </div>
                                    <div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-500 uppercase">Atleti</span><span className="font-black text-slate-800">{profiles.filter(p => p.team_id === team.id).length}</span></div>
                                </div>
                                <div className="flex items-center gap-2 mt-auto pt-6 border-t border-slate-50 relative z-10">
                                    <button onClick={() => { setEditingTeam(team); setTeamForm({ name: team.name, join_code: team.join_code || '', primary_color: team.primary_color || '#3b82f6', secondary_color: team.secondary_color || '#1e293b', logo_url: team.logo_url || '', website_url: team.website_url || '', telegram_chat_id: team.telegram_chat_id || '', admin_telegram_chat_id: team.admin_telegram_chat_id || '', federation_code: team.federation_code || '' }); setIsTeamModalOpen(true); }} className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-50 hover:text-blue-600 transition-all"><Edit2 className="w-3.5 h-3.5" /> Modifica</button>
                                    <button onClick={() => handleDeleteTeam(team.id, team.name)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"><Trash2 className="w-4 h-4" /></button>
                                    <a href={team.website_url} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all"><ExternalLink className="w-4 h-4" /></a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isTeamModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-start mb-8"><div className="bg-blue-50 p-4 rounded-3xl text-blue-600"><Trophy className="w-8 h-8" /></div><button onClick={() => setIsTeamModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-6 h-6 text-slate-400" /></button></div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase mb-6">{editingTeam ? 'Modifica Team' : 'Nuovo Team'}</h3>
                        <form onSubmit={handleSaveTeam} className="space-y-5">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Nome</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Codice Invito</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold uppercase" value={teamForm.join_code} onChange={e => setTeamForm({...teamForm, join_code: e.target.value})} required /></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Codice FITRI</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-bold uppercase" value={teamForm.federation_code} onChange={e => setTeamForm({...teamForm, federation_code: e.target.value})} placeholder="Es: 2566" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Colore Primario</label><input type="color" className="w-full h-12 rounded-xl cursor-pointer" value={teamForm.primary_color} onChange={e => setTeamForm({...teamForm, primary_color: e.target.value})} /></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Colore Secondario</label><input type="color" className="w-full h-12 rounded-xl cursor-pointer" value={teamForm.secondary_color} onChange={e => setTeamForm({...teamForm, secondary_color: e.target.value})} /></div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Logo</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                        {teamForm.logo_url ? <img src={teamForm.logo_url} alt="Preview" className="max-w-full max-h-full object-contain" /> : <Upload className="w-6 h-6 text-slate-300" />}
                                    </div>
                                    <div className="flex-1">
                                        <input type="file" accept="image/*" id="logo-upload" className="hidden" onChange={handleUploadLogo} disabled={uploading} />
                                        <label htmlFor="logo-upload" className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${uploading ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                                            {uploading ? 'Caricamento...' : 'Scegli File'}
                                        </label>
                                    </div>
                                </div>
                                <input type="text" className="w-full mt-3 px-5 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-[10px] font-medium" value={teamForm.logo_url} onChange={e => setTeamForm({...teamForm, logo_url: e.target.value})} placeholder="O inserisci URL logo..." />
                            </div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Telegram Chat ID (Notifiche)</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl outline-none text-xs" value={teamForm.telegram_chat_id} onChange={e => setTeamForm({...teamForm, telegram_chat_id: e.target.value})} /></div>
                            <button type="submit" className="w-full mt-6 py-4 bg-slate-900 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Salva</button>
                        </form>
                    </div>
                </div>
            )}

            {isAthleteModalOpen && (
                <AthleteModal 
                    onClose={() => setIsAthleteModalOpen(false)}
                    editingAthlete={editingAthlete}
                    athleteForm={athleteForm}
                    setAthleteForm={setAthleteForm}
                    handleSaveAthlete={handleSaveAthlete}
                    teams={teams}
                    isSuperAdmin={isSuperAdmin}
                />
            )}
        </div>
    );
};

export default AdminPage;
