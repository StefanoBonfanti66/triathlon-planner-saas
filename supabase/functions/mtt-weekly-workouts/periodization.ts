export type MacroPhase = 'base' | 'build' | 'peak' | 'transition'

export interface SkeletonSession {
  discipline: 'swim' | 'bike' | 'run'
  title: string
  duration: string
  focus: string
  intensity: string
  mainOutline: string[]
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

export function getMacroPhase(date: Date): MacroPhase {
  const m = date.getMonth()
  if (m >= 10 || m <= 1) return 'base'
  if (m === 2 || m === 3) return 'build'
  if (m >= 4 && m <= 7) return 'peak'
  return 'transition'
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

function easySession(
  discipline: SkeletonSession['discipline'],
  title: string,
  duration: string,
  focus: string,
  main: string[],
  recovery: boolean,
): SkeletonSession {
  return {
    discipline,
    title: recovery ? `${title} (scarico)` : title,
    duration: scaled(duration, recovery),
    focus,
    intensity: 'RPE 3-4 su 10, conversazione possibile',
    mainOutline: recovery ? ['Volume ridotto del ~35%', 'Tutto facile, zero fatica percepita'] : main,
  }
}

function buildSessions(phase: MacroPhase, weekInMeso: number, isRecovery: boolean): SkeletonSession[] {
  const hard = !isRecovery && weekInMeso === 3

  if (phase === 'base') {
    return [
      easySession('swim', 'Nuoto - Tecnica + fondamenta', '60min', 'tecnica e catch', [
        'Riscaldamento 400m misto con tavoletta',
        '4x50m drill (bipodalico, bilanciato)',
        '6-8x100m a ritmo costante (15" rec)',
        '200m pull con palette',
        'Defaticamento 200m sciolti',
      ], isRecovery),
      easySession('swim', 'Nuoto - Aerobico continuato', '60min', 'respirazione e volume', [
        '300m sciolti',
        '400-600m continui a ritmo facile con boe',
        '4x75m variazioni di ritmo (non massimali)',
        '200m molto facile',
      ], isRecovery),
      easySession('bike', 'Bici - Fondo aerobico', hard ? '90min' : weekInMeso >= 2 ? '75min' : '60min', 'fondo Z2', [
        'Riscaldamento 15min progressivo',
        `Principale: ${hard ? '90' : weekInMeso >= 2 ? '75' : '60'}min a ritmo aerobico (RPE 3-4)`,
        'Ultimi 10min leggermente più sostenuti',
        'Defaticamento 5min sciolti',
      ], isRecovery),
      easySession('bike', 'Bici - Fondo con variazioni', weekInMeso >= 2 ? '70min' : '60min', 'elasticità e rotazione', [
        '15min progressivo',
        `Principale: ${weekInMeso === 1 ? '40min' : '50-60min'} Z2 con 3x5min progressive`,
        '10min a ritmo libero',
        'Defaticamento 10min',
      ], isRecovery),
      easySession('run', 'Corsa - Fondo', hard ? '50min' : '40-45min', 'adattamento muscolare', [
        '10min camminata + corsa leggera + skip',
        `Principale: ${hard ? '35-40' : '30'}min corsa continua a ritmo confortevole`,
        '5-10min camminata + stretching',
      ], isRecovery),
      easySession('run', 'Corsa - Fondamenta + andature', '45min', 'tecnica di corsa', [
        '10min camminata/corsa',
        'Drill: skip, tallonate, cadence 4x20s',
        'Principale: 30min facile',
        '4x20s progressivi (non massimali)',
        '10min camminata + stretching',
      ], isRecovery),
    ]
  }

  if (phase === 'build') {
    const bikeReps = weekInMeso === 1 ? '3x10min' : weekInMeso === 2 ? '3x12min' : '4x10min'
    const runReps = weekInMeso === 1 ? '4x5min' : weekInMeso === 2 ? '5x5min' : '6x5min'
    return [
      easySession('swim', 'Nuoto - Lavoro di soglia', '60min', 'soglia respiratoria', [
        '400m misto riscaldamento',
        `${weekInMeso >= 2 ? '6' : '5'}x200m a ritmo costante sostenuto (15" rec)`,
        '4x50m veloci (10" rec)',
        '200m defaticamento',
      ], isRecovery),
      easySession('swim', 'Nuoto - Volume aerobico', '60min', 'resistenza', [
        '300m sciolti',
        '5x150m pull con palette (10" rec)',
        '4x100m misto a ritmo libero (15" rec)',
        '200m molto facile',
      ], isRecovery),
      {
        discipline: 'bike',
        title: isRecovery ? 'Bici - Recupero (scarico)' : 'Bici - Lavoro di soglia',
        duration: scaled(isRecovery ? '70min' : '90min', isRecovery),
        focus: 'soglia / FTP percettivo',
        intensity: isRecovery ? 'RPE 3-4' : 'RPE 6-7, fatica controllata',
        mainOutline: isRecovery
          ? ['Volume ridotto del ~35%', 'Tutto facile']
          : [
              '15min progressivo + 3x1min di attivazione',
              `Principale: ${bikeReps} a RPE 6-7 con 3min recupero facile`,
              '15min a ritmo aerobico',
              'Defaticamento 10min',
            ],
      },
      easySession('bike', 'Bici - Fondo attivo', weekInMeso >= 2 ? '80min' : '70min', 'resistenza di base', [
        '15min progressivo',
        'Principale: 45-55min Z2 con 2 blocchi da 10min a ritmo leggermente più sostenuto',
        'Defaticamento 10min',
      ], isRecovery),
      {
        discipline: 'run',
        title: isRecovery ? 'Corsa - Recupero (scarico)' : 'Corsa - Lavoro di soglia',
        duration: scaled(isRecovery ? '40min' : '50min', isRecovery),
        focus: 'soglia di corsa',
        intensity: isRecovery ? 'RPE 3-4' : 'RPE 6-7',
        mainOutline: isRecovery
          ? ['Volume ridotto del ~35%', 'Tutto facile, anche a camminare se serve']
          : [
              '15min riscaldamento facile con drill',
              `Principale: ${runReps} a RPE 6-7 con 2min di recupero camminata/corsa leggera`,
              '15min ritmo facile',
              '10min camminata + stretching',
            ],
      },
      easySession('run', 'Corsa - Fondo', '45-50min', 'adattamento', [
        '10min camminata/corsa',
        'Principale: 35min a ritmo conversazione',
        '10min camminata + stretching',
      ], isRecovery),
    ]
  }

  if (phase === 'peak') {
    const bikeRace = weekInMeso === 1 ? '2x15min' : weekInMeso === 2 ? '2x20min' : '3x15min'
    const runRaceMin = weekInMeso === 1 ? '20min' : weekInMeso === 2 ? '25min' : '30min'
    return [
      easySession('swim', 'Nuoto - Simulazione gara', '60min', 'ritmo gara in vasca', [
        '400m misto riscaldamento',
        `Principale: 800-1000m continui al ritmo previsto in gara`,
        '6x25m sprint in acqua (non massimali)',
        '200m defaticamento',
      ], isRecovery),
      easySession('swim', 'Nuoto - Velocità + tecnica', '50min', 'scatti e catch', [
        '300m sciolti',
        '8x50m veloci (15" rec)',
        '4x100m tecnica con tavoletta',
        '200m molto facile',
      ], isRecovery),
      {
        discipline: 'bike',
        title: isRecovery ? 'Bici - Mantenimento (scarico)' : 'Bici - Simulazione ritmo gara',
        duration: scaled(isRecovery ? '60min' : '90min', isRecovery),
        focus: 'ritmo gara / forza specifica',
        intensity: isRecovery ? 'RPE 3-4' : 'RPE 7-8, specifico gara',
        mainOutline: isRecovery
          ? ['Volume ridotto, intensità solo adattativa']
          : [
              '20min progressivo con 2x1min di attivazione',
              `Principale: ${bikeRace} al ritmo gara previsto (RPE 7-8) con 5min facili`,
              '15min a ritmo aerobico',
              'Defaticamento 10min',
            ],
      },
      easySession('bike', 'Bici - Fondo con ritmo', '70min', 'resistenza', [
        '15min progressivo',
        'Principale: 40min Z2 con 2x8min a ritmo sostenuto',
        'Defaticamento 10min',
      ], isRecovery),
      {
        discipline: 'run',
        title: isRecovery ? 'Corsa - Mantenimento (scarico)' : 'Corsa - Ritmo gara',
        duration: scaled(isRecovery ? '40min' : '50min', isRecovery),
        focus: 'ritmo gara',
        intensity: isRecovery ? 'RPE 3-4' : 'RPE 7-8',
        mainOutline: isRecovery
          ? ['Volume ridotto del ~35%', 'Tutto facile']
          : [
              '15min riscaldamento facile',
              `Principale: ${runRaceMin} al ritmo gara previsto con 5min facili (x2 se possibile)`,
              '10min ritmo facile',
              '10min camminata + stretching',
            ],
      },
      easySession('run', 'Corsa - Fondamenta + brick', '45min', 'recupero attivo', [
        '10min camminata/corsa',
        'Principale: 30min facile (ideale dopo uscita bici)',
        '4x20s progressivi',
        '10min camminata + stretching',
      ], isRecovery),
    ]
  }

  return [
    easySession('swim', 'Nuoto - Tecnica e divertimento', '50min', 'tecnica', [
      '300m misto facile',
      'Drill a piacere + 4x50m stile vario',
      '4x75m a ritmo libero divertito',
      '200m sciolti',
    ], isRecovery),
    easySession('swim', 'Nuoto - Aerobico facile', '50min', 'mantenimento', [
      '200m sciolti',
      '300-400m continui a ritmo facile',
      '200m molto facile',
    ], isRecovery),
    easySession('bike', 'Bici - Uscita libero', '60min', 'gusto e recupero', [
      'Riscaldamento libero',
      'Uscita a ritmo piacevole, RPE 3-5, senza obiettivi',
      'Defaticamento libero',
    ], isRecovery),
    easySession('bike', 'Bici - Tappe brevi', '45min', 'mantenimento', [
      '20min facile',
      '2x10min leggermente più sostenuti',
      '10min facili',
    ], isRecovery),
    easySession('run', 'Corsa - Facile / trail', '40min', 'piazzere', [
      '10min camminata/corsa',
      '25min a ritmo libero su terreno morbido',
      '5min camminata',
    ], isRecovery),
    easySession('run', 'Corsa - Andature e sprint', '35min', 'forma', [
      '10min facile con drill',
      '6x20s sprint con recupero completo',
      '10min facile + stretching',
    ], isRecovery),
  ]
}

export function buildWeekSkeleton(date: Date): WeekSkeleton {
  const macroPhase = getMacroPhase(date)
  const { weekInMeso, isRecovery } = getMesoWeek(date)
  const progression = isRecovery
    ? 'Settimana di scarico (4a del mesociclo): volume -35%, tutto facile'
    : `Settimana ${weekInMeso} di 4 del mesociclo: ${weekInMeso === 1 ? 'avvio, carico contenuto' : weekInMeso === 2 ? 'progressione, carico medio' : 'picco del mesociclo, carico massimo'}`

  return {
    macroPhase,
    phaseLabel: PHASE_LABELS[macroPhase],
    weekInMeso,
    isRecovery,
    mesoProgression: progression,
    sessions: buildSessions(macroPhase, weekInMeso, isRecovery),
    weeklyNotes: [
      'Adatta sempre intensità e volumi alle tue sensazioni',
      'Allenamenti non personalizzati: pensati per amatori 30-60 anni',
      isRecovery
        ? 'Settimana di scarico: recupera bene, dormi e idratati'
        : 'Se stanco, riduci il volume piuttosto che saltare tutto',
    ],
  }
}
