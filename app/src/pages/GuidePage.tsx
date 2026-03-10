/**
 * Race Planner 2026 - User Guide (v6.1)
 * Author: Stefano Bonfanti
 */
import React from 'react';
import { BookOpen, Download, ChevronRight, CheckCircle, Map as MapIcon, Users, LayoutDashboard, RefreshCw, Lock, Shield, Share2, Smartphone, Database } from 'lucide-react';

const GuidePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* HEADER GUIDA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-slate-200 pb-10">
        <div className="flex items-center gap-4">
          <div className="bg-rose-500 p-4 rounded-3xl text-white shadow-lg">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase leading-tight">Guida Utente v6.1</h1>
            <p className="text-slate-500 font-bold text-sm">Race Planner SaaS - Enterprise Ready</p>
          </div>
        </div>
        <a 
          href="/GUIDA_UTENTE.pdf" 
          download 
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl w-fit"
        >
          <Download className="w-4 h-4" /> Scarica PDF
        </a>
      </div>

      <div className="space-y-16">
        {/* SEZIONE 1 - ACCESSO */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
              <ChevronRight className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">1. Accesso e Onboarding</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <Lock className="w-6 h-6 text-blue-500 mb-4" />
              <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Join Code</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">Usa il codice unico del tuo team per collegarti istantaneamente durante la registrazione.</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <Smartphone className="w-6 h-6 text-emerald-500 mb-4" />
              <h3 className="font-black text-slate-800 uppercase text-xs mb-2">PWA Branding</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">Installa l'app per avere icona, nome e colori personalizzati con il logo del tuo team.</p>
            </div>
          </div>
        </section>

        {/* SEZIONE 2 - DASHBOARD E DETTAGLI */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-rose-100 p-2 rounded-xl text-rose-600">
              <ChevronRight className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">2. Dashboard e Dettaglio Gara</h2>
          </div>
          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
            <p className="text-slate-700 font-bold leading-relaxed mb-6">
              La nuova scheda tecnica dinamica offre dati professionali per ogni evento:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-white rounded-2xl shadow-sm">
                <div className="mt-1 bg-rose-500 rounded-full p-1 text-white"><RefreshCw className="w-3 h-3" /></div>
                <div>
                  <h4 className="font-black text-slate-800 uppercase text-[10px]">Real-time MyFITri</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Regolamenti, orari di partenza e descrizioni dei percorsi aggiornati via API.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-2xl shadow-sm">
                <div className="mt-1 bg-emerald-500 rounded-full p-1 text-white"><MapIcon className="w-3 h-3" /></div>
                <div>
                  <h4 className="font-black text-slate-800 uppercase text-[10px]">Mappe Interattive</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Localizzazione geografica esatta basata su Leaflet.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SEZIONE 3 - TEAM E SOCIAL */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
              <ChevronRight className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">3. Calendario Team e Social Hub</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <Users className="w-6 h-6 text-blue-500 mb-4" />
              <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Coordination</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">Vedi chi partecipa per organizzare carpooling e hotel.</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <Share2 className="w-6 h-6 text-rose-500 mb-4" />
              <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Dynamic Links</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">Ogni gara ha il suo URL. Condividilo su Telegram con un click.</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <Smartphone className="w-6 h-6 text-emerald-500 mb-4" />
              <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Social Cards</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">Generazione automatica card "Athlete of the Month" per Instagram.</p>
            </div>
          </div>
        </section>

        {/* SEZIONE 4 - AMMINISTRAZIONE */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-slate-100 p-2 rounded-xl text-slate-600">
              <ChevronRight className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">4. Gerarchia Admin</h2>
          </div>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <h4 className="font-black uppercase text-xs text-amber-400">Team Leader</h4>
                </div>
                <ul className="space-y-3 text-xs text-slate-300 font-bold">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Gestione Atleti & Iscrizioni
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Export Excel per Portale FITRI
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Generazione Social Cards
                  </li>
                </ul>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <h4 className="font-black uppercase text-xs text-blue-400">Super Admin</h4>
                </div>
                <p className="text-xs text-slate-300 font-bold leading-relaxed">
                  Controllo globale su tutti i team del sistema e gestione permessi avanzata per i leader.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SEZIONE 5 - SICUREZZA */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
              <ChevronRight className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">5. Automazioni e Sicurezza</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="shrink-0 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 h-fit">
                <RefreshCw className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 uppercase text-xs mb-1">Weekly Sync</h4>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">Aggiornamento automatico calendario FITRI ogni Lunedì alle 00:00.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 h-fit">
                <Database className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 uppercase text-xs mb-1">Disaster Recovery</h4>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">3 livelli di protezione: Backup GitHub, Soft Delete e Team Export.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER GUIDA */}
        <section className="pt-12 border-t border-slate-200">
          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-xs font-black text-slate-700 uppercase tracking-tight">Progettato da Stefano Bonfanti per la tua stagione 2026.</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Race Planner v6.1 • SaaS</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GuidePage;
