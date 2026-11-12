export type MacroPhase = 'base' | 'build' | 'peak' | 'transition'
export type Discipline = 'swim' | 'bike' | 'run' | 'strength'
export type Weekday =
  | 'Lunedì'
  | 'Martedì'
  | 'Mercoledì'
  | 'Giovedì'
  | 'Venerdì'
  | 'Sabato'
  | 'Domenica'

export interface SkeletonSession {
  discipline: Discipline
  title: string
  duration: string
  focus: string
  intensity: string
  mainOutline: string[]
  day?: Weekday
  optional?: boolean
  brickRun?: { duration: string; main: string[] }
}

export interface WeekSkeleton {
  macroPhase: MacroPhase
  phaseLabel: string
  weekInMeso: number
  isRecovery: boolean
  mesoProgression: string
  sessions: SkeletonSession[]
  weeklyNotes: string[]
}

const PHASE_LABELS: Record<MacroPhase, string> = {
  base: 'Base',
  build: 'Build',
  peak: 'Peak / Gara',
  transition: 'Transizione',
}

// Ottobre–novembre sono il passaggio stagionale: settembre–ottobre è recupero
// attivo, novembre apre il blocco invernale (forza + tecnica + base aerobica).
// Dicembre–febbraio è base, marzo–aprile build, maggio–agosto peak.
export function getMacroPhase(date: Date): MacroPhase {
  const m = date.getMonth()
  if (m === 10) return 'transition'
  if (m === 11 || m <= 1) return 'base'
  if (m === 2 || m === 3) return 'build'
  if (m >= 4 && m <= 7) return 'peak'
  return 'transition'
}

export function getPhaseLabel(phase: MacroPhase, date: Date): string {
  if (phase === 'transition' && date.getMonth() === 10) return 'Forza e tecnica'
  return PHASE_LABELS[phase]
}

export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function dateFromIsoWeek(year: number, week: number): Date {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7))
  const dow = simple.getUTCDay() || 7
  if (dow > 4) simple.setUTCDate(simple.getUTCDate() + 4 - dow)
  else simple.setUTCDate(simple.getUTCDate() - (dow - 4))
  return simple
}

export function getMesoWeek(date: Date): { weekInMeso: number; isRecovery: boolean } {
  const weekInMeso = ((isoWeekNumber(date) - 1) % 4) + 1
  return { weekInMeso, isRecovery: weekInMeso === 4 }
}

function scaled(duration: string, recovery: boolean): string {
  if (!recovery) return duration
  const match = duration.match(/^(\d+)\s*min$/)
  if (!match) return duration
  return `${Math.round((parseInt(match[1], 10) * 0.65) / 5) * 5}min`
}

interface SessionInput {
  discipline: Discipline
  title: string
  duration: string
  focus: string
  intensity: string
  main: string[]
  day?: Weekday
  optional?: boolean
  recoveryMain?: string[]
  brickRun?: { duration: string; main: string[] }
}

function makeSession(input: SessionInput, recovery: boolean): SkeletonSession {
  return {
    discipline: input.discipline,
    title: recovery ? `${input.title} (scarico)` : input.title,
    duration: scaled(input.duration, recovery),
    focus: input.focus,
    intensity: recovery ? 'RPE 3-4 su 10, tutto facile' : input.intensity,
    mainOutline: recovery
      ? input.recoveryMain ?? ['Volume ridotto del ~35%', 'Tutto facile, zero fatica percepita']
      : input.main,
    ...(input.day ? { day: input.day } : {}),
    ...(input.optional ? { optional: true } : {}),
    ...(input.brickRun && !recovery ? { brickRun: input.brickRun } : {}),
  }
}

function strengthA(recovery: boolean, weeks = 3): SkeletonSession {
  const rounds = weeks === 2 ? '2 giri' : '3 giri'
  return makeSession({
    discipline: 'strength',
    title: 'Forza - Corpo libero (A)',
    duration: '40min',
    focus: 'forza generale e stabilità',
    intensity: 'RPE 5-6 su 10, tecnica pulita senza cedimento',
    day: 'Lunedì',
    main: [
      'Riscaldamento 5-10min: mobilità di anche, spalle e caviglie',
      `${rounds}: 12 squat a corpo libero, 10 affondi per lato, 10 piegamenti sulle braccia`,
      `${rounds}: 30" plank frontale, 20" plank laterale per lato, 15 ponti glutei`,
      'Recupero 60-90" tra i giri, respiro sempre controllato',
      'Defaticamento 5min: stretching di quadricipiti, femorali e petto',
    ],
    recoveryMain: [
      '2 giri leggeri invece di 3',
      'Solo mobilità e tecnica, nessun cedimento muscolare',
      'Stretching finale più lungo',
    ],
  }, recovery)
}

function strengthCircuit(recovery: boolean, weeks = 3): SkeletonSession {
  return makeSession({
    discipline: 'strength',
    title: 'Forza + corsa - Circuito (B)',
    duration: '45min',
    focus: 'forza funzionale e appoggio',
    intensity: 'RPE 6-7 su 10 sul circuito, corsa sempre controllata',
    day: 'Venerdì',
    main: [
      '10min di corsa facile + mobilità dinamica',
      `${weeks === 2 ? '2' : '3'} serie: 10 squat, 200m corsa progressiva, 10 affondi per lato, 200m corsa progressiva, 10 balzi, 100m scatto`,
      'Recupero 60-90" tra le serie, mai a secco',
      '5min defaticamento + stretching',
    ],
    recoveryMain: [
      '2 serie leggere invece di 3',
      'Corsa solo facile, nessuno scatto',
      'Defaticamento e stretching completi',
    ],
  }, recovery)
}

function swimTechnique(recovery: boolean, weeks = 3): SkeletonSession {
  return makeSession({
    discipline: 'swim',
    title: 'Nuoto - Tecnica e variazioni',
    duration: '60min',
    focus: 'tecnica, catch e sensibilità',
    intensity: 'RPE 4-6 su 10, mai a tutta',
    day: 'Mercoledì',
    main: [
      '400m sciolti misto',
      '8x50m tecnica (bipodalico, bilanciato, catch) rec 15"',
      '400m pull + 400m pinne + 400m libero continuo (oppure 10x100m rec 15")',
      '8x50m forti rec 20"',
      '100-200m dorso o remate per chiudere',
      'Totale: 2.300-2.500m',
    ],
    recoveryMain: [
      '400m sciolti + 4x50m tecnica',
      '400m pull facili + 4x100m aerobici rec 20"',
      '200m defaticamento',
      'Totale: ~1.500m',
    ],
  }, recovery)
}

function swimAerobic(recovery: boolean, weekInMeso: number): SkeletonSession {
  const reps = weekInMeso <= 2 ? '6x100m' : '8x100m'
  return makeSession({
    discipline: 'swim',
    title: 'Nuoto - Tecnica + aerobico',
    duration: '60min',
    focus: 'tecnica e volume aerobico',
    intensity: 'RPE 4-5 su 10, ritmo costante',
    day: 'Mercoledì',
    main: [
      '400m sciolti misto',
      '8x50m tecnica (bipodalico, bilanciato, catch) rec 15"',
      '400m pull con palette',
      `${reps} aerobico rec 15"`,
      '200m defaticamento',
      `Totale: ${weekInMeso <= 2 ? '2.000-2.200m' : '2.200-2.400m'}`,
    ],
  }, recovery)
}

function swimGroup(recovery: boolean): SkeletonSession {
  return makeSession({
    discipline: 'swim',
    title: 'Nuoto - Gruppo in piscina',
    duration: '60min',
    focus: 'seduta di gruppo con il coach',
    intensity: 'RPE 4-6 su 10, segui le indicazioni del coach',
    day: 'Giovedì',
    main: [
      'Seduta di gruppo in piscina: 60 minuti a disposizione',
      'Segui il lavoro proposto dal coach in vasca (tecnica e ritmo)',
      'Se il coach non è presente: 400m sciolti + 8x100m aerobico rec 15" + 200m defaticamento',
    ],
    recoveryMain: [
      'Seduta di gruppo in scarico: segui il coach e resta facile',
      'Nessuna serie forte, priorità a tecnica e recupero',
    ],
  }, recovery)
}

function runGroup(recovery: boolean): SkeletonSession {
  return makeSession({
    discipline: 'run',
    title: 'Corsa - Gruppo con il coach',
    duration: '60min',
    focus: 'qualità di corsa guidata dal coach',
    intensity: 'RPE 5-7 su 10, segui le indicazioni del coach',
    day: 'Martedì',
    main: [
      'Ritrovo serale con il gruppo: segui il lavoro proposto dal coach',
      'Se il coach non è presente: 1-2km riscaldamento + andature, poi 4x2km a ritmo medio rec 2min di corsa facile, 1km defaticamento',
      'Ritmo controllato: l\'obiettivo è la qualità, non la gara',
    ],
    recoveryMain: [
      'Seduta di gruppo in scarico: segui il coach e resta facile',
      'Nessuna serie forte, priorità a tecnica e recupero',
    ],
  }, recovery)
}

function runFondo(recovery: boolean, hard: boolean): SkeletonSession {
  return makeSession({
    discipline: 'run',
    title: 'Corsa - Fondo e andature',
    duration: '45min',
    focus: 'adattamento muscolare e tecnica',
    intensity: 'RPE 3-4 su 10, conversazione possibile',
    day: 'Martedì',
    main: [
      'Seduta in gruppo con il coach: segui il lavoro proposto',
      '10min camminata + corsa leggera + skip',
      `Principale: ${hard ? '35-40' : '30'}min corsa continua a ritmo confortevole`,
      '4x20s allunghi progressivi (non massimali)',
      '5-10min camminata + stretching',
    ],
  }, recovery)
}

function runLongOptional(recovery: boolean, km: string): SkeletonSession {
  return makeSession({
    discipline: 'run',
    title: 'Corsa - Lunga facile (facoltativa)',
    duration: '80min',
    focus: 'resistenza aerobica',
    intensity: 'RPE 3-4 su 10, ritmo chiacchierato',
    day: 'Domenica',
    optional: true,
    main: [
      `Corsa lunga easy ${km} in Z2, oppure riposo se sei stanco`,
      'Ritmo costante, nessuna forzatura: meglio fermarsi prima che esagerare',
      'Stretching completo a fine seduta',
    ],
    recoveryMain: [
      'Corsa facile 40-50min oppure riposo',
      'Solo se le gambe rispondono bene',
    ],
  }, recovery)
}

function bikeAerobic(recovery: boolean, hard: boolean, weekInMeso: number): SkeletonSession {
  const duration = hard ? '100min' : weekInMeso >= 2 ? '90min' : '75min'
  return makeSession({
    discipline: 'bike',
    title: 'Bici - Fondo Z2',
    duration,
    focus: 'fondo aerobico e forza specifica',
    intensity: 'RPE 3-4 su 10 (Z2), blocchi in piedi RPE 6',
    day: 'Sabato',
    main: [
      '15min riscaldamento progressivo',
      `Principale: ${duration.replace('min', '')}min outdoor in Z2, oppure 80-120min sui rulli a 80-90rpm`,
      'Inserisci 4-6 blocchi: 9min facile + 1min al massimo rapporto in piedi',
      'Defaticamento 10min',
    ],
  }, recovery)
}

function bikeWinter(recovery: boolean, weekInMeso: number): SkeletonSession {
  return makeSession({
    discipline: 'bike',
    title: 'Bici - Fondo Z2 con blocchi di forza',
    duration: weekInMeso >= 2 ? '120min' : '100min',
    focus: 'fondo aerobico e forza specifica',
    intensity: 'RPE 3-4 su 10 (Z2), blocchi in piedi RPE 6',
    day: 'Sabato',
    main: [
      '15min riscaldamento progressivo',
      `Principale: ${weekInMeso >= 2 ? '2-3h' : '100min'} outdoor in Z2 (RPE 3-4), oppure 80-120min sui rulli a 80-90rpm`,
      'Inserisci 4-6 blocchi: 9min facile + 1min al massimo rapporto in piedi',
      'Defaticamento 10min',
    ],
    recoveryMain: [
      '60-70min facili in Z2, senza blocchi di forza',
      'Cadenza agile, zero fatica',
    ],
  }, recovery)
}

function buildSessions(phase: MacroPhase, weekInMeso: number, isRecovery: boolean, month: number): SkeletonSession[] {
  const hard = !isRecovery && weekInMeso === 3

  // Novembre: blocco invernale. Luca lo chiama "transizione + base aerobica +
  // forza": 2 sedute di forza, 1 nuoto tecnica, 1 corsa qualità, 1 bici Z2,
  // più nuoto e corsa facoltativi.
  if (phase === 'transition' && month === 10) {
    return [
      strengthA(isRecovery),
      runGroup(isRecovery),
      swimTechnique(isRecovery),
      swimGroup(isRecovery),
      strengthCircuit(isRecovery, weekInMeso === 4 ? 2 : 3),
      bikeWinter(isRecovery, weekInMeso),
      runLongOptional(isRecovery, '12-15km'),
    ]
  }

  // Settembre–ottobre: recupero attivo post-stagione, nessuna forza.
  if (phase === 'transition') {
    return [
      makeSession({
        discipline: 'swim',
        title: 'Nuoto - Tecnica e divertimento',
        duration: '50min',
        focus: 'tecnica',
        intensity: 'RPE 3-5 su 10',
        day: 'Mercoledì',
        main: [
          '300m misto facile',
          'Drill a piacere + 4x50m stile vario',
          '4x75m a ritmo libero divertito',
          '200m sciolti',
        ],
      }, isRecovery),
      makeSession({
        discipline: 'run',
        title: 'Corsa - Facile / trail',
        duration: '40min',
        focus: 'recupero attivo',
        intensity: 'RPE 3-4 su 10',
        day: 'Martedì',
        main: [
          'Seduta in gruppo con il coach: segui il lavoro proposto',
          '10min camminata/corsa',
          '25min a ritmo libero su terreno morbido',
          '5min camminata',
        ],
      }, isRecovery),
      makeSession({
        discipline: 'bike',
        title: 'Bici - Uscita libera',
        duration: '60min',
        focus: 'gusto e recupero',
        intensity: 'RPE 3-5 su 10, senza obiettivi',
        day: 'Sabato',
        main: [
          'Riscaldamento libero',
          'Uscita a ritmo piacevole, senza obiettivi',
          'Defaticamento libero',
        ],
      }, isRecovery),
      swimGroup(isRecovery),
      makeSession({
        discipline: 'run',
        title: 'Corsa - Andature e sprint (facoltativa)',
        duration: '35min',
        focus: 'forma',
        intensity: 'RPE 5-6 su 10',
        day: 'Domenica',
        optional: true,
        main: [
          '10min facile con drill',
          '6x20s sprint con recupero completo',
          '10min facile + stretching',
        ],
      }, isRecovery),
    ]
  }

  if (phase === 'base') {
    return [
      strengthA(isRecovery),
      swimAerobic(isRecovery, weekInMeso),
      runFondo(isRecovery, hard),
      swimGroup(isRecovery),
      strengthCircuit(isRecovery, weekInMeso === 4 ? 2 : 3),
      bikeAerobic(isRecovery, hard, weekInMeso),
      runLongOptional(isRecovery, weekInMeso >= 2 ? '14-16km' : '12-14km'),
    ]
  }

  if (phase === 'build') {
    const bikeReps = weekInMeso === 1 ? '3x10min' : weekInMeso === 2 ? '3x12min' : '4x10min'
    const runReps = weekInMeso === 1 ? '4x5min' : weekInMeso === 2 ? '5x5min' : '6x5min'
    return [
      makeSession({
        discipline: 'swim',
        title: 'Nuoto - Lavoro di soglia',
        duration: '60min',
        focus: 'soglia respiratoria',
        intensity: 'RPE 6-7 su 10 nella parte principale',
        day: 'Mercoledì',
        main: [
          '400m misto riscaldamento',
          `${weekInMeso >= 2 ? '6' : '5'}x200m a ritmo costante sostenuto (15" rec)`,
          '4x50m veloci (10" rec)',
          '200m defaticamento',
        ],
      }, isRecovery),
      makeSession({
        discipline: 'run',
        title: 'Corsa - Lavoro di soglia',
        duration: '50min',
        focus: 'soglia di corsa',
        intensity: 'RPE 6-7 su 10',
        day: 'Martedì',
        main: [
          'Seduta in gruppo con il coach: segui il lavoro proposto',
          '15min riscaldamento facile con drill',
          `Principale: ${runReps} a RPE 6-7 con 2min di recupero camminata/corsa leggera`,
          '15min ritmo facile',
          '10min camminata + stretching',
        ],
      }, isRecovery),
      makeSession({
        discipline: 'strength',
        title: 'Forza - Mantenimento',
        duration: '40min',
        focus: 'forza generale e prevenzione',
        intensity: 'RPE 5-6 su 10, mai a cedimento',
        day: 'Venerdì',
        main: [
          '5-10min mobilità',
          '2-3 giri: 12 squat, 10 affondi per lato, 10 piegamenti, 30" plank',
          '10 ponti glutei per lato + stretching',
        ],
        recoveryMain: [
          '1-2 giri leggeri',
          'Solo mobilità e core',
        ],
      }, isRecovery),
      makeSession({
        discipline: 'bike',
        title: 'Bici - Lavoro di soglia',
        duration: '90min',
        focus: 'soglia / FTP percettivo',
        intensity: 'RPE 6-7 su 10, fatica controllata',
        day: 'Sabato',
        main: [
          '15min progressivo + 3x1min di attivazione',
          `Principale: ${bikeReps} a RPE 6-7 con 3min recupero facile`,
          '15min a ritmo aerobico',
          'Defaticamento 10min',
        ],
        brickRun: !isRecovery && weekInMeso >= 2
          ? {
              duration: '15min',
              main: [
                '15min corsa facile subito dopo la bici (transizione T2)',
                'Ritmo molto facile, solo per abituare le gambe alla corsa dopo la bici',
              ],
            }
          : undefined,
      }, isRecovery),
      swimGroup(isRecovery),
      makeSession({
        discipline: 'run',
        title: 'Corsa - Fondo (facoltativa)',
        duration: '45min',
        focus: 'adattamento',
        intensity: 'RPE 3-4 su 10',
        day: 'Domenica',
        optional: true,
        main: [
          '10min camminata/corsa',
          'Principale: 35min a ritmo conversazione',
          '10min camminata + stretching',
        ],
      }, isRecovery),
    ]
  }

  // Peak / gara
  const bikeRace = weekInMeso === 1 ? '2x15min' : weekInMeso === 2 ? '2x20min' : '3x15min'
  const runRaceMin = weekInMeso === 1 ? '20min' : weekInMeso === 2 ? '25min' : '30min'
  return [
    makeSession({
      discipline: 'swim',
      title: 'Nuoto - Simulazione gara',
      duration: '60min',
      focus: 'ritmo gara in vasca',
      intensity: 'RPE 6-7 su 10',
      day: 'Mercoledì',
      main: [
        '400m misto riscaldamento',
        'Principale: 800-1000m continui al ritmo previsto in gara',
        '6x25m sprint in acqua (non massimali)',
        '200m defaticamento',
      ],
    }, isRecovery),
    makeSession({
      discipline: 'run',
      title: 'Corsa - Ritmo gara',
      duration: '50min',
      focus: 'ritmo gara',
      intensity: 'RPE 7-8 su 10',
      day: 'Martedì',
      main: [
        'Seduta in gruppo con il coach: segui il lavoro proposto',
        '15min riscaldamento facile',
        `Principale: ${runRaceMin} al ritmo gara previsto con 5min facili (x2 se possibile)`,
        '10min ritmo facile',
        '10min camminata + stretching',
      ],
    }, isRecovery),
    makeSession({
      discipline: 'bike',
      title: 'Bici - Simulazione ritmo gara',
      duration: '90min',
      focus: 'ritmo gara / forza specifica',
      intensity: 'RPE 7-8 su 10, specifico gara',
      day: 'Sabato',
      main: [
        '20min progressivo con 2x1min di attivazione',
        `Principale: ${bikeRace} al ritmo gara previsto (RPE 7-8) con 5min facili`,
        '15min a ritmo aerobico',
        'Defaticamento 10min',
      ],
      brickRun: !isRecovery && weekInMeso <= 2
        ? {
            duration: '20min',
            main: [
              '20min corsa a ritmo gara (simula la frazione di corsa post-bici)',
              'RPE 7-8, concentrati sulla frequenza di pedalata e sulla corsa sciolta',
            ],
          }
        : undefined,
    }, isRecovery),
    swimGroup(isRecovery),
    makeSession({
      discipline: 'run',
      title: 'Corsa - Fondo (facoltativa)',
      duration: '45min',
      focus: 'recupero attivo',
      intensity: 'RPE 3-4 su 10',
      day: 'Domenica',
      optional: true,
      main: [
        '10min camminata/corsa',
        'Principale: 30min facile (ideale dopo uscita bici)',
        '4x20s progressivi',
        '10min camminata + stretching',
      ],
    }, isRecovery),
  ]
}

export function buildWeekSkeleton(date: Date): WeekSkeleton {
  const macroPhase = getMacroPhase(date)
  const phaseLabel = getPhaseLabel(macroPhase, date)
  const { weekInMeso, isRecovery } = getMesoWeek(date)
  const progression = isRecovery
    ? 'Settimana di scarico (4a del mesociclo): volume -35%, tutto facile'
    : `Settimana ${weekInMeso} di 4 del mesociclo: ${weekInMeso === 1 ? 'avvio, carico contenuto' : weekInMeso === 2 ? 'progressione, carico medio' : 'picco del mesociclo, carico massimo'}`

  return {
    macroPhase,
    phaseLabel,
    weekInMeso,
    isRecovery,
    mesoProgression: progression,
    sessions: buildSessions(macroPhase, weekInMeso, isRecovery, date.getMonth()),
    weeklyNotes: [
      'Struttura della settimana: 3 sedute obbligatorie (nuoto, bici, corsa) + 2 di forza; le sedute facoltative sono un extra',
      'Il giovedì è la seduta di gruppo in piscina: 60 minuti con il coach, seguite il lavoro proposto in vasca',
      'Il martedì sera la corsa è la seduta di gruppo con il coach, con il lavoro deciso da lui',
      'Le sedute di forza sono a corpo libero: nessuna attrezzatura, tecnica pulita e mai a cedimento',
      'Adatta sempre intensità e volumi alle tue sensazioni',
      'Allenamenti non personalizzati: pensati per amatori 30-60 anni',
      isRecovery
        ? 'Settimana di scarico: recupera bene, dormi e idratati'
        : 'Se stanco, riduci il volume piuttosto che saltare tutto',
    ],
  }
}
