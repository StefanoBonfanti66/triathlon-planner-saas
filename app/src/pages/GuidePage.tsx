/**
 * Race Planner 2026 - User & Admin Guide (v6.3.3)
 * Author: Stefano Bonfanti
 */
import React, { useState, useEffect } from 'react';
import { BookOpen, Download, ChevronRight, CheckCircle, Users, LayoutDashboard, RefreshCw, Lock, Shield, Share2, Smartphone, Database, Mail, Key, Timer, Zap } from 'lucide-react';
import { supabase } from '../supabaseClient'; // Assicurati che supabase sia importato correttamente

const GuidePage: React.FC = () => {
  const [, setIsAthlete] = useState(true); // Default to athlete view
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch profile to check admin status
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_team_admin, is_super_admin, email')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
          setIsAthlete(true); // Assume athlete if role cannot be determined
          setIsAdmin(false);
        } else {
          // Check for team admin, super admin, or specific admin email
          const isAdminUser = profile?.is_team_admin || profile?.is_super_admin || profile?.email === 'bonfantistefano4@gmail.com';
          setIsAdmin(isAdminUser);
          setIsAthlete(!isAdminUser);
        }
      } else {
        // No session, assume athlete or not logged in, default to athlete view for guide
        setIsAthlete(true);
        setIsAdmin(false);
      }
    };

    checkUserRole();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* HEADER GUIDA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-slate-200 pb-10">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-lg">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase leading-tight">Guida Integrata v6.3.3</h1>
            <p className="text-slate-500 font-bold text-sm">Race Planner SaaS • Pro Federal Standards</p>
          </div>
        </div>
        <div className="flex gap-2">
            <a 
            href="/GUIDA_UTENTE.pdf" 
            download 
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
            >
            <Download className="w-4 h-4" /> Template Utente
            </a>
            {isAdmin && ( // Conditionally render Admin and Onboarding guides for Admins
              <>
                <a 
                href="/GUIDA_ADMIN.pdf" 
                download 
                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
                >
                <Download className="w-4 h-4" /> Template Admin
                </a>
                <a 
                href="/GUIDA_ONBOARDING.pdf" 
                download 
                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl"
                >
                <Download className="w-4 h-4" /> Template Onboarding
                </a>
              </>
            )}
        </div>
      </div>

      <div className="space-y-16">
        {/* SEZIONE 1 - ACCESSO & RECOVERY */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
              <ChevronRight className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">1. Accesso e Ripristino Account</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <Key className="w-6 h-6 text-blue-500 mb-4" />
              <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Password Dimenticata</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                Usa il link "Password dimenticata?" nella pagina di login. Riceverai un'email con un link sicuro. 
                <strong> Nota:</strong> Il link ti riporterà automaticamente alla maschera di inserimento della nuova password.
              </p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <Lock className="w-6 h-6 text-emerald-500 mb-4" />
              <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Join Code (Onboarding)</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                Per registrarti, richiedi il <strong>Codice Squadra</strong> al tuo Team Leader. 
                Questo codice collega istantaneamente il tuo nuovo account al database del tuo team.
              </p>
            </div>
          </div>
        </section>

        {/* SEZIONE 2 - ANAGRAFICA FEDERALE */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
              <ChevronRight className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">2. Gestione Licenze e Certificati</h2>
          </div>
          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h4 className="font-black text-slate-800 uppercase text-xs mb-4 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> Standard Federali
                    </h4>
                    <ul className="space-y-3 text-[11px] text-slate-500 font-bold">
                        <li>• <strong>Doppia Licenza:</strong> Campi separati per Tessera FITRI e Tessera FCI.</li>
                        <li>• <strong>Certificato Medico:</strong> Alert visivi (rosso) quando la data è scaduta.</li>
                        <li>• <strong>Sorting Professionale:</strong> Visualizzazione "COGNOME Nome" in ordine alfabetico.</li>
                    </ul>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200">
                    <Database className="w-6 h-6 text-blue-500 mb-4" />
                    <h4 className="font-black text-slate-800 uppercase text-xs mb-2">Integrazione MyFITri</h4>
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                        Le pagine di dettaglio gara scaricano orari, regolamenti e percorsi direttamente dai server federali in tempo reale.
                    </p>
                </div>
            </div>
          </div>
        </section>

        {/* SEZIONE 3 - DASHBOARD & SOCIAL */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-rose-100 p-2 rounded-xl text-rose-600">
              <ChevronRight className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">3. Dashboard e Social Hub</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <LayoutDashboard className="w-6 h-6 text-blue-500 mb-4" />
              <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Smart Filters</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">Filtra le gare per regione, specialità (Triathlon, Duathlon, Cross) o distanza.</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <Share2 className="w-6 h-6 text-rose-500 mb-4" />
              <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Dynamic Links</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">Ogni gara ha un link unico (es. /race/123) da condividere su WhatsApp/Telegram.</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <Smartphone className="w-6 h-6 text-emerald-500 mb-4" />
              <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Social Hub</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">Genera in un click il ranking del mese per le storie Instagram del tuo team.</p>
            </div>
          </div>
        </section>

        {/* SEZIONE 4 - AREA ADMIN (SaaS God Mode) */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-slate-900 p-2 rounded-xl text-white">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">4. Pannello Admin & Super Admin</h2>
          </div>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <div className="flex items-center gap-2 mb-4 text-amber-400">
                  <Users className="w-5 h-5" />
                  <h4 className="font-black uppercase text-xs">Team Admin</h4>
                </div>
                <ul className="space-y-4 text-[11px] text-slate-300 font-bold">
                  <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> <span><strong>Invito Atleti:</strong> Crea profili e invia mail di attivazione in un colpo solo.</span></li>
                  <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> <span><strong>Export Federale:</strong> Scarica l'Excel pronto per il portale iscrizioni FITRI.</span></li>
                  <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> <span><strong>Alert Scadenze:</strong> Monitora i certificati medici di tutto il team.</span></li>
                </ul>
              </div>
              <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                <div className="flex items-center gap-2 mb-4 text-blue-400">
                  <Shield className="w-5 h-5" />
                  <h4 className="font-black uppercase text-xs">Super Admin (God Mode)</h4>
                </div>
                <p className="text-[11px] text-slate-400 font-bold leading-relaxed mb-6">
                  Gestione multi-team, configurazione colori/logo per ogni squadra, reset codici invito e monitoraggio log di sistema.
                </p>
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                    <Mail className="w-4 h-4 text-blue-400" />
                    <span className="text-[9px] font-black uppercase text-blue-300">Auth: bonfantistefano4@gmail.com</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SEZIONE 5 - MANUTENZIONE TECNICA */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
              <ChevronRight className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">5. Infrastruttura & Backup</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="shrink-0 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 h-fit">
                <RefreshCw className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 uppercase text-xs mb-1">Weekly FITRI Sync</h4>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">Sync automatico del calendario nazionale ogni Lunedì via GitHub Actions.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 h-fit">
                <Database className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 uppercase text-xs mb-1">Data Sovereignty</h4>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">Database Supabase con RLS (Row Level Security) per isolamento totale dei dati tra i team.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SEZIONE 6 - TEST FTP */}
        <section id="test-ftp">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-100 p-2 rounded-xl text-purple-600">
              <Timer className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">6. Test FTP — Come misurare la tua forma</h2>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-black text-slate-800 uppercase text-xs mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-purple-500" /> Cos'è l'FTP</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">
                  L'<strong>Functional Threshold Power</strong> (o ritmo soglia) è la potenza/velocità media che puoi mantenere per 1 ora.
                  È il numero più importante per calibrare i tuoi allenamenti: definisce le zone di intensità e ti permette di monitorare i progressi.
                </p>
              </div>
              <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
                <h4 className="font-black text-purple-800 uppercase text-xs mb-2">Perché farlo ora</h4>
                <p className="text-[11px] text-purple-700 font-bold leading-relaxed">
                  Gli allenamenti che ricevi via Telegram usano zone di intensità. Senza un test FTP, lavori "a sensazione".
                  Con il test, ogni seduta diventa precisa e misurabile.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-8">
              <h3 className="font-black text-slate-800 uppercase text-xs mb-4">Protocollo 20 minuti (Allen & Coggan)</h3>
              <div className="space-y-4">
                {[
                  { step: '1', title: 'Riscaldamento (15-20 min)', desc: 'Pedala/corri facile per scaldarti bene. Includi 3-4 sprint brevi (30-60 secondi) per preparare le gambe.' },
                  { step: '2', title: 'Attivazione (5 min)', desc: '5 minuti a ritmo "hard" ma sostenibile. Senti le gambe pronte.' },
                  { step: '3', title: 'Il test (20 min)', desc: '20 minuti al massimo sforzo sostenibile. Parti conservativo: i primi 5 minuti devono sembrarti "troppo facile". L\'ultimo minuto dovresti soffrire.' },
                  { step: '4', title: 'Defaticamento (10-15 min)', desc: 'Ritorno calmo al recupero attivo.' },
                ].map(item => (
                  <div key={item.step} className="flex gap-4">
                    <div className="shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-black text-xs">{item.step}</div>
                    <div>
                      <div className="font-black text-slate-800 text-xs">{item.title}</div>
                      <p className="text-xs text-slate-500 font-bold leading-relaxed mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-8 mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-black text-slate-800 uppercase text-xs mb-3">Calcolo FTP</h4>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <p className="text-xs text-slate-600 font-bold mb-2">FTP = media 20 minuti × 0,95</p>
                  <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                    Esempio: se la media dei tuoi 20 minuti è 250W, il tuo FTP è circa 237W.
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-black text-slate-800 uppercase text-xs mb-3">Zone di intensità</h4>
                <div className="space-y-2">
                  {[
                    { zone: 'Z1', name: 'Recupero', range: '≤ 55% FTP', color: 'bg-blue-100 text-blue-700' },
                    { zone: 'Z2', name: 'Aerobico', range: '56-75%', color: 'bg-emerald-100 text-emerald-700' },
                    { zone: 'Z3', name: 'Tempo', range: '76-90%', color: 'bg-amber-100 text-amber-700' },
                    { zone: 'Z4', name: 'Soglia', range: '91-105%', color: 'bg-orange-100 text-orange-700' },
                    { zone: 'Z5', name: 'VO2max', range: '106-120%', color: 'bg-red-100 text-red-700' },
                  ].map(z => (
                    <div key={z.zone} className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${z.color}`}>{z.zone}</span>
                      <span className="text-xs font-bold text-slate-600">{z.name}</span>
                      <span className="text-[10px] font-bold text-slate-400">{z.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-8 mt-8 flex items-center justify-between">
              <p className="text-xs text-slate-400 font-bold">Hai fatto il test? Comunica il tuo risultato all'admin per calibrare i prossimi allenamenti.</p>
              <a href="https://t.me/+7nNv9lvry700NTE0" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-purple-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg">
                Comunica all'admin
              </a>
            </div>
          </div>
        </section>

        {/* FOOTER GUIDA */}
        <section className="pt-12 border-t border-slate-200">
          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-xs font-black text-slate-700 uppercase tracking-tight">Architettura e Sviluppo: Stefano Bonfanti</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Race Planner v6.3.3 • SaaS Edition</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GuidePage;
