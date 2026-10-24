import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getTeamWorkouts, TeamWorkout } from '../lib/mttWorkouts';
import { Calendar, Waves, Bike, Activity, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';

export default function TeamWorkoutsPage() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<TeamWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, 'swim' | 'bike' | 'run'>>({});

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const data = await getTeamWorkouts('mtt');
      setWorkouts(data);
      // Set default tab for each workout
      const defaultTabs: Record<string, 'swim' | 'bike' | 'run'> = {};
      data.forEach(w => {
        defaultTabs[w.id] = 'run';
      });
      setActiveTab(defaultTabs);
    } catch (error) {
      console.error('Errore caricamento allenamenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisciplineIcon = (discipline: string) => {
    if (discipline === 'swim') return <Waves className="w-4 h-4" />;
    if (discipline === 'bike') return <Bike className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getDisciplineColor = (discipline: string) => {
    if (discipline === 'swim') return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    if (discipline === 'bike') return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-12">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← Torna alla Dashboard
          </button>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Allenamenti Settimanali MTT</h1>
          <p className="text-slate-600">Storico degli allenamenti inviati via Telegram</p>
        </div>

        {workouts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Nessun allenamento ancora</h3>
            <p className="text-slate-600">Gli allenamenti settimanali appariranno qui dopo il primo invio</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workouts.map((workout) => (
              <div key={workout.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
                  className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-slate-900">{workout.content.title}</h3>
                      <p className="text-sm text-slate-600">
                        Settimana {workout.week_number} - {workout.year} • Inviato {new Date(workout.sent_at!).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>
                  {expandedWorkout === workout.id ? <ChevronUp /> : <ChevronDown />}
                </button>

                {expandedWorkout === workout.id && (
                  <div className="border-t border-slate-200">
                    <div className="p-6">
                      <p className="text-slate-700 mb-6">{workout.content.intro}</p>

                      {/* Tabs discipline */}
                      <div className="flex gap-2 mb-6">
                        {(['swim', 'bike', 'run'] as const).map((disc) => (
                          <button
                            key={disc}
                            onClick={() => setActiveTab({ ...activeTab, [workout.id]: disc })}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                              activeTab[workout.id] === disc
                                ? getDisciplineColor(disc)
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {getDisciplineIcon(disc)}
                            {disc === 'swim' ? 'Nuoto' : disc === 'bike' ? 'Bici' : 'Corsa'}
                          </button>
                        ))}
                      </div>

                      {/* Content per disciplina */}
                      {workout.content[activeTab[workout.id]]?.map((block, idx) => (
                        <div key={idx} className="mb-6 bg-slate-50 rounded-xl p-4">
                          <h4 className="font-bold text-slate-900 mb-2">{block.title}</h4>
                          {block.duration && <p className="text-sm text-slate-600 mb-3">Durata: {block.duration}</p>}
                          
                          {block.warmup && block.warmup.length > 0 && (
                            <div className="mb-3">
                              <p className="font-semibold text-sm text-slate-700 mb-1">Riscaldamento</p>
                              <ul className="space-y-1">
                                {block.warmup.map((item, i) => (
                                  <li key={i} className="text-sm text-slate-600">• {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="mb-3">
                            <p className="font-semibold text-sm text-slate-700 mb-1">Parte principale</p>
                            <ul className="space-y-1">
                              {block.main.map((item, i) => (
                                <li key={i} className="text-sm text-slate-600">• {item}</li>
                              ))}
                            </ul>
                          </div>

                          {block.cooldown && block.cooldown.length > 0 && (
                            <div className="mb-3">
                              <p className="font-semibold text-sm text-slate-700 mb-1">Defaticamento</p>
                              <ul className="space-y-1">
                                {block.cooldown.map((item, i) => (
                                  <li key={i} className="text-sm text-slate-600">• {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {block.tips && block.tips.length > 0 && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                              <p className="font-semibold text-sm text-blue-900 mb-1">Consigli</p>
                              <ul className="space-y-1">
                                {block.tips.map((item, i) => (
                                  <li key={i} className="text-sm text-blue-800">• {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Suggerimenti adattamento */}
                      <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <h4 className="font-bold text-amber-900 mb-2">Come adattare in base alle tue capacità</h4>
                        <div className="space-y-2 text-sm text-amber-800">
                          <p><strong>FTP:</strong> {workout.content.adaptation_tips.ftp}</p>
                          <p><strong>VO2max:</strong> {workout.content.adaptation_tips.vo2max}</p>
                          <p><strong>Andature/Velocità:</strong> {workout.content.adaptation_tips.pace}</p>
                        </div>
                      </div>

                      {/* Immagini */}
                      {workout.images && workout.images.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Immagini
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {workout.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={img.url}
                                alt={img.caption || `Allenamento ${idx + 1}`}
                                className="w-full rounded-lg border border-slate-200"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-6 pt-6 border-t border-slate-200">
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{workout.content.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
