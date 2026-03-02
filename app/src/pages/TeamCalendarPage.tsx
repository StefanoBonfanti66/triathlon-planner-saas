/**
 * MTT Season Planner 2026 - Team Calendar
 * Author: Stefano Bonfanti
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Calendar, Users, Plus, Check, ExternalLink } from 'lucide-react';

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

  const fetchTeamCalendar = async (teamId: string) => {
    console.log("Fetching calendar for team:", teamId);
    const { data, error } = await supabase.rpc('get_team_calendar', { p_team_id: teamId });
    
    if (error) {
      console.error("Errore RPC get_team_calendar:", error);
      // Prova fallback senza parametro se il primo fallisce (vecchia versione MTT)
      const { data: fallbackData } = await supabase.rpc('get_team_calendar');
      if (fallbackData) setTeamCalendar(fallbackData);
    } else {
      console.log("Calendar data received:", data);
      setTeamCalendar(data || []);
    }
  };

  const fetchUserRaces = async (userId: string) => {
    const { data } = await supabase.from('user_plans').select('race_id').eq('user_id', userId);
    if (data) setUserRaces(data.map(r => r.race_id));
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user) {
        const teamId = await fetchTeamData(session.user.id);
        await fetchUserRaces(session.user.id);
        if (teamId) {
          await fetchTeamCalendar(teamId);
        }
      }
      setLoading(false);
    };

    init();
  }, []);

  const handleJoinRace = async (raceId: string) => {
    if (!session?.user || !team?.id) return;

    const { error } = await supabase
      .from('user_plans')
      .insert([{ user_id: session.user.id, race_id: raceId, priority: 'C' }]);

    if (error) {
      alert("Errore durante l'iscrizione.");
    } else {
      setUserRaces(prev => [...prev, raceId]);
      fetchTeamCalendar(team.id);
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
        {teamCalendar.map((month) => (
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
                      <h3 className="font-black text-slate-800 text-lg leading-tight mb-1">{race.race_title}</h3>
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
        ))}
      </div>
    </div>
  );
};

export default TeamCalendarPage;
