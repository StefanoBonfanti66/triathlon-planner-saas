/**
 * Race Planner 2026 - Race Details
 * Author: Stefano Bonfanti
 * Feature: MyFITri API Integration (V4.0)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import racesData from "../races_full.json";
import { 
  Calendar, MapPin, Bike, Trophy, Info, ExternalLink, 
  ChevronLeft, Users, Clock, FileText, Share2, Star,
  Wind, Thermometer, CloudRain
} from 'lucide-react';
import { getWeatherData } from "../weatherData";

interface Race {
  id: string;
  date: string;
  title: string;
  event?: string;
  location: string;
  region: string;
  type: string;
  distance: string;
  rank: string;
  category: string;
  link?: string;
}

const RaceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [race, setRace] = useState<Race | null>(null);
  const [apiData, setApiData] = useState<any>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      // 1. Dati base dal JSON locale
      const baseRace = (racesData as Race[]).find(r => r.id === id);
      if (baseRace) setRace(baseRace);

      try {
        // 2. Dati arricchiti dall'API MyFITri
        const response = await fetch(`https://cms.myfitri.it/api/eventi/${id}`);
        if (response.ok) {
          const data = await response.json();
          setApiData(data);
        }
      } catch (err) {
        console.warn("API MyFITri non disponibile o ID non trovato.");
      }

      // 3. Partecipanti del team (multi-tenancy)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('team_id').eq('id', session.user.id).single();
        if (profile?.team_id) {
          const { data: teamData } = await supabase.from('teams').select('*').eq('id', profile.team_id).single();
          setTeam(teamData);

          const { data: teamPlans } = await supabase
            .from('user_plans')
            .select('user_id, profiles(full_name, deleted_at)')
            .eq('race_id', id)
            .is('deleted_at', null);
          
          if (teamPlans) {
            // Filtriamo i partecipanti che appartengono allo stesso team e non sono cancellati
            const members = teamPlans
              .filter((p: any) => p.profiles?.full_name && !p.profiles.deleted_at)
              .map((p: any) => p.profiles.full_name);
            setParticipants(members);
          }
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  const weather = useMemo(() => {
    if (!race) return null;
    return getWeatherData(race.region, race.date);
  }, [race]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase text-slate-500">Caricamento dettagli...</div>;
  if (!race) return <div className="p-20 text-center font-black uppercase">Gara non trovata</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 hover:text-blue-600 mb-8 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Torna al Calendario
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLONNA SINISTRA: INFO BASE */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Trophy className="w-48 h-48 text-slate-900" />
            </div>
            
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className={`text-[10px] font-black uppercase px-4 py-2 rounded-2xl tracking-widest ${race.type === 'Triathlon' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                  {race.type}
                </span>
                <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-2xl text-[10px] font-black uppercase text-slate-600">
                  <Calendar className="w-3.5 h-3.5" /> {race.date}
                </div>
                {race.rank && (
                   <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100 px-4 py-2 rounded-2xl text-[10px] font-black uppercase">
                     <Star className="w-3 h-3 fill-current" /> {race.rank}
                   </div>
                )}
              </div>

              <h1 className="text-4xl font-black text-slate-800 leading-tight mb-4 uppercase tracking-tight">{race.title}</h1>
              {race.event && <p className="text-lg font-bold text-slate-500 mb-8 leading-snug">{race.event}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="bg-white p-3 rounded-2xl shadow-sm text-blue-600"><MapPin className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Località</span>
                    <p className="font-bold text-slate-700">{race.location}</p>
                    <p className="text-[10px] font-black text-blue-600 uppercase mt-0.5">{race.region}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="bg-white p-3 rounded-2xl shadow-sm text-emerald-600"><Bike className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Distanza</span>
                    <p className="font-bold text-slate-700">{race.distance || "Vedi Regolamento"}</p>
                    <p className="text-[10px] font-black text-emerald-600 uppercase mt-0.5">{race.category}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DATI API MYFITRI (Se presenti) */}
          {apiData && (
            <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
               <div className="absolute bottom-0 right-0 p-4 opacity-10">
                 <Info className="w-64 h-64" />
               </div>
               <div className="relative z-10">
                  <h3 className="text-xl font-black uppercase mb-8 flex items-center gap-3">
                    <Info className="w-6 h-6 text-blue-400" /> Dettagli Tecnici MyFITri
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <Clock className="w-5 h-5 text-slate-400" />
                        <div>
                          <span className="text-[10px] font-black text-slate-500 uppercase block">Orario Partenza</span>
                          <p className="font-black text-lg">{apiData.ora_partenza || "--:--"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <div>
                          <span className="text-[10px] font-black text-slate-500 uppercase block">Regolamento</span>
                          <a href={apiData.link_regolamento || "#"} target="_blank" className="text-blue-400 font-bold hover:underline">Scarica PDF</a>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4">Percorsi</h4>
                      <p className="text-sm font-medium leading-relaxed opacity-80">
                        {apiData.descrizione_percorsi || "Dettagli percorsi in fase di definizione. Consulta il regolamento ufficiale."}
                      </p>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* COLONNA DESTRA: METEO E TEAM */}
        <div className="space-y-8">
           {/* BOX METEO */}
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
               <CloudRain className="w-4 h-4 text-blue-500" /> Meteo Storico
             </h3>
             {weather && (
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="bg-orange-50 p-4 rounded-3xl">
                     <Thermometer className="w-8 h-8 text-orange-500" />
                   </div>
                   <div>
                     <p className="text-3xl font-black text-slate-800 tabular-nums">{weather.temp}°C</p>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temperatura Media</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="text-xl font-black text-blue-600 tabular-nums">{weather.rain}%</p>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prob. Pioggia</p>
                 </div>
               </div>
             )}
           </div>

           {/* BOX COMPAGNI DI TEAM */}
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
               <Users className="w-4 h-4" style={{ color: team?.primary_color || '#ef4444' }} /> Compagni {team?.name || 'Team'}
             </h3>
             {participants.length > 0 ? (
               <div className="space-y-3">
                 <p className="text-xs font-bold text-slate-500 mb-4">Ci sono <span className="text-blue-600 font-black">{participants.length}</span> atleti iscritti a questa gara.</p>
                 <div className="flex flex-wrap gap-2">
                   {participants.map((p, i) => (
                     <span key={i} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700">
                       {p}
                     </span>
                   ))}
                 </div>
               </div>
             ) : (
               <p className="text-xs font-bold text-slate-400 italic">Nessun compagno di team ancora iscritto.</p>
             )}
             
             <button className="w-full mt-8 py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:brightness-110 transition-all" style={{ backgroundColor: team?.primary_color || '#2563eb' }}>
                Aggiungi alla mia stagione
             </button>
           </div>

           {/* AZIONI ESTERNE */}
           <div className="flex flex-col gap-3">
             <a href={race.link} target="_blank" className="flex items-center justify-center gap-2 w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all">
                <ExternalLink className="w-4 h-4" /> Scheda Ufficiale MyFITri
             </a>
             <button className="flex items-center justify-center gap-2 w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                <Share2 className="w-4 h-4" /> Condividi Gara
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default RaceDetailPage;
