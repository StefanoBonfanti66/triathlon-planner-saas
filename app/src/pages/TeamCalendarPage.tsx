/**
 * Race Planner 2026 - Team Calendar
 * Author: Stefano Bonfanti
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Calendar, Users, Plus, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import racesData from "../races_full.json";

interface TeamRace {
  race_id: string;
  race_title: string;
  race_date: string;
  race_link?: string;
  participants: string[];
}

interface TeamMonth {
  month_key: string;
  races: TeamRace[];
}

const TeamCalendarPage: React.FC = () => {
  const [teamCalendar, setTeamCalendar] = useState<TeamMonth[]>([]);
  const [userRaces, setUserRaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);

  const fetchTeamData = async (userId: string) => {
    const { data: profile } = await supabase.from('profiles').select('team_id').eq('id', userId).single();
    if (profile?.team_id) {
      const { data: teamData } = await supabase.from('teams').select('*').eq('id', profile.team_id).single();
      setTeam(teamData);
      return profile.team_id;
    }
    return null;
  };

  const fetchTeamCalendarDirect = async (teamId: string) => {
    try {
      console.log("Fetching team plans for team:", teamId);
      
      // 1. Prendi tutti i profili del team
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').eq('team_id', teamId).is('deleted_at', null);
      if (!profiles) return;

      const profileMap: Record<string, string> = {};
      profiles.forEach(p => { profileMap[p.id] = p.full_name; });
      const userIds = profiles.map(p => p.id);

      // 2. Prendi tutti i piani di questi utenti
      const { data: plans } = await supabase.from('user_plans').select('race_id, user_id').in('user_id', userIds).is('deleted_at', null);      if (!plans) return;

      // 3. Raggruppa per gara e aggiungi info gara dal JSON locale (più veloce)
      const raceGroups: Record<string, TeamRace> = {};
      
      plans.forEach(plan => {
        if (!raceGroups[plan.race_id]) {
          const baseRace = (racesData as any[]).find(r => r.id === plan.race_id);
          if (baseRace) {
            raceGroups[plan.race_id] = {
              race_id: plan.race_id,
              race_title: baseRace.title,
              race_date: baseRace.date,
              race_link: baseRace.link,
              participants: []
            };
          }
        }
        if (raceGroups[plan.race_id] && profileMap[plan.user_id]) {
          raceGroups[plan.race_id].participants.push(profileMap[plan.user_id]);
        }
      });

      // 4. Raggruppa per mese
      const months: Record<string, TeamRace[]> = {};
      Object.values(raceGroups).forEach(race => {
        const [d, m, y] = race.race_date.split("-");
        const monthKey = `${y}-${m}`;
        if (!months[monthKey]) months[monthKey] = [];
        months[monthKey].push(race);
      });

      const formattedCalendar = Object.keys(months).sort().map(key => ({
        month_key: key,
        races: months[key].sort((a,b) => a.race_date.split("-").reverse().join("-").localeCompare(b.race_date.split("-").reverse().join("-")))
      }));

      setTeamCalendar(formattedCalendar);
    } catch (err) {
      console.error("Errore caricamento diretto calendario:", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user) {
        const teamId = await fetchTeamData(session.user.id);
        await fetchUserRaces(session.user.id);
        if (teamId) {
          await fetchTeamCalendarDirect(teamId);
        }
      }
      setLoading(false);
    };

    init();
  }, []);

  const fetchUserRaces = async (userId: string) => {
    const { data } = await supabase.from('user_plans').select('race_id').eq('user_id', userId);
    if (data) setUserRaces(data.map(r => r.race_id));
  };

  const handleJoinRace = async (raceId: string) => {
    if (!session?.user || !team?.id) return;

    const { error } = await supabase
      .from('user_plans')
      .insert([{ user_id: session.user.id, race_id: raceId, priority: 'C' }]);

    if (error) {
      alert("Errore durante l'iscrizione.");
    } else {
      setUserRaces(prev => [...prev, raceId]);
      fetchTeamCalendarDirect(team.id);
    }
  };

  const getMonthName = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('it-IT', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return <div className="text-center p-10 font-bold text-slate-500">Caricamento calendario team...</div>;
  }

  if (!team && !loading) {
    return (
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
            <div className="bg-amber-50 border border-amber-200 p-8 rounded-[2.5rem] inline-block shadow-sm">
                <Users className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-black text-slate-800 uppercase mb-2">Team non ancora assegnato</h2>
                <p className="text-slate-600 font-bold text-sm max-w-sm">
                    Il tuo profilo non è ancora collegato a un team. 
                    Contatta il tuo amministratore per essere inserito nella tua squadra e vedere i piani dei tuoi compagni.
                </p>
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-10">
        <div className="p-4 rounded-3xl text-white shadow-lg" style={{ backgroundColor: team?.primary_color || '#3b82f6' }}>
          <Users className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Calendario {team?.name || 'Team'}</h1>
          <p className="text-slate-600 font-bold text-sm">Le gare pianificate da tutti gli atleti {team?.name || 'del team'}.</p>
        </div>
      </div>

      <div className="space-y-12">
        {teamCalendar.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center shadow-sm">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight mb-2">Ancora nessuna gara pianificata</h3>
            <p className="text-slate-500 font-bold text-sm max-w-xs mx-auto">
              Sii il primo del tuo team a pianificare una gara per farla apparire nel calendario di squadra!
            </p>
          </div>
        ) : (
          teamCalendar.map((month) => (
            <div key={month.month_key}>
              <h2 className="text-xl font-black text-red-600 uppercase tracking-widest mb-6 pb-3 border-b-2 border-red-100 flex items-center gap-3">
                <Calendar className="w-5 h-5" />
                {getMonthName(month.month_key)}
              </h2>
              <div className="space-y-6">
                {month.races.map((race) => (
                  <div key={race.race_id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-100 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <Link to={`/race/${race.race_id}`} className="hover:text-blue-600 transition-colors">
                          <h3 className="font-black text-slate-800 text-lg leading-tight mb-1">{race.race_title}</h3>
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                            {race.race_date}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {race.race_link && (
                          <a 
                            href={race.race_link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-1.5 text-[10px] font-black text-slate-600 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-200 transition-all uppercase tracking-widest"
                            title="Vedi dettagli ufficiali su MyFITri"
                          >
                            <ExternalLink className="w-3 h-3" /> <span className="hidden xs:inline">Scheda</span>
                          </a>
                        )}
                        {userRaces.includes(race.race_id) ? (
                          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 uppercase tracking-widest">
                            <Check className="w-3 h-3" /> Iscritto
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleJoinRace(race.race_id)}
                            className="flex items-center gap-1.5 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-md hover:shadow-blue-200 transition-all uppercase tracking-widest"
                          >
                            <Plus className="w-3 h-3" /> Partecipa
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                      <User className="w-4 h-4 text-slate-500" />
                      <div className="flex flex-wrap gap-2">
                        {race.participants.map((name, i) => (
                          <span key={i} className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TeamCalendarPage;
