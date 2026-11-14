import { assertEquals, assert } from 'jsr:@std/assert@1'
import {
  buildWeekSkeleton,
  dateFromIsoWeek,
  getMacroPhase,
  getMesoWeek,
  getPhaseLabel,
  isoWeekNumber,
} from './periodization.ts'

Deno.test('isoWeekNumber known dates', () => {
  assertEquals(isoWeekNumber(new Date(Date.UTC(2026, 0, 1))), 1)
  assertEquals(isoWeekNumber(new Date(Date.UTC(2026, 9, 28))), 44)
  assertEquals(isoWeekNumber(new Date(Date.UTC(2026, 11, 28))), 53)
})

Deno.test('dateFromIsoWeek roundtrip', () => {
  const d = dateFromIsoWeek(2026, 44)
  assertEquals(isoWeekNumber(d), 44)
  assertEquals(d.getUTCFullYear(), 2026)
})

Deno.test('macro phases by month (northern season)', () => {
  assertEquals(getMacroPhase(new Date(2026, 0, 15)), 'base')
  assertEquals(getMacroPhase(new Date(2026, 10, 15)), 'transition')
  assertEquals(getMacroPhase(new Date(2026, 2, 15)), 'build')
  assertEquals(getMacroPhase(new Date(2026, 3, 15)), 'build')
  assertEquals(getMacroPhase(new Date(2026, 5, 15)), 'peak')
  assertEquals(getMacroPhase(new Date(2026, 7, 15)), 'peak')
  assertEquals(getMacroPhase(new Date(2026, 8, 15)), 'transition')
  assertEquals(getMacroPhase(new Date(2026, 9, 5)), 'transition')
})

Deno.test('november label is forza e tecnica', () => {
  const nov = new Date(2026, 10, 15)
  assertEquals(getPhaseLabel('transition', nov), 'Forza e tecnica')
  assertEquals(getPhaseLabel('base', new Date(2026, 0, 15)), 'Base')
})

Deno.test('mesocycle: 4th week is recovery', () => {
  const w4 = getMesoWeek(dateFromIsoWeek(2026, 44))
  assertEquals(w4.weekInMeso, 4)
  assertEquals(w4.isRecovery, true)
  const w1 = getMesoWeek(dateFromIsoWeek(2026, 45))
  assertEquals(w1.weekInMeso, 1)
  assertEquals(w1.isRecovery, false)
})

Deno.test('november: 3+2 structure with variants', () => {
  for (const week of [45, 46]) {
    const s = buildWeekSkeleton(dateFromIsoWeek(2026, week))
    assertEquals(s.sessions.filter((x) => x.discipline === 'strength').length, 2, `week ${week} strength`)
    assertEquals(s.sessions.filter((x) => x.discipline === 'swim' && !x.optional).length, 1, `week ${week} swim`)
    assertEquals(s.sessions.filter((x) => x.discipline === 'run' && !x.optional).length, 1, `week ${week} run`)
    assertEquals(s.sessions.filter((x) => x.discipline === 'bike' && !x.optional).length, 2, `week ${week} bike`)
    assertEquals(s.sessions.filter((x) => x.optional).length, 6, `week ${week} optional`)
    assertEquals(s.sessions.filter((x) => x.day === 'Giovedì' && x.discipline === 'swim' && !x.optional).length, 1, `week ${week} group swim`)
    assertEquals(s.sessions.filter((x) => x.day === 'Giovedì' && x.title.includes('Tecnica') && x.optional).length, 1, `week ${week} thursday swim technique alternative`)
    assertEquals(s.sessions.filter((x) => x.day === 'Mercoledì' && x.discipline === 'swim').length, 0, `week ${week} no wednesday swim`)
    assertEquals(s.sessions.filter((x) => x.day === 'Mercoledì' && x.discipline === 'bike' && !x.optional).length, 1, `week ${week} wednesday bike`)
    const keys = s.sessions.map((x) => `${x.day}|${x.discipline}|${x.title}`)
    assertEquals(new Set(keys).size, keys.length, `week ${week} duplicates`)
  }
})

Deno.test('base: 3 mandatory + 2 strength + 1 optional', () => {
  for (const week of [2, 6]) {
    const s = buildWeekSkeleton(dateFromIsoWeek(2026, week))
    assertEquals(s.sessions.filter((x) => x.discipline === 'strength').length, 2, `week ${week} strength`)
    assertEquals(s.sessions.filter((x) => x.discipline === 'swim').length, 2, `week ${week} swim`)
    assertEquals(s.sessions.filter((x) => x.discipline === 'run').length, 2, `week ${week} run`)
    assertEquals(s.sessions.filter((x) => x.discipline === 'bike').length, 1, `week ${week} bike`)
    assertEquals(s.sessions.filter((x) => x.optional).length, 1, `week ${week} optional`)
  }
})

Deno.test('november: tuesday group run, thursday swim technique alternative', () => {
  const s = buildWeekSkeleton(dateFromIsoWeek(2026, 46))
  const tueRun = s.sessions.filter((x) => x.day === 'Martedì' && x.discipline === 'run' && !x.optional)
  assertEquals(tueRun.length, 1, 'tuesday run')
  assert(tueRun[0].coachAppointment === true && tueRun[0].time === '19:00', 'tuesday run is coach appointment at 19:00')
  const thuSwim = s.sessions.filter((x) => x.day === 'Giovedì' && x.discipline === 'swim')
  assertEquals(thuSwim.length, 3, 'thursday group + technique + dry swim')
  assertEquals(thuSwim.filter((x) => x.optional).length, 2, 'technique and dry are optional')
})

Deno.test('build has maintenance strength, peak has none', () => {
  const build = buildWeekSkeleton(dateFromIsoWeek(2026, 13))
  assertEquals(build.sessions.filter((x) => x.discipline === 'strength').length, 1)
  const peak = buildWeekSkeleton(dateFromIsoWeek(2026, 20))
  assertEquals(peak.sessions.filter((x) => x.discipline === 'strength').length, 0)
})

Deno.test('every session has day, duration, intensity and content', () => {
  for (const week of [44, 45, 46, 9, 20, 38]) {
    const s = buildWeekSkeleton(dateFromIsoWeek(2026, week))
    for (const session of s.sessions) {
      assert(session.day, `week ${week} ${session.title} day`)
      assert(session.mainOutline.length >= 1, `week ${week} ${session.title}`)
      assert(session.duration.length > 0)
      assert(session.intensity.length > 0)
    }
  }
})

Deno.test('november swim technique targets 2300-2500m', () => {
  const s = buildWeekSkeleton(dateFromIsoWeek(2026, 46))
  const swim = s.sessions.find((x) => x.discipline === 'swim' && x.title.includes('Tecnica'))!
  assert(swim.mainOutline.join(' ').includes('2.300'))
})

Deno.test('recovery week scales volume down', () => {
  const normal = buildWeekSkeleton(dateFromIsoWeek(2026, 45))
  const recovery = buildWeekSkeleton(dateFromIsoWeek(2026, 44))
  const normalBike = normal.sessions.find((s) => s.discipline === 'bike')!
  const recoveryBike = recovery.sessions.find((s) => s.discipline === 'bike')!
  const parseMin = (t: string) => parseInt(t.match(/^(\d+)/)![1], 10)
  assert(parseMin(recoveryBike.duration) <= parseMin(normalBike.duration))
  assert(recovery.isRecovery === true)
})

Deno.test('hard week (3) is longest in base phase', () => {
  const w1 = buildWeekSkeleton(dateFromIsoWeek(2026, 45))
  const w3 = buildWeekSkeleton(dateFromIsoWeek(2026, 47))
  const bike1 = w1.sessions.find((s) => s.discipline === 'bike')!
  const bike3 = w3.sessions.find((s) => s.discipline === 'bike')!
  const parseMin = (t: string) => parseInt(t.match(/^(\d+)/)![1], 10)
  assert(parseMin(bike3.duration) >= parseMin(bike1.duration))
  assert(w3.weekInMeso === 3)
})

// ---------- Test di regressione: separazione warmup/main/cooldown ----------

Deno.test('bikeTecnica: warmup/main/cooldown separati, nessun duplicato', () => {
  const s = buildWeekSkeleton(dateFromIsoWeek(2026, 46))
  const b = s.sessions.find((x) => x.discipline === 'bike' && x.title.includes('Tecnica'))!
  assertEquals(b.warmup!.length, 1, 'warmup non vuoto')
  assertEquals(b.warmup![0], '15min riscaldamento graduale')
  assertEquals(b.cooldown!.length, 1, 'cooldown non vuoto')
  assertEquals(b.cooldown![0], '10min defaticamento')
  assert(b.mainOutline.length >= 1, 'main non vuoto')
  // Nessuna istruzione di warmup/cooldown dentro main
  const mainJoined = b.mainOutline.join(' ')
  assert(!mainJoined.includes('riscaldamento'), 'main non deve contenere riscaldamento')
  assert(!mainJoined.includes('defaticamento'), 'main non deve contenere defaticamento')
  // Istruzioni conservate complessivamente
  const total = [...b.warmup!, ...b.mainOutline, ...b.cooldown!].join(' ')
  assert(total.includes('30-40min fondo in Z2'), 'parte centrale conservata')
  assert(total.includes('cadenza 85-95rpm'), 'cadenza conservata')
  assert(total.includes('4x30s allunghi'), 'allunghi conservati')
  assertEquals(b.duration, '60min', 'durata invariata')
})

Deno.test('bikeRoller: warmup/main/cooldown separati, nessun duplicato', () => {
  const s = buildWeekSkeleton(dateFromIsoWeek(2026, 46))
  const b = s.sessions.find((x) => x.discipline === 'bike' && x.title.includes('rullo'))!
  assertEquals(b.warmup!.length, 1, 'warmup non vuoto')
  assertEquals(b.warmup![0], '15min riscaldamento graduale')
  assertEquals(b.cooldown!.length, 1, 'cooldown non vuoto')
  assertEquals(b.cooldown![0], 'Defaticamento 10min')
  assert(b.mainOutline.length >= 1, 'main non vuoto')
  const mainJoined = b.mainOutline.join(' ')
  assert(!mainJoined.includes('riscaldamento'), 'main non deve contenere riscaldamento')
  assert(!mainJoined.includes('defaticamento'), 'main non deve contenere defaticamento')
  const total = [...b.warmup!, ...b.mainOutline, ...b.cooldown!].join(' ')
  assert(total.includes('80-120min sui rulli'), 'parte centrale conservata')
  assert(total.includes('4-6 blocchi'), 'blocchi conservati')
  assertEquals(b.duration, '80-120min', 'durata invariata')
})

Deno.test('bikeWinter: warmup/main/cooldown separati, totale outdoor e rulli distinti', () => {
  const s = buildWeekSkeleton(dateFromIsoWeek(2026, 46))
  const b = s.sessions.find((x) => x.discipline === 'bike' && x.title.includes('blocchi di forza'))!
  assertEquals(b.warmup!.length, 1, 'warmup non vuoto')
  assertEquals(b.warmup![0], '15min riscaldamento progressivo')
  assertEquals(b.cooldown!.length, 1, 'cooldown non vuoto')
  assertEquals(b.cooldown![0], 'Defaticamento 10min')
  assert(b.mainOutline.length >= 1, 'main non vuoto')
  const mainJoined = b.mainOutline.join(' ')
  assert(!mainJoined.includes('riscaldamento'), 'main non deve contenere riscaldamento')
  assert(!mainJoined.includes('defaticamento'), 'main non deve contenere defaticamento')
  const total = [...b.warmup!, ...b.mainOutline, ...b.cooldown!].join(' ')
  assert(total.includes('2-3h'), 'prescrizione 2-3h conservata')
  assert(total.includes('4-6 blocchi'), 'blocchi conservati')
  assert(b.duration.includes('2h25–3h25'), 'totale outdoor 2h25-3h25')
  assert(b.duration.includes('1h45–2h25'), 'totale rulli 1h45-2h25')
  // L'incoerenza tra durata totale e "2-3h" parte centrale resta aperta per il ramo precedente (100min)
})

Deno.test('strengthA: warmup/main/cooldown separati, nessun duplicato', () => {
  const s = buildWeekSkeleton(dateFromIsoWeek(2026, 46))
  const st = s.sessions.find((x) => x.discipline === 'strength' && x.title.includes('Corpo libero (A)'))!
  assertEquals(st.warmup!.length, 1, 'warmup non vuoto')
  assertEquals(st.warmup![0], 'Riscaldamento 5-10min: mobilità di anche, spalle e caviglie')
  assertEquals(st.cooldown!.length, 1, 'cooldown non vuoto')
  assertEquals(st.cooldown![0], 'Defaticamento 5min: stretching di quadricipiti, femorali e petto')
  assert(st.mainOutline.length >= 1, 'main non vuoto')
  const mainJoined = st.mainOutline.join(' ')
  assert(!mainJoined.includes('Riscaldamento'), 'main non deve contenere riscaldamento')
  assert(!mainJoined.includes('Defaticamento'), 'main non deve contenere Defaticamento')
  const total = [...st.warmup!, ...st.mainOutline, ...st.cooldown!].join(' ')
  assert(total.includes('12 squat'), 'squat conservati')
  assert(total.includes('30" plank'), 'plank conservati')
  assert(total.includes('15 ponti glutei'), 'ponti conservati')
  assertEquals(st.duration, '40min', 'durata invariata')
})

Deno.test('strengthCircuit: warmup/main/cooldown separati, nessun duplicato', () => {
  const s = buildWeekSkeleton(dateFromIsoWeek(2026, 46))
  const st = s.sessions.find((x) => x.discipline === 'strength' && x.title.includes('Circuito (B)'))!
  assertEquals(st.warmup!.length, 1, 'warmup non vuoto')
  assertEquals(st.warmup![0], '10min di corsa facile + mobilità dinamica')
  assertEquals(st.cooldown!.length, 1, 'cooldown non vuoto')
  assertEquals(st.cooldown![0], '5min defaticamento + stretching')
  assert(st.mainOutline.length >= 1, 'main non vuoto')
  const mainJoined = st.mainOutline.join(' ')
  assert(!mainJoined.includes('corsa facile'), 'main non deve contenere riscaldamento')
  assert(!mainJoined.includes('defaticamento'), 'main non deve contenere defaticamento')
  const total = [...st.warmup!, ...st.mainOutline, ...st.cooldown!].join(' ')
  assert(total.includes('serie:'), 'serie conservate')
  assert(total.includes('Recupero 60-90"'), 'recupero conservato')
  assertEquals(st.duration, '45min', 'durata invariata')
})

// ---------- Test di regressione: recovery branch preserva separazione ----------

Deno.test('recovery: separazione warmup/main/cooldown preservata', () => {
  const normal = buildWeekSkeleton(dateFromIsoWeek(2026, 46))
  const recovery = buildWeekSkeleton(dateFromIsoWeek(2026, 44))
  for (const week of [normal, recovery]) {
    const sessions = week.sessions.filter((x) => ['bikeTecnica', 'Bici su rullo', 'Forza - Corpo libero (A)', 'Forza + corsa - Circuito (B)', 'Bici - Fondo Z2 con blocchi di forza'].includes(x.title))
    for (const s of sessions) {
      assert(s.warmup!.length > 0, `warmup non vuoto: ${s.title}`)
      assert(s.cooldown!.length > 0, `cooldown non vuoto: ${s.title}`)
      assert(s.mainOutline.length > 0, `main non vuoto: ${s.title}`)
      const mainJoined = s.mainOutline.join(' ')
      assert(!mainJoined.toLowerCase().includes('riscaldamento'), `main non contiene riscaldamento: ${s.title}`)
      assert(!mainJoined.toLowerCase().includes('defaticamento'), `main non contiene defaticamento: ${s.title}`)
    }
  }
})
