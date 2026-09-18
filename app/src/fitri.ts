/**
 * Client risultati FITRI (MyFITRI Web API, endpoint pubblici senza auth).
 * Gli endpoint sono:
 *   - GET {BASE}/getProfiloAtleta/{tessera}-FITRI
 *   - GET {BASE}/getClassificheAtleta/{anno}/{tessera}-FITRI
 */
const FITRI_BASE = 'https://www.myfitri.it/MyfitriWeb';

export interface FitriSplit {
  name: string;
  value: string;
}

export interface FitriResult {
  idGara: string;
  anno: number;
  atleta: string;
  categoria: string;
  circuito?: string;
  data: string;
  distanza: string;
  localita: string;
  manifestazione: string;
  posizione: number;
  strPosizione: string;
  posizione_categoria: number;
  tempo: string;
  splits: FitriSplit[];
  puntiFitri?: number;
  puntiGara?: number;
  coeffGara?: number;
}

function mapRawResult(raw: any): FitriResult | null {
  if (!raw?.data || !raw?.tempo) return null;
  const splits: FitriSplit[] = [];
  (raw.listaNomiColonneCustom || []).forEach((name: string, i: number) => {
    splits.push({ name, value: raw.listaCampiCustom?.[i] ?? '' });
  });
  return {
    idGara: raw.idGara,
    anno: Number(raw.anno) || 0,
    atleta: raw.atleta,
    categoria: raw.categoria,
    circuito: raw.circuito,
    data: raw.data,
    distanza: raw.distanza,
    localita: raw.localita,
    manifestazione: raw.manifestazione,
    posizione: Number(raw.posizione) || 0,
    strPosizione: raw.strPosizione || `${raw.posizione}`,
    posizione_categoria: Number(raw.posizione_categoria) || 0,
    tempo: raw.tempo,
    splits,
    puntiFitri: raw.puntiFitri,
    puntiGara: raw.puntiGara,
    coeffGara: raw.coeffGara,
  };
}

/** Estrae la tessera numerica FITRI. Esempi: "106925/A246799" -> "106925", "147542" -> "147542", " /A274626" -> null. */
export function parseFitriId(licenseNumber: string | null | undefined): string | null {
  if (!licenseNumber) return null;
  const first = licenseNumber.split('/')[0].trim();
  return /^\d+$/.test(first) ? first : null;
}

export function yearFromDate(ddMMyyyy: string): string {
  return ddMMyyyy.slice(-4);
}

/** "DD-MM-YYYY" -> "YYYY-MM-DD". */
export function plannerDateToKey(date: string): string {
  const [d, m, y] = date.split('-');
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD HH:MM:SS.0" -> "YYYY-MM-DD". */
export function fitriDateToKey(data: string): string {
  return data.slice(0, 10);
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .trim();
}

/** Recupera i risultati dell'atleta per l'anno indicato (array vuoto se nessuno / errore). */
export async function fetchFitriResults(apiId: string, year: string): Promise<FitriResult[]> {
  const url = `${FITRI_BASE}/getClassificheAtleta/${year}/${apiId}-FITRI`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    if (json?.esito !== 'OK' || !Array.isArray(json?.classificaPartecipanti)) return [];
    return json.classificaPartecipanti.map(mapRawResult).filter((r: FitriResult | null): r is FitriResult => !!r);
  } catch {
    return [];
  }
}

export type FitriResultsByDate = Map<string, FitriResult[]>;

export function indexResultsByDate(results: FitriResult[]): FitriResultsByDate {
  const map: FitriResultsByDate = new Map();
  results.forEach(r => {
    const key = fitriDateToKey(r.data);
    const arr = map.get(key) || [];
    arr.push(r);
    map.set(key, arr);
  });
  return map;
}

/** Trova il risultato per una gara del planner usando data + località (per disambiguare più gare nello stesso giorno). */
export function findFitriResult(resultsByDate: FitriResultsByDate, date: string, location: string): FitriResult | undefined {
  const candidates = resultsByDate.get(plannerDateToKey(date));
  if (!candidates?.length) return undefined;
  if (candidates.length === 1) return candidates[0];
  const locNorm = normalize(location || '');
  return candidates.find(c => {
    const rn = normalize(c.localita);
    if (!rn || !locNorm) return false;
    return locNorm.startsWith(rn) || locNorm.includes(rn) || rn.includes(locNorm);
  });
}