/**
 * MTT Season Planner 2026
 * Author: Stefano Bonfanti
 * Project: FITRI Race Calendar Management for MTT Milano Triathlon Team
 */
import React, { useState, useEffect, useMemo, useTransition, useCallback, useDeferredValue } from "react";
import { 
  Search, Plus, Calendar, MapPin, Trash2, CheckCircle, Trophy, Filter, 
  Info, Download, Upload, Bike, Map as MapIcon, ChevronRight, Star, ExternalLink, Activity, Navigation, List, AlertTriangle, X, Camera, Image, ShoppingBag, Cloud, Sun, Edit3, MapPin as MapPinIcon,
  LogOut, Mail, Lock, User, Shield, Heart
} from "lucide-react";
import { toPng } from 'html-to-image';
import racesData from "../races_full.json";
import { provinceCoordinates } from "../coords";
import { getWeatherData } from "../weatherData";
import { supabase } from "../supabaseClient";
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
  mapCoords?: [number, number];
  distanceFromHome?: number | null;
}

const getEquipment = (type: string) => {
    const base = ["Chip", "Body MTT", "Pettorale", "Gel", "Documento", "Tessera"];
    if (type === 'Triathlon') return [...base, "Muta", "Occhialini", "Scarpe Bici", "Casco", "Scarpe Corsa"];
    if (type === 'Duathlon') return [...base, "Scarpe Bici", "Casco", "Scarpe Corsa"];
    if (type.includes('Winter')) return [...base, "Termica", "Guanti", "Scarpe/Sci"];
    if (type === 'Cross') return [...base, "MTB", "Casco", "Scarpe Trail"];
    return base;
};

const getRankColor = (rank: string) => {
  if (rank === 'Gold') return 'text-amber-700 bg-amber-50 border-amber-200';
  if (rank === 'Silver') return 'text-slate-600 bg-slate-50 border-slate-200';
  return 'text-orange-800 bg-orange-50 border-orange-200';
};

const RaceCard = React.memo(({ 
    race, isSelected, priority, cost, note, participants, onToggle, onPriority, onCost, onSingleCard, onChecklist, onNote 
}: { 
    race: Race, isSelected: boolean, priority: string, cost: number, note: string, participants: string[], onToggle: (id: string) => void, onPriority: (id: string, p: string) => void, onCost: (id: string, c: number) => void, onSingleCard: (race: Race) => void, onChecklist: (race: Race) => void, onNote: (race: Race) => void, getRankColor?: (r: string) => string
}) => {
    const openInMaps = (e: React.MouseEvent) => {
        e.stopPropagation();
        const query = `${race.location}, Italy`;
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
    };

    return (
        <div className={`group bg-white p-6 rounded-[2.5rem] border-2 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 flex flex-col ${isSelected ? 'border-blue-500 ring-4 ring-blue-50 shadow-lg shadow-blue-100/50' : 'border-white hover:border-blue-100 shadow-sm'} ${priority === 'A' ? 'bg-yellow-50/20 border-yellow-100' : ''}`}>
            <div className="flex justify-between items-start mb-5">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full w-fit" title="Data dell'evento">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[11px] font-black text-slate-700">{race.date}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {race.rank && <div className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-lg border-2 ${getRankColor(race.rank)}`} title={`Rank gara: ${race.rank}`}><Star className="w-2.5 h-2.5 fill-current" />{race.rank}</div>}
                    <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl tracking-wider ${race.type === 'Triathlon' ? 'bg-blue-100 text-blue-700' : race.type === 'Duathlon' ? 'bg-orange-100 text-orange-700' : race.type.includes('Winter') ? 'bg-cyan-100 text-cyan-700' : 'bg-emerald-100 text-emerald-700'}`} title={`Tipo di sport: ${race.type}`}>
                        {race.type}
                    </span>
                </div>
            </div>
            
            {race.event && <div className="text-sm font-black text-slate-600 uppercase tracking-wide mb-1.5 leading-snug">{race.event}</div>}
            <h3 className="font-black text-slate-800 text-lg mb-3 leading-[1.2] group-hover:text-blue-600 transition-colors">{race.title}</h3>
            
            <div className="space-y-2 mb-6">
                <div className="flex items-start gap-2.5" title="Località e Regione">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-600 leading-snug">{race.location}</p>
                            <button onClick={openInMaps} className="p-1 hover:bg-slate-100 rounded text-blue-600 transition-colors" title="Apri navigatore Google Maps" aria-label="Apri posizione in Google Maps">
                                <Navigation className="w-3 h-3 rotate-45" />
                            </button>
                        </div>
                        <span className="text-blue-600 text-[10px] font-bold uppercase tracking-tighter">{race.region}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {race.distance && <div className="flex items-center gap-2" title="Distanza della gara"><Bike className="w-4 h-4 text-slate-400 shrink-0" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{race.distance}</span></div>}
                    {race.distanceFromHome !== undefined && race.distanceFromHome !== null && (<div className="flex items-center gap-2 bg-blue-50/50 px-2 py-1 rounded-lg border border-blue-100/50" title="Distanza stimata dalla tua provincia"><Navigation className="w-3 h-3 text-blue-600" /><span className="text-[10px] font-black text-blue-700 uppercase">~{race.distanceFromHome} KM</span></div>)}
                    {(() => {
                        const weather = getWeatherData(race.region, race.date);
                        return (
                            <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100" title={`Meteo storico medio: ${weather.temp}°C, Pioggia ${weather.rain}%`}>
                                {weather.rain > 20 ? <Cloud className="w-3.5 h-3.5 text-slate-500" /> : <Sun className="w-3.5 h-3.5 text-orange-600" />}
                                <span className="text-[10px] font-black text-slate-600 uppercase">{weather.temp}°C</span>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {isSelected && note && (
                <div className="mb-4 p-3 bg-blue-50/30 rounded-xl border border-blue-100/50">
                    <p className="text-[10px] font-bold text-blue-600 line-clamp-2 italic">📝 {note}</p>
                </div>
            )}

            {participants.length > 0 && (
                <div className="mb-4 flex flex-col gap-1.5 min-h-[40px]">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <User className="w-3 h-3 text-red-500" /> Compagni MTT ({participants.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                        {participants.map((name, i) => (
                            <span key={i} className="text-[9px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="flex flex-col gap-4 mt-auto pt-5 border-t border-slate-50">
                <div className="flex items-center justify-between">
                    {race.category ? (
                        <span className="text-[10px] font-black text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg uppercase tracking-wider w-fit" title="Categoria della gara">
                            {race.category}
                        </span>
                    ) : <div></div>}
                    
                    {isSelected && (
                        <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); onNote(race); }} className={`p-2 rounded-lg transition-all ${note ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-50'}`} title="Diario di Gara (Note personali)" aria-label="Modifica diario di gara">
                                <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onSingleCard(race); }} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-all" title="Instagram Post" aria-label="Genera card Instagram">
                                <Image className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onChecklist(race); }} className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-50 transition-all" title="Checklist Attrezzatura" aria-label="Mostra checklist attrezzatura">
                                <ShoppingBag className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
                
                {isSelected && (
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-1 relative group/legend" title="Priorità Stagione">
                            {['A', 'B', 'C'].map(p => (
                                <button
                                    key={p}
                                    onClick={(e) => { e.stopPropagation(); onPriority(race.id, p); }}
                                    className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${
                                        priority === p
                                        ? (p === 'A' ? 'bg-yellow-400 text-white shadow-sm' : p === 'B' ? 'bg-blue-400 text-white shadow-sm' : 'bg-slate-400 text-white shadow-sm')
                                        : 'text-slate-400 hover:bg-white'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 h-8">
                            <span className="text-[9px] font-black text-slate-400 uppercase">€</span>
                            <input 
                                type="number" 
                                placeholder="0"
                                className="bg-transparent border-none outline-none text-[10px] font-black text-slate-600 w-10 text-center"
                                value={cost || ''}
                                onChange={(e) => onCost(race.id, parseFloat(e.target.value) || 0)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Costo iscrizione per ${race.title}`}
                            />
                        </div>
                    </div>
                )}
                
                <div className="flex items-center gap-2">
                    {race.link && (
                        <a 
                            href={race.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-2 px-4 py-3 rounded-[1.25rem] text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all border border-blue-100 font-black text-[10px] uppercase tracking-widest" 
                            title="Vai alla scheda ufficiale MyFITri" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Scheda</span>
                        </a>
                    )}
                    <button
                        onClick={() => onToggle(race.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-[1.25rem] text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                            isSelected
                            ? 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-100'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                        }`}
                    >
                        {isSelected ? <><Trash2 className="w-3.5 h-3.5" /> Rimuovi</> : <><Plus className="w-3.5 h-3.5" /> Aggiungi</>}
                    </button>
                </div>
            </div>
        </div>
    );
});

const EMPTY_ARRAY: any[] = [];

const DashboardPage: React.FC = () => {
  const [isPending, startTransition] = useTransition();
  const cardRef = React.useRef<HTMLDivElement>(null);
  const singleCardRef = React.useRef<HTMLDivElement>(null);
  const [activeSingleRace, setActiveSingleRace] = useState<Race | null>(null);
  const [activeChecklistRace, setActiveChecklistRace] = useState<Race | null>(null);
  const [activeNoteRace, setActiveNoteRace] = useState<Race | null>(null);
  const [racesState, setRacesState] = useState<Race[]>([]);
  const [selectedRaces, setSelectedRaces] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [filterType, setFilterType] = useState("Tutti");
  const [filterMonth, setFilterMonth] = useState("Tutti");
  const [filterDistance, setFilterDistance] = useState("Tutti");
  const [filterRegion, setFilterRegion] = useState("Tutte");
  const [filterSpecial, setFilterSpecial] = useState<string[]>([]);
  const [filterRadius, setFilterRadius] = useState<number>(1000);
  const deferredFilterRadius = useDeferredValue(filterRadius);
  const [homeCity, setHomeCity] = useState(localStorage.getItem("home_city") || "");
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [racePriorities, setRacePriorities] = useState<Record<string, string>>({});
  const [raceCosts, setRaceCosts] = useState<Record<string, number>>({});
  const [raceNotes, setRaceNotes] = useState<Record<string, string>>({});
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);

  const ADMIN_EMAIL = "bonfantistefano4@gmail.com";

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = useCallback(async () => {
    if (!session?.user) return;
    const { data: myData } = await supabase.from('user_plans').select('*').eq('user_id', session.user.id);
    if (myData) {
      const selected: string[] = [];
      const priorities: Record<string, string> = {};
      const costs: Record<string, number> = {};
      const notes: Record<string, string> = {};
      myData.forEach(item => {
        selected.push(item.race_id);
        priorities[item.race_id] = item.priority;
        costs[item.race_id] = item.cost;
        notes[item.race_id] = item.note;
      });
      setSelectedRaces(selected);
      setRacePriorities(priorities);
      setRaceCosts(costs);
      setRaceNotes(notes);
    }
    const { data: teamPlans } = await supabase.from('user_plans').select('user_id, race_id');
    const { data: teamProfiles } = await supabase.from('profiles').select('id, full_name');
    if (teamPlans) setAllPlans(teamPlans);
    if (teamProfiles) setAllProfiles(teamProfiles);
  }, [session]);

  useEffect(() => { if (session) fetchData(); }, [session, fetchData]);

  const participantsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    const profileMap: Record<string, string> = {};
    allProfiles.forEach(p => { profileMap[p.id] = p.full_name; });
    
    allPlans.forEach(p => {
      if (!map[p.race_id]) map[p.race_id] = [];
      const name = profileMap[p.user_id];
      if (name) map[p.race_id].push(name);
    });
    return map;
  }, [allPlans, allProfiles]);

  const getDistance = useCallback((targetLocation: string, home: string) => {
    if (!home) return null;
    const p = targetLocation.match(/\((.*?)\)/);
    const target = p ? p[1] : targetLocation;
    const s = provinceCoordinates[home];
    const e = provinceCoordinates[target];
    if (!s || !e) return null;
    const R = 6371;
    const dLat = (e[0] - s[0]) * Math.PI / 180;
    const dLon = (e[1] - s[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(s[0] * Math.PI / 180) * Math.cos(e[0] * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return Math.round(R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))) * 1.2);
  }, []);

  const races = useMemo(() => {
    const source = racesState.length > 0 ? racesState : (racesData as Race[]);
    return source.map(race => {
      const cityName = race.location.split('(')[0].trim();
      let coords = provinceCoordinates[cityName];
      if (!coords) {
        const p = race.location.match(/\((.*?)\)/);
        coords = provinceCoordinates[p ? p[1] : race.location];
      }
      let mapCoords: [number, number] | undefined = undefined;
      if (coords) {
        const num = parseInt(race.id) || 0;
        mapCoords = [coords[0] + (((num % 10) - 5) * 0.005), coords[1] + ((((num * 7) % 10) - 5) * 0.005)];
      }
      
      // Pre-parsing data per performance filtro
      const [d, m, y] = race.date.split("-");
      const timestamp = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getTime();

      return { ...race, mapCoords, distanceFromHome: getDistance(race.location, homeCity), timestamp };
    });
  }, [racesState, homeCity, getDistance]);

  const myPlan = useMemo(() => {
    return races.filter((r) => selectedRaces.includes(r.id)).sort((a,b) => a.date.split("-").reverse().join("-").localeCompare(b.date.split("-").reverse().join("-")));
  }, [races, selectedRaces]);

  const budgetTotals = useMemo(() => {
    const registration = myPlan.reduce((acc, r) => acc + (raceCosts[r.id] || 0), 0);
    let travel = 0;
    myPlan.forEach(r => { if (r.distanceFromHome) travel += (r.distanceFromHome * 2) * 0.25; });
    return { registration, travel, total: registration + travel };
  }, [myPlan, raceCosts]);

  const seasonStats = useMemo(() => {
    const priorities = { A: 0, B: 0, C: 0 };
    const types: Record<string, number> = {};
    let totalKm = 0;
    myPlan.forEach(r => {
        const p = racePriorities[r.id] || 'C';
        if (p === 'A') priorities.A++; else if (p === 'B') priorities.B++; else priorities.C++;
        types[r.type] = (types[r.type] || 0) + 1;
        if (r.distanceFromHome) totalKm += (r.distanceFromHome * 2);
    });
    return { priorities, types, totalKm };
  }, [myPlan, racePriorities]);

  const nextObjective = useMemo(() => {
    const now = new Date();
    return myPlan.find(r => {
        const p = racePriorities[r.id] || 'C';
        if (p !== 'A') return false;
        const [d, m, y] = r.date.split("-");
        return new Date(parseInt(y), parseInt(m)-1, parseInt(d)) > now;
    });
  }, [myPlan, racePriorities]);

  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, mins: number} | null>(null);

  useEffect(() => {
    if (!nextObjective) { setTimeLeft(null); return; }
    const update = () => {
        const [d, m, y] = nextObjective.date.split("-");
        const diff = new Date(parseInt(y), parseInt(m)-1, parseInt(d)).getTime() - new Date().getTime();
        if (diff > 0) setTimeLeft({ days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), mins: Math.floor((diff % 3600000) / 60000) });
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [nextObjective]);

  const getCachedIcon = useMemo(() => {
    const cache: Record<string, L.DivIcon> = {};
    ['Triathlon', 'Duathlon', 'Winter', 'Cross'].forEach(t => {
      [undefined, 'A'].forEach(p => {
        [true, false].forEach(s => {
          let color = '#3b82f6';
          if (t === 'Duathlon') color = '#f97316';
          if (t.includes('Winter')) color = '#06b6d4';
          if (t === 'Cross') color = '#10b981';
          if (s) color = '#ef4444';
          if (p === 'A') color = '#eab308';
          cache[`${t}-${p}-${s}`] = L.divIcon({ 
            className: 'custom-div-icon', 
            html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 8px; font-weight: 900;">${p === 'A' ? 'A' : ''}</div>`, 
            iconSize: [14, 14], 
            iconAnchor: [7, 7]
          });
        });
      });
    });
    return (type: string, isSelected: boolean, priority?: string, title?: string) => {
        const key = `${type.includes('Winter') ? 'Winter' : type}-${priority === 'A' ? 'A' : 'undefined'}-${isSelected}`;
        const icon = cache[key] || cache['Triathlon-undefined-false'];
        if (title) {
            (icon.options as any).title = title;
        }
        return icon;
    };
  }, []);

  const handleViewChange = (mode: 'list' | 'map') => { startTransition(() => setViewMode(mode)); };

  const regions = useMemo(() => {
    const r = new Set(races.map(race => race.region).filter(Boolean));
    return ["Tutte", ...Array.from(r).sort()];
  }, [races]);

  const setPriority = useCallback(async (id: string, p: string) => {
    setRacePriorities(prev => ({ ...prev, [id]: p }));
    if (session?.user) {
      await supabase.from('user_plans').update({ priority: p }).eq('user_id', session.user.id).eq('race_id', id);
    }
  }, [session]);

  const updateCost = useCallback(async (id: string, cost: number) => {
    setRaceCosts(prev => ({ ...prev, [id]: cost }));
    if (session?.user) {
      await supabase.from('user_plans').update({ cost: cost }).eq('user_id', session.user.id).eq('race_id', id);
    }
  }, [session]);

  const updateNote = async (id: string, note: string) => {
    setRaceNotes(prev => ({ ...prev, [id]: note }));
    if (session?.user) {
      await supabase.from('user_plans').update({ note: note }).eq('user_id', session.user.id).eq('race_id', id);
    }
  };

  const addRaceFinal = useCallback(async (id: string) => {
    setSelectedRaces((prev) => [...prev, id]);
    setRacePriorities(prev => ({ ...prev, [id]: 'C' }));
    setPendingConfirmId(null);
    if (session?.user) {
      await supabase.from('user_plans').insert([{ user_id: session.user.id, race_id: id, priority: 'C' }]);
    }
  }, [session]);

  const toggleRace = useCallback(async (id: string) => {
    if (selectedRaces.includes(id)) {
      setSelectedRaces((prev) => prev.filter((r) => r !== id));
      setRacePriorities(prev => { const next = {...prev}; delete next[id]; return next; });
      setRaceNotes(prev => { const next = {...prev}; delete next[id]; return next; });
      if (session?.user) { await supabase.from('user_plans').delete().eq('user_id', session.user.id).eq('race_id', id); }
      return;
    }
    const newRace = races.find(r => r.id === id);
    if (newRace) {
      const [nd, nm, ny] = newRace.date.split("-");
      const tooClose = myPlan.some(r => {
          const [rd, rm, ry] = r.date.split("-");
          return Math.ceil(Math.abs(new Date(parseInt(ny), parseInt(nm) - 1, parseInt(nd)).getTime() - new Date(parseInt(ry), parseInt(rm) - 1, parseInt(rd)).getTime()) / 86400000) < 3;
      });
      if (tooClose) { setPendingConfirmId(id); return; }
    }
    addRaceFinal(id);
  }, [selectedRaces, races, myPlan, addRaceFinal, session]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) { setRacesState(imported); }
        } catch (err) { alert("Errore JSON."); }
      };
      reader.readAsText(file);
    }
  };

  const exportToICS = () => {
    if (myPlan.length === 0) return;
    let ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fitri Planner//IT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    myPlan.forEach(race => {
      const [d, m, y] = race.date.split("-");
      const note = raceNotes[race.id] ? `\\nNOTE: ${raceNotes[race.id]}` : "";
      ics.push("BEGIN:VEVENT", `UID:${race.id}@mtt`, `DTSTART;VALUE=DATE:${y}${m}${d}`, `DTEND;VALUE=DATE:${y}${m}${d}`, `SUMMARY:${race.title}`, `LOCATION:${race.location}`, `DESCRIPTION:Priorità: ${racePriorities[race.id] || 'C'}${note}`, "END:VEVENT");
    });
    ics.push("END:VCALENDAR");
    const blob = new Blob([ics.join("\r\n")], { type: "text/calendar" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", "gare_mtt_2026.ics"); link.click();
  };

  const exportToCSV = () => {
    if (myPlan.length === 0) return;
    const headers = ["Data", "Evento", "Specialità", "Località", "Regione", "Sport", "Distanza", "Priorità", "Costo", "Km", "Note"];
    const rows = myPlan.map(r => [r.date, r.event || "", r.title, r.location, r.region, r.type, r.distance, racePriorities[r.id] || 'C', raceCosts[r.id] || 0, r.distanceFromHome || "", `"${(raceNotes[r.id] || "").replace(/"/g, '""')}"`]);
    const csv = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", "piano_mtt_2026.csv"); link.click();
  };

  const filteredRaces = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const nowTs = now.getTime();

    return races.filter((race) => {
        if ((race as any).timestamp < nowTs) return false;
        
        const matchesSearch = (race.title?.toLowerCase() || "").includes(deferredSearchTerm.toLowerCase()) || (race.location?.toLowerCase() || "").includes(deferredSearchTerm.toLowerCase());
        let matchesType = filterType === "Tutti";
        if (filterType === "Triathlon") matchesType = race.type === "Triathlon";
        else if (filterType === "Duathlon") matchesType = race.type === "Duathlon";
        else if (filterType === "Winter") matchesType = race.type.includes("Winter");
        else if (filterType === "Cross") matchesType = race.type === "Cross";
        
        const [_, rm] = race.date.split("-"); // Il mese serve ancora per il filtro mese
        const matchesMonth = filterMonth === "Tutti" || rm === filterMonth;
        const matchesDistance = filterDistance === "Tutti" || (race.distance?.toLowerCase() || "").includes(filterDistance.toLowerCase());
        const matchesRegion = filterRegion === "Tutte" || race.region === filterRegion;
        const matchesSpecial = filterSpecial.length === 0 || filterSpecial.some(s => (race.category?.toLowerCase() || "").includes(s.toLowerCase()) || (race.title?.toLowerCase() || "").includes(s.toLowerCase()));
        const matchesRadius = deferredFilterRadius >= 1000 || !race.distanceFromHome || race.distanceFromHome <= deferredFilterRadius;
        return matchesSearch && matchesType && matchesMonth && matchesDistance && matchesRegion && matchesSpecial && matchesRadius;
    }).sort((a,b) => (a as any).timestamp - (b as any).timestamp);
  }, [races, deferredSearchTerm, filterType, filterMonth, filterDistance, filterRegion, filterSpecial, deferredFilterRadius]);

  const renderedRaceList = useMemo(() => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRaces.map((race) => (
                <RaceCard 
                    key={race.id} 
                    race={race} 
                    isSelected={selectedRaces.includes(race.id)} 
                    priority={racePriorities[race.id] || 'C'} 
                    cost={raceCosts[race.id] || 0} 
                    note={raceNotes[race.id] || ""} 
                    participants={participantsMap[race.id] || EMPTY_ARRAY}
                    onToggle={toggleRace} 
                    onPriority={setPriority} 
                    onCost={updateCost} 
                    onSingleCard={generateSingleRaceCard} 
                    onChecklist={setActiveChecklistRace} 
                    onNote={setActiveNoteRace} 
                />
            ))}
        </div>
    );
  }, [filteredRaces, selectedRaces, racePriorities, raceCosts, raceNotes, participantsMap, toggleRace, setPriority, updateCost, generateSingleRaceCard, setActiveChecklistRace, setActiveNoteRace]);

  const generateRaceCard = async () => {
    if (cardRef.current) {
        const dataUrl = await toPng(cardRef.current, { backgroundColor: '#0f172a' });
        const link = document.createElement('a'); link.download = `stagione-mtt-2026.png`; link.href = dataUrl; link.click();
    }
  };

  const generateSingleRaceCard = useCallback(async (race: Race) => {
    setActiveSingleRace(race);
    setTimeout(async () => {
        if (singleCardRef.current) {
            const dataUrl = await toPng(singleCardRef.current, { backgroundColor: '#0f172a', width: 1080, height: 1080 });
            const link = document.createElement('a'); link.download = `mtt-challenge-${race.id}.png`; link.href = dataUrl; link.click();
            setActiveSingleRace(null);
        }
    }, 200);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 sticky top-28">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Filter className="w-4 h-4 text-blue-600" /> Filtri</h2>
                <button onClick={() => { setSearchTerm(""); setFilterType("Tutti"); setFilterMonth("Tutti"); setFilterDistance("Tutti"); setFilterRegion("Tutte"); setFilterSpecial([]); setFilterRadius(1000); }} className="text-[10px] font-bold text-blue-700 hover:underline" aria-label="Resetta tutti i filtri">Reset</button>
            </div>
            <div className="space-y-5">
              <div className="relative group">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input 
                  id="search-input"
                  type="text" 
                  placeholder="Cerca gara..." 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none text-sm font-medium" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  aria-label="Cerca gara per titolo o località"
                />
              </div>
              {homeCity && (
                <div>
                  <label htmlFor="radius-range" className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-2 flex justify-between">
                    <span>Distanza massima</span>
                    <span className="text-blue-700">{filterRadius >= 1000 ? 'Illimitato' : `${filterRadius} km`}</span>
                  </label>
                  <input 
                    id="radius-range"
                    type="range" 
                    min="50" 
                    max="1000" 
                    step="50" 
                    value={filterRadius} 
                    onChange={(e) => setFilterRadius(parseInt(e.target.value))} 
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-2">Sport</label>
                <div className="flex flex-wrap gap-2">
                  {["Tutti", "Triathlon", "Duathlon", "Winter", "Cross"].map((t) => (
                    <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${(filterType === t) ? "bg-slate-900 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="month-select" className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-2">Mese</label>
                  <select 
                    id="month-select"
                    value={filterMonth} 
                    onChange={(e) => setFilterMonth(e.target.value)} 
                    className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none cursor-pointer hover:bg-slate-100"
                  >
                      <option value="Tutti">Tutti</option>
                      <option value="01">Gennaio</option><option value="02">Febbraio</option><option value="03">Marzo</option><option value="04">Aprile</option><option value="05">Maggio</option><option value="06">Giugno</option><option value="07">Luglio</option><option value="08">Agosto</option><option value="09">Settembre</option><option value="10">Ottobre</option><option value="11">Novembre</option><option value="12">Dicembre</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="distance-select" className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-2">Distanza</label>
                  <select 
                    id="distance-select"
                    value={filterDistance} 
                    onChange={(e) => setFilterDistance(e.target.value)} 
                    className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none cursor-pointer hover:bg-slate-100"
                  >
                      <option value="Tutti">Tutte</option><option value="Super Sprint">Super Sprint</option><option value="Sprint">Sprint</option><option value="Olimpico">Olimpico</option><option value="Medio">Medio (70.3)</option><option value="Lungo">Lungo (140.6)</option><option value="Cross">Cross</option><option value="Staffetta">Staffetta</option>
                  </select>
                </div>
              </div>
              <div><label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-2">Settori Speciali</label><div className="flex flex-wrap gap-2">{["Paratriathlon", "Kids", "Youth"].map((s) => (<button key={s} onClick={() => { setFilterSpecial(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]); }} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${(filterSpecial.includes(s)) ? "bg-blue-700 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{s}</button>))}</div></div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="province-select" className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-2">La tua provincia</label>
                  <select 
                    id="province-select"
                    value={homeCity} 
                    onChange={(e) => { setHomeCity(e.target.value); localStorage.setItem("home_city", e.target.value); }} 
                    className="w-full p-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none cursor-pointer hover:bg-slate-100"
                  >
                    <option value="">Seleziona...</option>{Object.keys(provinceCoordinates).sort().map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-10 pt-10 border-t border-slate-100">
                <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-black text-slate-800">Le mie gare <span className="text-blue-700">({myPlan.length})</span></h2><div className="flex gap-2">
                    <button onClick={exportToICS} className="text-blue-700 p-1" aria-label="Esporta in Calendario (ICS)"><Calendar className="w-4 h-4" /></button>
                    <button onClick={exportToCSV} className="text-emerald-700 p-1" aria-label="Esporta in Excel (CSV)"><Download className="w-4 h-4" /></button>
                    <span title="Race Card stagionale" className="cursor-pointer"><Camera className="w-4 h-4 text-slate-500 hover:text-blue-700" onClick={generateRaceCard} aria-label="Genera Race Card stagionale" /></span>
                </div></div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {myPlan.map((race) => (
                    <div key={race.id} className={`p-4 rounded-2xl border transition-all ${racePriorities[race.id] === 'A' ? 'border-yellow-200 bg-yellow-50/30' : 'border-slate-100 bg-white shadow-sm'}`}>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1"><div className="flex items-center gap-2"><span className="text-[10px] font-black text-blue-700">{race.date}</span>{racePriorities[race.id] && <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-white">{racePriorities[race.id]}</span>}</div><h3 className="text-xs font-bold text-slate-700 leading-tight">{race.title}</h3></div>
                            <button onClick={() => toggleRace(race.id)} className="text-slate-500 hover:text-red-600" aria-label={`Rimuovi ${race.title} dal mio piano`}><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>))}
                </div>
                {myPlan.length > 0 && (<div className="mt-6 pt-6 border-t border-slate-100 space-y-2 text-xs font-bold"><div className="flex justify-between text-slate-600"><span>Iscrizioni</span><span>€ {budgetTotals.registration.toFixed(2)}</span></div><div className="flex justify-between text-emerald-700 text-sm font-black"><span>TOTALE STIMATO</span><span>€ {budgetTotals.total.toFixed(2)}</span></div></div>)}
            </div>

            {/* BOX SUPPORTO */}
            <div className="bg-gradient-to-br from-rose-50 to-white p-6 rounded-[2rem] border border-rose-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                    <div className="bg-rose-500 p-2 rounded-xl text-white shadow-sm">
                        <Heart className="w-4 h-4 fill-current" />
                    </div>
                    <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight">Ti piace l'App?</h3>
                </div>
                <p className="text-xs font-bold text-slate-500 leading-relaxed mb-4">
                    Supporta lo sviluppo dell'app e la manutenzione del server MTT!
                </p>
                <a 
                    href="https://ko-fi.com/stefanobonfanti" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-center gap-2 w-full py-3 bg-white border-2 border-rose-500 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                >
                    Offrimi un caffè ☕
                </a>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
            {/* Contenitore Prossimo Obiettivo: sempre presente per stabilità layout */}
            <div className="min-h-[160px] empty:hidden">
                {nextObjective && timeLeft ? (
                    <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-[3rem] p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative animate-in fade-in duration-500">
                        <div className="absolute right-0 top-0 p-4 opacity-10 rotate-12">
                            <img src="/Logo.png" alt="" className="w-48 h-auto grayscale brightness-200" />
                        </div>
                        <div className="relative z-10"><span className="text-[10px] font-black uppercase tracking-widest opacity-60 bg-white/20 px-2 py-1 rounded">Prossimo Obiettivo</span><h2 className="text-2xl font-black uppercase mt-2">{nextObjective.title}</h2></div>
                        <div className="flex gap-4 text-center relative z-10"><div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl min-w-[70px]"><div className="text-3xl font-black tabular-nums">{timeLeft.days}</div><div className="text-[8px] font-bold uppercase opacity-60">Giorni</div></div><div className="text-2xl mt-3 opacity-30">:</div><div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl min-w-[70px]"><div className="text-3xl font-black tabular-nums">{timeLeft.hours}</div><div className="text-[8px] font-bold uppercase opacity-60">Ore</div></div></div>
                    </div>
                ) : null}
            </div>

            {/* Contenitore Analisi Stagione: sempre presente se l'utente ha gare, con altezza minima predefinita */}
            <div className="min-h-[350px] empty:hidden">
                {myPlan.length > 0 ? (
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden relative group animate-in fade-in duration-500">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <img src="/Logo.png" alt="" className="w-64 h-auto grayscale brightness-200" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-8"><div className="bg-blue-500 p-2 rounded-xl"><Activity className="w-5 h-5 text-white" /></div><h2 className="text-xl font-black uppercase tracking-tight">Analisi Stagione</h2></div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="bg-white/5 p-5 rounded-3xl border border-white/10">
                                    <span className="text-[10px] font-black text-slate-300 uppercase block mb-4">Focus Target</span>
                                    <div className="flex items-end gap-3"><div className="text-3xl font-black text-yellow-400 tabular-nums">{seasonStats.priorities.A}</div><div className="text-[10px] font-bold text-slate-300 mb-1.5 uppercase">Obiettivi A</div></div>
                                    <div className="mt-4 flex gap-1 h-1.5"><div className="bg-yellow-400 rounded-full" style={{ width: `${(seasonStats.priorities.A / myPlan.length) * 100}%` }}></div><div className="bg-blue-400 rounded-full" style={{ width: `${(seasonStats.priorities.B / myPlan.length) * 100}%` }}></div><div className="bg-slate-600 rounded-full flex-1"></div></div>
                                </div>
                                <div className="bg-white/5 p-5 rounded-3xl border border-white/10"><span className="text-[10px] font-black text-slate-300 uppercase block mb-4">Mix Discipline</span><div className="space-y-2">{Object.entries(seasonStats.types).map(([type, count]) => (<div key={type} className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-200">{type}</span><span className="text-xs font-black tabular-nums">{count}</span></div>))}</div></div>
                                <div className="bg-white/5 p-5 rounded-3xl border border-white/10"><span className="text-[10px] font-black text-slate-300 uppercase block mb-4">Logistica</span><div className="flex items-center gap-3"><Navigation className="w-8 h-8 text-blue-400" /><div><div className="text-2xl font-black tabular-nums">{seasonStats.totalKm}</div><div className="text-[10px] font-bold text-slate-300 uppercase">Km Stimati</div></div></div></div>
                            </div>
                            <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-red-600/20 p-2 rounded-lg">
                                        <img src="/Logo.png" alt="" className="w-6 h-6 object-contain" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-200">Vuoi gareggiare con i colori del <span className="text-red-500">MTT</span> nel 2026?</p>
                                </div>
                                <a href="https://www.milanotriathlonteam.com/" target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg">Diventa un MTT</a>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    <span className="tabular-nums">{filteredRaces.length}</span> gare trovate
                </span>
                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                    <button onClick={() => handleViewChange('list')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`} aria-label="Visualizza come lista">Lista</button>
                    <button onClick={() => handleViewChange('map')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'map' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`} aria-label="Visualizza su mappa">Mappa</button>
                </div>
            </div>

            {viewMode === 'list' ? (
                renderedRaceList
            ) : (
                <div className="h-[600px] w-full rounded-[3rem] overflow-hidden border-4 border-white shadow-xl relative isolate bg-slate-100">
                    <MapContainer center={[41.8719, 12.5674]} zoom={6} className="h-full w-full outline-none" fadeAnimation={false} zoomAnimation={false}>
                        <TileLayer 
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                            noWrap={true}
                            keepBuffer={8}
                        />
                        {filteredRaces.map(race => race.mapCoords && (
                            <Marker key={race.id} position={race.mapCoords} icon={getCachedIcon(race.type, selectedRaces.includes(race.id), racePriorities[race.id], race.title)} alt={`Gara: ${race.title}`}>
                                <Popup>
                                    <div className="p-3 min-w-[200px] flex flex-col gap-2">
                                        <div className="flex justify-between items-start gap-4">
                                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{race.date}</span>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${race.type === 'Triathlon' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{race.type}</span>
                                        </div>
                                        <h3 className="font-black text-slate-800 text-sm leading-tight mt-1">{race.title}</h3>
                                        <div className="flex flex-col gap-1 mt-1">
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <MapPin className="w-3 h-3" />
                                                <span className="text-[10px] font-bold">{race.location}</span>
                                            </div>
                                            {race.distance && (
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <Bike className="w-3 h-3" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{race.distance}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            <button 
                                                onClick={() => toggleRace(race.id)} 
                                                className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedRaces.includes(race.id) ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-600 text-white shadow-lg'}`}
                                            >
                                                {selectedRaces.includes(race.id) ? 'Rimuovi' : 'Aggiungi'}
                                            </button>
                                            {race.link && (
                                                <a 
                                                    href={race.link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="flex items-center justify-center py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all border border-slate-200"
                                                >
                                                    Scheda <ExternalLink className="w-3 h-3 ml-1" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            )}
        </div>

        {/* MODALE NOTE ATLETA */}
        {activeNoteRace && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true" aria-labelledby="note-modal-title">
                <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-start mb-6"><div className="bg-blue-50 p-3 rounded-2xl"><Edit3 className="w-6 h-6 text-blue-600" /></div><button onClick={() => setActiveNoteRace(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors" aria-label="Chiudi diario di gara"><X className="w-5 h-5 text-slate-500" /></button></div>
                    <h3 id="note-modal-title" className="text-xl font-black text-slate-800 mb-1 uppercase tracking-tight">Diario di Gara</h3>
                    <label htmlFor="race-notes-textarea" className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 block">{activeNoteRace.title}</label>
                    <textarea 
                        id="race-notes-textarea"
                        autoFocus 
                        className="w-full h-40 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold text-slate-700 placeholder:text-slate-500" 
                        placeholder="Esempio: Obiettivo stare sotto le 2h15, gel ogni 45 min..." 
                        value={raceNotes[activeNoteRace.id] || ""} 
                        onChange={(e) => updateNote(activeNoteRace.id, e.target.value)} 
                    />
                    <button onClick={() => setActiveNoteRace(null)} className="w-full mt-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all">Salva Note</button>
                </div>
            </div>
        )}

        {activeChecklistRace && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true" aria-labelledby="checklist-modal-title">
                <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-start mb-6"><div className="bg-emerald-50 p-3 rounded-2xl"><ShoppingBag className="w-6 h-6 text-emerald-600" /></div><button onClick={() => setActiveChecklistRace(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors" aria-label="Chiudi checklist"><X className="w-5 h-5 text-slate-500" /></button></div>
                    <h3 id="checklist-modal-title" className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Checklist {activeChecklistRace.type}</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">{getEquipment(activeChecklistRace.type).map((item, i) => (<div key={i} className="p-4 bg-slate-50 rounded-xl text-sm font-bold text-slate-600 flex items-center gap-3 border border-slate-100 hover:bg-white transition-all"><CheckCircle className="w-4 h-4 text-emerald-500" />{item}</div>))}</div>
                    <button onClick={() => setActiveChecklistRace(null)} className="w-full mt-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all">Chiudi</button>
                </div>
            </div>
        )}

        {pendingConfirmId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full text-center animate-in zoom-in-95 shadow-2xl">
                    <div className="bg-orange-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-8 h-8 text-orange-500" /></div>
                    <h3 className="text-xl font-black mb-4 uppercase">Gara molto vicina!</h3><p className="text-slate-500 mb-8 font-medium">Hai meno di 3 giorni di recupero. Vuoi procedere?</p>
                    <div className="flex gap-3"><button onClick={() => setPendingConfirmId(null)} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 rounded-2xl font-black text-xs uppercase transition-all">Annulla</button><button onClick={() => addRaceFinal(pendingConfirmId)} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase shadow-lg transition-all">Conferma</button></div>
                </div>
            </div>
        )}

        {/* TEMPLATE SOCIAL STAGIONALE */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
            <div ref={cardRef} className="w-[1080px] min-h-[1920px] bg-slate-900 p-20 flex flex-col text-white font-sans relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5"><img src="/Logo.png" alt="" className="w-[800px] h-auto grayscale brightness-200" /></div>
                <div className="flex items-center justify-between mb-20 border-b-4 border-red-600 pb-10 relative z-10">
                    <div className="flex items-center gap-8"><div className="bg-red-600 p-6 rounded-[2.5rem] rotate-3 shadow-2xl"><img src="/Logo.png" alt="" className="w-20 h-auto grayscale brightness-200" /></div><div><h1 className="text-7xl font-black tracking-tighter uppercase leading-none mb-2">My 2026 Season</h1><p className="text-2xl font-bold text-red-500 uppercase tracking-[0.5em]">MTT Milano Triathlon Team</p></div></div>
                    <div className="text-right text-9xl font-black text-white/10 leading-none">2026</div>
                </div>
                <div className="flex-1 space-y-10 relative z-10">
                    {myPlan.slice(0, 10).map((race) => (
                        <div key={race.id} className={`p-10 rounded-[3rem] flex items-center justify-between border-4 transition-all ${racePriorities[race.id] === 'A' ? 'bg-yellow-500/10 border-yellow-500' : 'bg-white/5 border-white/5'}`}>
                            <div className="flex items-center gap-10">
                                <div className="flex flex-col items-center justify-center bg-white/10 w-28 h-28 rounded-[2rem] border-2 border-white/10"><span className="text-sm font-black uppercase text-blue-400">{race.date.split('-')[1]}</span><span className="text-4xl font-black">{race.date.split('-')[0]}</span></div>
                                <div className="space-y-2">
                                    {racePriorities[race.id] === 'A' && <div className="flex items-center gap-2 text-yellow-500 mb-2"><Star className="w-6 h-6 fill-current" /><span className="text-xl font-black uppercase tracking-widest">Main Objective</span></div>}
                                    {race.event && <div className="text-xl font-black text-white/40 uppercase tracking-[0.2em] mb-1">{race.event}</div>}
                                    <h2 className="text-4xl font-black leading-tight max-w-2xl">{race.title}</h2>
                                    <div className="flex items-center gap-4 text-white/40 text-xl font-bold"><MapPin className="w-6 h-6" /><span>{race.location} • {race.region}</span></div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-4"><span className={`px-10 py-4 rounded-3xl text-3xl font-black uppercase ${race.type === 'Triathlon' ? 'bg-blue-600' : 'bg-orange-600'}`}>{race.type}</span></div>
                        </div>
                    ))}
                </div>
                <div className="mt-20 pt-10 border-t-2 border-white/10 flex justify-between items-end opacity-40 relative z-10"><div className="text-xl font-bold"><p>Generato da MTT Season Planner</p><p className="text-red-500 uppercase tracking-widest">www.milanotriathlonteam.com</p></div><div className="flex items-center gap-4"><img src="/Logo.png" alt="" className="w-10 h-auto grayscale brightness-200" /><span className="text-4xl font-black uppercase italic">Ready to Race</span></div></div>
            </div>
        </div>

        {/* TEMPLATE SOCIAL SINGOLA GARA */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
            {activeSingleRace && (
                <div ref={singleCardRef} className="w-[1080px] h-[1080px] bg-slate-900 p-20 flex flex-col items-center justify-center text-white font-sans relative overflow-hidden text-center">
                    <div className="absolute top-0 right-0 p-10 opacity-5"><img src="/Logo.png" alt="" className="w-[600px] h-auto grayscale brightness-200" /></div>
                    <div className="z-10 space-y-10">
                        <div className="bg-red-600 px-8 py-3 rounded-full inline-block mb-4 shadow-2xl"><span className="text-2xl font-black uppercase tracking-[0.5em]">Next Challenge</span></div>
                        <div className="space-y-4"><h1 className="text-8xl font-black tracking-tighter leading-none uppercase drop-shadow-2xl">{activeSingleRace.event || activeSingleRace.title}</h1><p className="text-4xl font-bold text-red-500 uppercase tracking-[0.3em]">MTT Milano Triathlon Team</p></div>
                        <div className="flex flex-col items-center gap-6 pt-10"><div className="flex items-center gap-6 bg-white/10 px-10 py-6 rounded-[2.5rem] border-2 border-white/10 shadow-xl"><Calendar className="w-12 h-12 text-blue-400" /><span className="text-6xl font-black">{activeSingleRace.date}</span></div><div className="flex items-center gap-4 text-white/60 text-3xl font-bold"><MapPin className="w-10 h-10" /><span>{activeSingleRace.location} • {activeSingleRace.region}</span></div></div>
                        <div className="pt-10 flex gap-6 justify-center">
                            <span className={`px-10 py-4 rounded-3xl text-3xl font-black uppercase shadow-lg ${activeSingleRace.type === 'Triathlon' ? 'bg-blue-600' : 'bg-orange-600'}`}>{activeSingleRace.type}</span>
                            {activeSingleRace.distance && <span className="px-10 py-4 bg-slate-700 rounded-3xl text-3xl font-black uppercase tracking-widest shadow-lg">{activeSingleRace.distance}</span>}
                        </div>
                    </div>
                    <div className="absolute bottom-10 left-0 right-0 text-center opacity-30 text-xl font-bold">www.milanotriathlonteam.com</div>
                </div>
            )}
        </div>
    </div>
  );
};

export default DashboardPage;
