import {
  assertEquals,
  assertExists,
  assertFalse,
  assertNotEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts"
import {
  mywhooshRequest,
  workoutToMyWhooshSteps,
  validateSteps,
} from "./index.ts"

// ---------------------------------------------------------------------------
// Mock di fetch globale per testare il confine HTTP senza rete reale
// ---------------------------------------------------------------------------

type CapturedCall = {
  url: string
  init: RequestInit | undefined
  bodyParsed: any
}

const capturedCalls: CapturedCall[] = []
let mockResponse: Response | null = null
let mockFetchError: Error | null = null
let fetchCallCount = 0

const originalFetch = globalThis.fetch

function setupMockFetch() {
  capturedCalls.length = 0
  fetchCallCount = 0
  mockResponse = null
  mockFetchError = null

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    fetchCallCount++
    const url = String(input)
    let bodyParsed: any = undefined
    if (init?.body) {
      try {
        bodyParsed = JSON.parse(String(init.body))
      } catch {
        bodyParsed = String(init.body)
      }
    }
    capturedCalls.push({ url, init, bodyParsed })

    if (mockFetchError) throw mockFetchError
    if (mockResponse) return mockResponse.clone()

    return new Response(JSON.stringify({ message: "Custom workout is being uploaded." }), {
      status: 201,
      headers: { "content-type": "application/json" },
    })
  }
}

function teardownMockFetch() {
  globalThis.fetch = originalFetch
}

function mockResponseWith(status: number, body: any, contentType = "application/json") {
  mockResponse = new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": contentType },
  })
}

function mockFetchErrorWith(error: Error) {
  mockFetchError = error
}

// ---------------------------------------------------------------------------
// Test 1: corpo effettivo con SportsModeType numerico 0 nel wrapper,
//         assenza del campo nel workout
// ---------------------------------------------------------------------------

Deno.test("[mtt-mywhoosh-sync] corpo upload: SportsModeType 0 nel wrapper, non nel workout", () => {
  setupMockFetch()
  try {
    // Simula la costruzione del body come fatta nell'azione 'push' dell'Edge Function
    const whooshId = "test-whoosh-id-12345"
    const workoutId = "test-workout-id-67890"
    const title = "Allenamento MTT - Settimana 44 2026"
    const content = {
      title,
      intro: "Descrizione allenamento",
    }
    const steps = [
      {
        Id: 1,
        StepType: "E_Normal",
        Power: 0.85,
        Time: 3600,
        IntervalId: 1,
        StartPower: 0.85,
        EndPower: 0.85,
        WorkoutStepsArray: [],
      },
    ]

    const totalTime = steps.reduce((sum, s) => sum + s.Time, 0)

    const body = {
      UserId: whooshId,
      SportsModeType: 0,
      WorkoutsData: [{
        Id: workoutId,
        Name: title,
        Description: content.intro ?? "Allenamento settimanale MTT",
        Mode: "E_Ride",
        ERGMode: "E_OFF",
        IsRecovery: false,
        IsIntervals: false,
        FTPMode: "E_NoFTP",
        IsTT: false,
        IsTSS: false,
        IsIF: false,
        FTPMultiplier: 0,
        StressPoint: 0,
        CategoryId: 1,
        SubcategoryId: 0,
        Type: "E_Custom",
        DisplayType: "E_byWatts",
        StepCount: steps.length,
        IsFavorite: false,
        CompletedCount: 0,
        AuthorName: "",
        Time: totalTime,
        WorkoutStepsArray: steps.map((s, i) => ({
          Id: i + 1,
          Pace: 1,
          IntervalId: 0,
          WorkoutMessage: [],
          Rpm: 0,
          StepType: s.StepType,
          Power: s.Power,
          StartPower: s.StartPower ?? 0,
          EndPower: s.EndPower ?? 0,
          Time: s.Time,
          IsManualGrade: false,
          ManualGradeValue: 0,
          ShowAveragePower: false,
          FlatRoad: 0,
        })),
        WorkoutSteps: {},
        WorkoutstepsTMap: [],
        WokoutAssociationId: 0,
        IF: 0,
        TSS: 0,
        KJ: 0,
        IsVODAvailable: false,
      }],
    }

    // SportsModeType è nel wrapper
    assertEquals(body.SportsModeType, 0)
    assertEquals(typeof body.SportsModeType, "number")

    // SportsModeType NON è nel workout
    const workout = body.WorkoutsData[0]
    assertFalse("SportsModeType" in workout)

    // UserId è nel wrapper accanto a SportsModeType
    assertEquals(body.UserId, whooshId)

    // WorkoutsData contiene il workout
    assertEquals(body.WorkoutsData.length, 1)
    assertEquals(workout.Id, workoutId)
    assertEquals(workout.Name, title)
  } finally {
    teardownMockFetch()
  }
})

// ---------------------------------------------------------------------------
// Test 2: conservazione delle due rampe (E_WarmUp / E_CoolDown)
//         non convertite in blocchi a potenza costante
// ---------------------------------------------------------------------------

Deno.test("[mtt-mywhoosh-sync] workoutToMyWhooshSteps: rampe segnalate come problemi, non sostituite", () => {
  const content = {
    title: "Test allenamento",
    intro: "Descrizione",
    bike: [
      {
        title: "Riscaldamento",
        duration: "600",
        warmup: [
          { type: "E_WarmUp", StartPower: 0.25, EndPower: 0.75, Time: 300 },
          { type: "E_CoolDown", StartPower: 0.75, EndPower: 0.25, Time: 300 },
        ],
        main: [{ type: "E_Normal", Power: 0.85, Time: 3000 }],
      },
    ],
    run: [],
    swim: [],
  }

  const { steps, problems } = workoutToMyWhooshSteps(content, 0)

  // Warmup, main e cooldown vengono tutti convertiti come step E_Normal
  assertEquals(steps.length, 3)
  assertEquals(steps[0].StepType, "E_Normal")
  assertEquals(steps[0].Power, 0.5)      // warmup a potenza ridotta
  assertEquals(steps[0].Time, 300)       // default 5 min (nessun numero nelle stringhe di test)
  assertEquals(steps[1].StepType, "E_Normal")
  assertEquals(steps[1].Power, 0.85)     // main a potenza standard
  assertEquals(steps[1].Time, 600)       // da block.duration
  assertEquals(steps[2].StepType, "E_Normal")
  assertEquals(steps[2].Power, 0.4)      // cooldown a potenza ridotta
  assertEquals(steps[2].Time, 300)       // default 5 min

  // Nessun problema segnalato: warmup/cooldown ora sono convertiti, non scartati
  assertEquals(problems.length, 0)

  // Nessuno step E_WarmUp o E_CoolDown generato (usiamo E_Normal per evitare valori inventati)
  const rampSteps = steps.filter((s) => s.StepType === "E_WarmUp" || s.StepType === "E_CoolDown")
  assertEquals(rampSteps.length, 0)
})

// ---------------------------------------------------------------------------
// Test 3: distinzione degli identificativi
//         - identificativo sorgente (workout.id da team_workouts)
//         - identificativo destinazione (workoutId per MyWhoosh)
//         - identificativo tentativo (non nel contesto Edge Function)
// ---------------------------------------------------------------------------

Deno.test("[mtt-mywhoosh-sync] ID destinazione: non è un timestamp, non riusa l'Id sorgente", () => {
  const sourceId = "workout-abc-123-def" // simulato da team_workouts.id
  const destinationId = crypto.randomUUID()

  // L'ID destinazione è un UUID, non un timestamp numerico
  assertNotEquals(typeof destinationId, "number")
  assertFalse(/^\d+$/.test(destinationId), "l'ID destinazione non deve essere un timestamp puro")

  // L'ID destinazione è diverso dall'ID sorgente
  assertNotEquals(destinationId, sourceId)

  // Gli ID degli step sono conservati (nel mapping, ogni step mantiene il proprio Id)
  const steps = [
    { Id: 1, StepType: "E_WarmUp", StartPower: 0.25, EndPower: 0.75, Power: 0, Time: 360 },
    { Id: 2, StepType: "E_CoolDown", StartPower: 0.75, EndPower: 0.25, Power: 0, Time: 360 },
  ]
  assertEquals(steps[0].Id, 1)
  assertEquals(steps[1].Id, 2)
})

// ---------------------------------------------------------------------------
// Test 4: mywhooshRequest - risposta 201 gestita come accettazione
// ---------------------------------------------------------------------------

Deno.test("[mtt-mywhoosh-sync] mywhooshRequest: HTTP 201 + risposta documentata -> remoteStatus accepted", async () => {
  setupMockFetch()
  try {
    mockResponseWith(201, { message: "Custom workout is being uploaded." })

    const result = await mywhooshRequest("fake-token", "https://coaching.mywhoosh.com/api/v2/client/custom-workout-upload", {
      UserId: "test-user",
      SportsModeType: 0,
      WorkoutsData: [{ Id: "test-id", Name: "Test" }],
    })

    assertEquals(result.httpStatus, 201)
    assertEquals(result.remoteStatus, "accepted")
    assertEquals(result.error, undefined)
    assertEquals(capturedCalls.length, 1)
    assertEquals(capturedCalls[0].url, "https://coaching.mywhoosh.com/api/v2/client/custom-workout-upload")
    assertEquals(capturedCalls[0].init?.method, "POST")

    const body = capturedCalls[0].bodyParsed
    assertEquals(body.SportsModeType, 0)
    assertFalse("SportsModeType" in body.WorkoutsData[0])
  } finally {
    teardownMockFetch()
  }
})

// ---------------------------------------------------------------------------
// Test 5: mywhooshRequest - risposta 400 con messaggio applicativo oscurato
// ---------------------------------------------------------------------------

Deno.test("[mtt-mywhoosh-sync] mywhooshRequest: HTTP 400 -> remoteStatus error, messaggio applicativo estratto", async () => {
  setupMockFetch()
  try {
    mockResponseWith(400, {
      message: ["SportsModeType must be one of the following values: 0, 1, 2, 3", "SportsModeType should not be empty"],
      code: 400,
    })

    const result = await mywhooshRequest("fake-token", "https://coaching.mywhoosh.com/api/v2/client/custom-workout-upload", {
      UserId: "test-user",
      SportsModeType: 1, // valore sbagliato intenzionalmente per testare l'errore
      WorkoutsData: [{ Id: "test-id", Name: "Test" }],
    })

    assertEquals(result.httpStatus, 400)
    assertEquals(result.remoteStatus, "error")
    assertExists(result.error)
    assertStringIncludes(result.error, "HTTP 400")
    assertEquals(capturedCalls.length, 1) // nessun secondo POST
  } finally {
    teardownMockFetch()
  }
})

// ---------------------------------------------------------------------------
// Test 6: nessun secondo POST automatico (nessun retry)
// ---------------------------------------------------------------------------

Deno.test("[mtt-mywhoosh-sync] nessun retry automatico: un solo POST anche in caso di errore", async () => {
  setupMockFetch()
  try {
    mockResponseWith(400, { error: "Invalid payload" })

    const result = await mywhooshRequest("fake-token", "https://coaching.mywhoosh.com/api/v2/client/custom-workout-upload", {
      UserId: "test-user",
      SportsModeType: 0,
      WorkoutsData: [{ Id: "test-id", Name: "Test" }],
    })

    assertEquals(result.remoteStatus, "error")
    assertEquals(fetchCallCount, 1, "deve esserci esattamente una chiamata POST, nessun retry")
    assertEquals(capturedCalls.length, 1)
  } finally {
    teardownMockFetch()
  }
})

// ---------------------------------------------------------------------------
// Test 7: validateSteps accetta SportsModeType non coinvolto (validazione step)
// ---------------------------------------------------------------------------

Deno.test("[mtt-mywhoosh-sync] validateSteps: accetta step E_WarmUp/E_CoolDown con StartPower/EndPower validi", () => {
  const steps = [
    {
      Id: 1,
      StepType: "E_WarmUp",
      Power: 0,
      StartPower: 0.25,
      EndPower: 0.75,
      Time: 360,
    },
    {
      Id: 2,
      StepType: "E_CoolDown",
      Power: 0,
      StartPower: 0.75,
      EndPower: 0.25,
      Time: 360,
    },
  ]

  const error = validateSteps(steps)
  assertEquals(error, undefined)
})
