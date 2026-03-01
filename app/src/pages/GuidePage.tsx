/**
 * MTT Season Planner 2026 - User Guide
 * Author: Stefano Bonfanti
 */
import React from 'react';
import { BookOpen, Download, ChevronRight, CheckCircle, Map as MapIcon, Users, LayoutDashboard, RefreshCw, Lock } from 'lucide-react';

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
            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase leading-tight">Guida Utente</h1>
            <p className="text-slate-500 font-bold text-sm">Tutto quello che devi sapere sul Season Planner 2026</p>
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
        {/* SEZIONE 1 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
              <ChevronRight className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">1. Navigazione e Struttura</h2>
          </div>
          <p className="text-slate-600 font-medium leading-relaxed mb-8">
            L'app è stata progettata per essere intuitiva e veloce. Le sezioni principali sono accessibili tramite l'header superiore:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <LayoutDashboard className="w-6 h-6 text-blue-500 mb-4" />
              <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Dashboard</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">La tua area personale per cercare gare, gestire obiettivi e costi.</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <Users className="w-6 h-6 text-emerald-500 mb-4" />
              <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Team</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">Visualizza i piani di tutti i compagni del team raggruppati per mese.</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <CheckCircle className="w-6 h-6 text-rose-500 mb-4" />
              <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Profilo</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">Conferma la tua identità e gestisci le tue credenziali di accesso.</p>
            </div>
          </div>
        </section>

        {/* SEZIONE 2 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
              <ChevronRight className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">2. Il Calendario del Team</h2>
          </div>
          <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100">
            <p className="text-slate-700 font-bold leading-relaxed mb-6">
              Questa è l'anima social del progetto MTT. In questa sezione:
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                <div className="mt-1 bg-emerald-500 rounded-full p-1 text-white"><CheckCircle className="w-3 h-3" /></div>
                <span>Le gare sono raggruppate per <strong>Mese</strong> per facilitare la pianificazione a lungo termine.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                <div className="mt-1 bg-emerald-500 rounded-full p-1 text-white"><CheckCircle className="w-3 h-3" /></div>
                <span>Sotto ogni gara trovi i <strong>Nomi Completi</strong> degli atleti MTT iscritti.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                <div className="mt-1 bg-emerald-500 rounded-full p-1 text-white"><CheckCircle className="w-3 h-3" /></div>
                <span>Usa il tasto <strong>"+ Partecipa"</strong> per aggiungerti istantaneamente a una gara scelta dai tuoi compagni.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* SEZIONE 3 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
              <ChevronRight className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">3. Dashboard Personale</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="shrink-0 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 h-fit">
                  <RefreshCw className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 uppercase text-xs mb-1">Ricerca Ultra-Veloce</h4>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed">Filtra per Mese, Distanza o Sport. La ricerca è istantanea e ottimizzata per non bloccare mai l'interfaccia.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 h-fit">
                  <MapIcon className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 uppercase text-xs mb-1">Mappa Stabile</h4>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed">Visualizza la distribuzione geografica delle gare. Clicca sui marcatori per dettagli completi e link alla scheda FITRI.</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-black uppercase text-xs mb-4 text-blue-400">Aggiornamenti</h4>
                <p className="text-sm font-bold leading-relaxed mb-4">
                  Il calendario si aggiorna automaticamente ogni <strong>Lunedì mattina alle 00:00</strong>.
                </p>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed italic">
                  Non è richiesto alcun intervento manuale per avere le ultime gare FITRI caricate nel sistema.
                </p>
              </div>
              <RefreshCw className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 rotate-12" />
            </div>
          </div>
        </section>

        {/* FOOTER GUIDA */}
        <section className="pt-12 border-t border-slate-200">
          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-slate-800 p-3 rounded-2xl text-white">
                <Lock className="w-5 h-5" />
              </div>
              <p className="text-xs font-black text-slate-700 uppercase tracking-tight">Problemi di accesso? Usa il reset password.</p>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">MTT Milano Triathlon Team • 2026</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GuidePage;
