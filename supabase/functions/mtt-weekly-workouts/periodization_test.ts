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
