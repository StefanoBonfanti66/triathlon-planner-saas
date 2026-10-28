import { assertEquals, assert } from 'jsr:@std/assert@1'
import {
  buildWeekSkeleton,
  dateFromIsoWeek,
  getMacroPhase,
  getMesoWeek,
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
  assertEquals(getMacroPhase(new Date(2026, 10, 15)), 'base')
  assertEquals(getMacroPhase(new Date(2026, 2, 15)), 'build')
  assertEquals(getMacroPhase(new Date(2026, 3, 15)), 'build')
  assertEquals(getMacroPhase(new Date(2026, 5, 15)), 'peak')
  assertEquals(getMacroPhase(new Date(2026, 7, 15)), 'peak')
  assertEquals(getMacroPhase(new Date(2026, 8, 15)), 'transition')
  assertEquals(getMacroPhase(new Date(2026, 9, 5)), 'transition')
})

Deno.test('mesocycle: 4th week is recovery', () => {
  const w4 = getMesoWeek(dateFromIsoWeek(2026, 44))
  assertEquals(w4.weekInMeso, 4)
  assertEquals(w4.isRecovery, true)
  const w1 = getMesoWeek(dateFromIsoWeek(2026, 45))
  assertEquals(w1.weekInMeso, 1)
  assertEquals(w1.isRecovery, false)
})

Deno.test('skeleton has 2 sessions per discipline', () => {
  for (const week of [43, 44, 45, 46, 47]) {
    const s = buildWeekSkeleton(dateFromIsoWeek(2026, week))
    for (const d of ['swim', 'bike', 'run'] as const) {
      assertEquals(s.sessions.filter((x) => x.discipline === d).length, 2, `week ${week} ${d}`)
    }
    for (const session of s.sessions) {
      assert(session.mainOutline.length >= 1, `week ${week} ${session.title}`)
      assert(session.duration.length > 0)
      assert(session.intensity.length > 0)
    }
  }
})

Deno.test('recovery week scales volume down', () => {
  const normal = buildWeekSkeleton(dateFromIsoWeek(2026, 45))
  const recovery = buildWeekSkeleton(dateFromIsoWeek(2026, 44))
  const normalBike = normal.sessions.find((s) => s.discipline === 'bike' && s.title.includes('Fondo'))!
  const recoveryBike = recovery.sessions.find((s) => s.discipline === 'bike')!
  const parseMin = (t: string) => parseInt(t.match(/^(\d+)/)![1], 10)
  assert(parseMin(recoveryBike.duration) <= parseMin(normalBike.duration))
  assert(recovery.isRecovery === true)
})

Deno.test('hard week (3) is longest in base phase', () => {
  const w1 = buildWeekSkeleton(dateFromIsoWeek(2026, 45))
  const w3 = buildWeekSkeleton(dateFromIsoWeek(2026, 47))
  const bike1 = w1.sessions.find((s) => s.discipline === 'bike' && s.title.includes('Fondo aerobico'))!
  const bike3 = w3.sessions.find((s) => s.discipline === 'bike' && s.title.includes('Fondo aerobico'))!
  const parseMin = (t: string) => parseInt(t.match(/^(\d+)/)![1], 10)
  assert(parseMin(bike3.duration) >= parseMin(bike1.duration))
  assert(w3.weekInMeso === 3)
})
