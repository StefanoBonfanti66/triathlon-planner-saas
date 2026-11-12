import { supabase } from '../supabaseClient';

export interface WorkoutBlock {
  discipline: 'swim' | 'bike' | 'run' | 'strength';
  title: string;
  duration?: string;
  day?: string;
  optional?: boolean;
  warmup?: string[];
  main: string[];
  cooldown?: string[];
  notes?: string[];
  tips?: string[];
  brickRun?: { duration: string; main: string[] };
}

export interface NewsletterContent {
  subject: string;
  intro: string;
  extra: string;
}

export interface WeeklyWorkoutContent {
  week_number: number;
  year: number;
  title: string;
  intro: string;
  swim: WorkoutBlock[];
  bike: WorkoutBlock[];
  run: WorkoutBlock[];
  strength?: WorkoutBlock[];
  notes: string;
  tips_by_discipline: {
    swim: string[];
    bike: string[];
    run: string[];
    strength?: string[];
  };
  adaptation_tips: {
    ftp: string;
    vo2max: string;
    pace: string;
  };
  newsletter?: NewsletterContent;
}

export interface TeamWorkout {
  id: string;
  team_id: string;
  year: number;
  week_number: number;
  status: 'draft' | 'approved' | 'scheduled' | 'sent' | 'error';
  generated_by: string;
  generated_at: string;
  approved_by?: string;
  approved_at?: string;
  sent_at?: string;
  newsletter_sent_at?: string;
  telegram_message_ids: any[];
  content: WeeklyWorkoutContent;
  images: Array<{ url: string; discipline: string; caption?: string }>;
  ai_prompt_used?: string;
  sources: string[];
}

// Calcolo ISO 8601 della settimana (uguale a periodization.ts sul backend)
// per evitare mismatch tra frontend e backend sul numero di settimana.
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getCurrentWeek(): { year: number; week: number } {
  const now = new Date();
  return { year: now.getFullYear(), week: isoWeekNumber(now) };
}

export async function generateWeeklyWorkouts(year: number, weekNumber: number) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error('Non autenticato');

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id, is_team_admin, is_super_admin, email')
    .eq('id', session.session.user.id)
    .single();

  const isAdmin = profile?.is_team_admin || profile?.is_super_admin || 
                  profile?.email === 'sbonfanti@hotmail.com' || 
                  profile?.email === 'bonfantistefano4@gmail.com';

  if (!isAdmin || profile?.team_id !== 'mtt') {
    throw new Error('Solo gli admin MTT possono generare gli allenamenti');
  }

  // Check if workout already exists
  const { data: existing } = await supabase
    .from('team_workouts')
    .select('id, status')
    .eq('team_id', 'mtt')
    .eq('year', year)
    .eq('week_number', weekNumber)
    .single();

  if (existing && existing.status !== 'draft') {
    throw new Error('Esiste già un allenamento per questa settimana con stato ' + existing.status);
  }

  // Call Edge Function for AI generation
  const { data, error } = await supabase.functions.invoke('mtt-weekly-workouts', {
    body: { action: 'generate', year, week_number: weekNumber }
  });

  if (error) throw error;
  return data;
}

export async function approveWorkout(workoutId: string) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error('Non autenticato');

  const { data, error } = await supabase
    .from('team_workouts')
    .update({
      status: 'approved',
      approved_by: session.session.user.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', workoutId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function sendWorkoutToTelegram(workoutId: string) {
  const { data, error } = await supabase.functions.invoke('mtt-weekly-workouts', {
    body: { action: 'send', workout_id: workoutId }
  });

  if (error) throw error;
  return data;
}

export async function updateNewsletter(workoutId: string, newsletter: Partial<NewsletterContent>) {
  const { data: current } = await supabase
    .from('team_workouts')
    .select('content')
    .eq('id', workoutId)
    .single();
  if (!current?.content) throw new Error('Allenamento non trovato');

  const merged = {
    ...current.content,
    newsletter: {
      subject: '',
      intro: '',
      extra: '',
      ...current.content.newsletter,
      ...newsletter,
    },
  };

  const { data, error } = await supabase
    .from('team_workouts')
    .update({ content: merged })
    .eq('id', workoutId)
    .select()
    .single();

  if (error) throw error;
  return data as TeamWorkout;
}

export async function sendNewsletter(workoutId: string, testEmail?: string) {
  const { data, error } = await supabase.functions.invoke('mtt-weekly-workouts', {
    body: {
      action: 'send-newsletter',
      workout_id: workoutId,
      ...(testEmail ? { test_email: testEmail } : {}),
    },
  });

  if (error) throw error;
  return data;
}

// Converte sequenze letterali "\n" (backslash+n) lasciate dal LLM in newline vere.
// Applicato ricorsivamente a tutti i campi testuali del contenuto workout.
function normalizeNewlines(s: string): string {
  return s.replace(/\\n/g, '\n');
}

function normalizeStringArray(arr: string[] | undefined): string[] {
  if (!arr) return [];
  return arr.map((s) => normalizeNewlines(s));
}

function normalizeBlock(b: WorkoutBlock): WorkoutBlock {
  return {
    ...b,
    title: normalizeNewlines(b.title),
    duration: b.duration ? normalizeNewlines(b.duration) : undefined,
    day: b.day ? normalizeNewlines(b.day) : undefined,
    warmup: normalizeStringArray(b.warmup),
    main: normalizeStringArray(b.main),
    cooldown: normalizeStringArray(b.cooldown),
    tips: normalizeStringArray(b.tips),
    notes: normalizeStringArray(b.notes),
    brickRun: b.brickRun
      ? {
          duration: normalizeNewlines(b.brickRun.duration),
          main: normalizeStringArray(b.brickRun.main),
        }
      : undefined,
  };
}

export function normalizeWorkoutContent(content: WeeklyWorkoutContent): WeeklyWorkoutContent {
  return {
    ...content,
    title: normalizeNewlines(content.title),
    intro: normalizeNewlines(content.intro),
    notes: normalizeNewlines(content.notes),
    swim: (content.swim ?? []).map(normalizeBlock),
    bike: (content.bike ?? []).map(normalizeBlock),
    run: (content.run ?? []).map(normalizeBlock),
    strength: (content.strength ?? []).map(normalizeBlock),
    tips_by_discipline: {
      swim: normalizeStringArray(content.tips_by_discipline?.swim),
      bike: normalizeStringArray(content.tips_by_discipline?.bike),
      run: normalizeStringArray(content.tips_by_discipline?.run),
      strength: normalizeStringArray(content.tips_by_discipline?.strength),
    },
    adaptation_tips: {
      ftp: normalizeNewlines(content.adaptation_tips.ftp),
      vo2max: normalizeNewlines(content.adaptation_tips.vo2max),
      pace: normalizeNewlines(content.adaptation_tips.pace),
    },
    newsletter: content.newsletter
      ? {
          subject: normalizeNewlines(content.newsletter.subject),
          intro: normalizeNewlines(content.newsletter.intro),
          extra: normalizeNewlines(content.newsletter.extra),
        }
      : undefined,
  };
}

export async function getTeamWorkouts(teamId: string = 'mtt') {
  const { data, error } = await supabase
    .from('team_workouts')
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'sent')
    .order('year', { ascending: false })
    .order('week_number', { ascending: false });

  if (error) throw error;
  return (data as TeamWorkout[]).map((w) => ({ ...w, content: normalizeWorkoutContent(w.content) }));
}

export async function getWorkoutDrafts() {
  const { data, error } = await supabase
    .from('team_workouts')
    .select('*')
    .eq('team_id', 'mtt')
    .in('status', ['draft', 'approved', 'scheduled', 'error'])
    .order('year', { ascending: false })
    .order('week_number', { ascending: false });

  if (error) throw error;
  return (data as TeamWorkout[]).map((w) => ({ ...w, content: normalizeWorkoutContent(w.content) }));
}
