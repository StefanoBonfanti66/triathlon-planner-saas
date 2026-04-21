/**
 * Race Planner 2026 - Race Details
 * Author: Stefano Bonfanti
 * Feature: MyFITri API Integration (V4.0) - Reverted Stable
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
import { provinceCoordinates } from "../coords";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../map.css';

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
  const [isRegistered, setIsRegistered] = useState(false);
  const [team, setTeam] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [apiCoords, setApiCoords] = useState<[number, number] | null>(null);

  const ADMIN_EMAIL = "bonfantistefano4@gmail.com";

  const mapCoords = useMemo(() => {
    if (apiCoords) return apiCoords;
    if (!race) return null;
    
    const cityMatch = race.location.match(/^(.*?)\s*\(/);
    const cityName = cityMatch ? cityMatch[1].trim() : race.location.trim();
    if (provinceCoordinates[cityName]) return provinceCoordinates[cityName] as [number, number];

    const provinceMatch = race.location.match(/\((.*?)\)/);
    const provinceName = provinceMatch ? provinceMatch[1].trim() : null;
    if (provinceName && provinceCoordinates[provinceName]) return provinceCoordinates[provinceName] as [number, number];

    return null;
  }, [race, apiCoords]);

  // Nuovo: Ricerca dinamica coordinate se mancano quelle precise
  useEffect(() => {
    if (race && !apiCoords) {
      const cityMatch = race.location.match(/^(.*?)\s*\(/);
      const cityName = cityMatch ? cityMatch[1].trim() : race.location.trim();
      
      // Se non abbiamo una coordinata specifica per la città, proviamo a cercarla online
      if (!provinceCoordinates[cityName]) {
        const provinceMatch = race.location.match(/\((.*?)\)/);
        const provinceName = provinceMatch ? provinceMatch[1].trim() : "";
        const searchQuery = `${cityName}, ${provinceName}, Italy`;

        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`)
          .then(res => res.json())
          .then(data => {
            if (data && data.length > 0) {
              setApiCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
              console.log(`🌍 Geocoding dinamico per ${cityName}: successo!`);
            }
          })
          .catch(err => console.warn("Geocoding non disponibile:", err));
      }
    }
  }, [race, apiCoords]);

  const raceIcon = useMemo(() => {
    if (!race) return null;
    const color = race.type === 'Triathlon' ? '#3b82f6' : race.type === 'Duathlon' ? '#f97316' : '#10b981';
    return L.divIcon({ 
      className: 'custom-div-icon', 
      html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>`, 
      iconSize: [24, 24], 
      iconAnchor: [12, 12]
    });
  }, [race]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (!id) { setLoading(false); return; }

      const updateApiData = (data: any) => {
        if (!data) return;
        
        // Estrazione intelligente del link regolamento (Strapi v4/v5)
        let regLink = data.regolamento || data.link_regolamento;
        if (typeof regLink === 'object' && regLink !== null) {
          regLink = regLink.url || (regLink.data?.attributes?.url) || (regLink.data?.url);
        }
        
        // Se il link è relativo (inizia con /), aggiungi il dominio del CMS
        if (regLink && regLink.startsWith('/')) {
          regLink = `https://cms.myfitri.it${regLink}`;
        }
  
        // Fallback alla pagina evento ufficiale se il PDF manca
        if (!regLink || regLink === "#") {
          regLink = `https://www.myfitri.it/evento/${data.id_evento || id.split('-')[0]}`;
        }
        
        const enrichedData = {
          ora_partenza: data.ora_partenza || data.oraPartenza || "--:--",
          link_regolamento: regLink,
          descrizione_percorsi: data.percorsi || data.descrizione_percorsi || "Vedi regolamento.",
          note_organizzatore: data.note || data.note_organizzatore || "",
          programma: data.programma || data.programma_gara || "",
          iscrizioni_chiusura: data.chiusura_iscrizioni || data.data_chiusura_iscrizioni || "",
          organizzatore: data.organizzatore || data.societa || "",
          lat: data.latitudine || data.lat || null,
          lng: data.longitudine || data.lng || null
        };
  
        if (enrichedData.lat && enrichedData.lng) {
          setApiCoords([parseFloat(enrichedData.lat), parseFloat(enrichedData.lng)]);
        }
        setApiData(enrichedData);
      };
      
      const baseRace = (racesData as Race[]).find(r => r.id === id);
      
      // Carica i dati base dal JSON o dal DB se mancano
      try {
        const { data: dbRace } = await supabase.from('races').select('*').eq('id', id).single();
        
        if (dbRace) {
          // Unisce i dati: prevale il DB per lo status e i campi dinamici
          setRace({ ...(baseRace || {}), ...dbRace } as Race);
          if (!baseRace) console.log("ℹ️ Gara recuperata interamente dal database.");
        } else if (baseRace) {
          setRace(baseRace);
        }
      } catch (err) {
        if (baseRace) setRace(baseRace);
        console.warn("Impossibile sincronizzare lo status dal database, uso dati locali.");
      }

      let foundApiData = false;

      // Tentativo 1: ID Evento FITRI (es. 3897)
      try {
        const baseId = id.split('-')[0];
        const response = await fetch(`https://cms.myfitri.it/api/eventi?populate=*&filters[id_evento]=${baseId}`);
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.data && resJson.data.length > 0) {
            updateApiData(resJson.data[0]);
            foundApiData = true;
            console.log("✅ Dati trovati con ID evento.");
          }
        }
      } catch (err) { /* Ignored */ }

      // Tentativo 2 (Fallback): Ricerca per nome città
      if (!foundApiData && baseRace) {
        try {
          console.log("🔍 Fallback: ricerca per nome città (2026)...");
          const cityName = baseRace.location.split('(')[0].trim().toLowerCase();
          const listRes = await fetch(`https://cms.myfitri.it/api/eventi?populate=*&filters[dataInizio][$containsi]=2026&filters[comune][$containsi]=${cityName}`);
          
          if (listRes.ok) {
            const listJson = await listRes.json();
            if (listJson.data && listJson.data.length > 0) {
              updateApiData(listJson.data[0]);
              foundApiData = true;
              console.log("✅ Gara trovata con fallback città!");
            }
          }
        } catch(err) { console.warn("Fallback API non riuscito."); }
      }

      // Supabase Data
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          setMyProfile(profile);
          if (profile?.team_id) {
            const { data: teamData } = await supabase.from('teams').select('*').eq('id', profile.team_id).single();
            setTeam(teamData);
            const { data: teamPlans } = await supabase.from('user_plans').select('user_id, profiles(full_name, deleted_at)').eq('race_id', id).is('deleted_at', null);
            if (teamPlans) {
              const getSortableName = (name: string) => {
                const parts = name.trim().split(/\s+/);
                if (parts.length <= 1) return name.toLowerCase();
                const surname = parts.pop()?.toLowerCase() || '';
                const rest = parts.join(' ').toLowerCase();
                return `${surname} ${rest}`;
              };

              const formatDisplayName = (name: string) => {
                const parts = name.trim().split(/\s+/);
                if (parts.length <= 1) return name;
                const surname = parts.pop()?.toUpperCase() || '';
                const rest = parts.join(' ');
                return `${surname} ${rest}`;
              };

              const members = teamPlans
                .filter((p: any) => p.profiles?.full_name && !p.profiles.deleted_at)
                .map((p: any) => formatDisplayName(p.profiles.full_name))
                .sort((a, b) => getSortableName(a).localeCompare(getSortableName(b)));
              
              setParticipants(members);
              setIsRegistered(teamPlans.some((p: any) => p.user_id === session.user.id));
            }
          }
        }
      } catch (sbErr) { console.error(sbErr); }
      
      setLoading(false);
    };

    fetchData();
  }, [id]);

  const logAdminAction = async (userId: string, teamId: string, action: string, details: any = {}) => {
    await supabase.from('audit_logs').insert({ admin_id: userId, team_id: teamId, action, details });
  };
  
  const handleAddToSeason = async () => {
    if (!id) return;
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession?.user) { navigate('/login'); return; }
    try {
      await supabase.from('user_plans').insert({ user_id: authSession.user.id, race_id: id, team_id: team?.id || 'mtt', priority: 'C' });
      setIsRegistered(true);
      const { data: latestProfile } = await supabase.from('profiles').select('*').eq('id', authSession.user.id).single();
      if ((authSession.user.email === ADMIN_EMAIL || latestProfile?.is_team_admin) && latestProfile?.team_id) {
          await logAdminAction(authSession.user.id, latestProfile.team_id, 'ADMIN_ADD_RACE', { race_title: race?.title, admin_name: latestProfile?.full_name });
      }
      if (latestProfile?.full_name) setParticipants(prev => [...prev, latestProfile.full_name]);
      alert("Gara aggiunta! 🚀");
    } catch (err: any) { alert("Errore: " + err.message); }
  };

  const handleShare = async () => {
    const shareData = { title: `Race Planner 2026: ${race?.title}`, text: `Guarda i dettagli per ${race?.title} su Race Planner!`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(window.location.href); alert("Link copiato! 📋"); }
    } catch (err) { console.error(err); }
  };
  
  const weather = useMemo(() => race ? getWeatherData(race.region, race.date) : null, [race]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase text-slate-500">Caricamento...</div>;
  if (!race) return <div className="p-20 text-center font-black">Gara non trovata</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-blue-600 mb-8 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Torna al Calendario
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Allerta Gara Rimossa */}
          {(race as any).status === 'hidden' && (
            <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2.5rem] flex items-start gap-4 mb-2">
              <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-amber-800 font-black uppercase text-sm mb-1">Gara non più ufficiale</h4>
                <p className="text-amber-700 text-xs font-medium">Questa gara non è più presente nel calendario ufficiale FITRI. Potrebbe essere stata annullata o spostata. Verifica con l'organizzatore prima di pianificare trasferte.</p>
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Trophy className="w-48 h-48 text-slate-900" /></div>
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className={`text-[10px] font-black uppercase px-4 py-2 rounded-2xl tracking-widest ${race.type === 'Triathlon' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{race.type}</span>
                <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-2xl text-[10px] font-black uppercase text-slate-600"><Calendar className="w-3.5 h-3.5" /> {race.date}</div>
              </div>
              <h1 className="text-4xl font-black text-slate-800 leading-tight mb-4 uppercase tracking-tight">{race.title}</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="bg-white p-3 rounded-2xl shadow-sm text-blue-600"><MapPin className="w-5 h-5" /></div>
                  <div><span className="text-[10px] font-black text-slate-400 uppercase">Località</span><p className="font-bold text-slate-700">{race.location}</p></div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="bg-white p-3 rounded-2xl shadow-sm text-emerald-600"><Bike className="w-5 h-5" /></div>
                  <div><span className="text-[10px] font-black text-slate-400 uppercase">Distanza</span><p className="font-bold text-slate-700">{race.distance || "Regolamento"}</p></div>
                </div>
              </div>
            </div>
          </div>

          {mapCoords && (
            <div className="h-[400px] w-full rounded-[3rem] overflow-hidden border-4 border-white shadow-xl isolate bg-slate-100">
              <MapContainer center={mapCoords} zoom={13} className="h-full w-full outline-none" scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={mapCoords} icon={raceIcon!}><Popup><div className="p-2 font-bold">{race.title}</div></Popup></Marker>
              </MapContainer>
            </div>
          )}

          {apiData && (
            <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black uppercase flex items-center gap-3"><Info className="w-6 h-6 text-blue-400" /> MyFITri Info</h3>
                    {apiData.organizzatore && (
                      <span className="text-[10px] font-black text-slate-500 uppercase border border-slate-700 px-3 py-1 rounded-lg">Org: {apiData.organizzatore}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="flex items-center gap-4"><Clock className="w-5 h-5 text-slate-400" /><div><span className="text-[10px] font-black text-slate-500 uppercase block">Partenza Gara</span><p className="font-black text-lg">{apiData.ora_partenza || "--:--"}</p></div></div>
                      <div className="flex items-center gap-4"><FileText className="w-5 h-5 text-slate-400" /><div><span className="text-[10px] font-black text-slate-500 uppercase block">Regolamento</span><a href={apiData.link_regolamento || "#"} target="_blank" className="text-blue-400 font-bold hover:underline">Scarica PDF</a></div></div>
                      {apiData.iscrizioni_chiusura && (
                        <div className="flex items-center gap-4"><Star className="w-5 h-5 text-amber-400" /><div><span className="text-[10px] font-black text-slate-500 uppercase block">Chiusura Iscrizioni</span><p className="font-bold">{apiData.iscrizioni_chiusura}</p></div></div>
                      )}
                    </div>
                    <div className="space-y-6">
                      <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4">Percorsi</h4>
                        <p className="text-sm font-medium leading-relaxed opacity-80">{apiData.descrizione_percorsi || "Vedi regolamento."}</p>
                      </div>
                    </div>
                  </div>
                  {apiData.programma && (
                    <div className="mt-12 pt-12 border-t border-white/10">
                      <h4 className="text-[10px] font-black text-blue-400 uppercase mb-6 tracking-widest flex items-center gap-2"><Clock className="w-4 h-4" /> Programma Completo</h4>
                      <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5">
                        <div className="prose prose-invert prose-sm max-w-none">
                          <p className="text-sm leading-relaxed opacity-70 whitespace-pre-line">{apiData.programma}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {apiData.note_organizzatore && (
                    <div className="mt-8 bg-blue-500/10 p-6 rounded-[2.5rem] border border-blue-500/20">
                      <h4 className="text-[10px] font-black text-blue-400 uppercase mb-4">Note Organizzatore</h4>
                      <p className="text-xs font-medium leading-relaxed opacity-80 italic">"{apiData.note_organizzatore}"</p>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><CloudRain className="w-4 h-4 text-blue-500" /> Meteo Storico</h3>
             {weather && (
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4"><div className="bg-orange-50 p-4 rounded-3xl"><Thermometer className="w-8 h-8 text-orange-500" /></div><div><p className="text-3xl font-black text-slate-800">{weather.temp}°C</p><p className="text-[10px] font-black text-slate-400 uppercase">Temp. Media</p></div></div>
                 <div className="text-right"><p className="text-xl font-black text-blue-600">{weather.rain}%</p><p className="text-[10px] font-black text-slate-400 uppercase">Pioggia</p></div>
               </div>
             )}
           </div>
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Users className="w-4 h-4" style={{ color: team?.primary_color || '#ef4444' }} /> Compagni {team?.name || 'Team'}</h3>
             {participants.length > 0 ? (
               <div className="flex flex-wrap gap-2">{participants.map((p, i) => (<span key={i} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700">{p}</span>))}</div>
             ) : (<p className="text-xs font-bold text-slate-400 italic">Nessuno iscritto.</p>)}
             <button onClick={handleAddToSeason} disabled={isRegistered} className={`w-full mt-8 py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${isRegistered ? 'bg-emerald-500 opacity-50 cursor-not-allowed' : 'hover:brightness-110'}`} style={{ backgroundColor: !isRegistered ? (team?.primary_color || '#2563eb') : undefined }}>{isRegistered ? 'Gara in calendario' : 'Aggiungi alla mia stagione'}</button>
           </div>
           <div className="flex flex-col gap-3">
             <a href={race.link} target="_blank" className="flex items-center justify-center gap-2 w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all"><ExternalLink className="w-4 h-4" /> Scheda MyFITri</a>
             <button onClick={handleShare} className="flex items-center justify-center gap-2 w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"><Share2 className="w-4 h-4" /> Condividi</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default RaceDetailPage;
