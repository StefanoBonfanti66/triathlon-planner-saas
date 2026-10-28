import { supabase } from '../supabaseClient';

export interface WorkoutBlock {
  discipline: 'swim' | 'bike' | 'run';
  title: string;
  duration?: string;
  warmup?: string[];
  main: string[];
  cooldown?: string[];
  notes?: string[];
  tips?: string[];
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
  notes: string;
  tips_by_discipline: {
    swim: string[];
    bike: string[];
    run: string[];
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

export async function getTeamWorkouts(teamId: string = 'mtt') {
  const { data, error } = await supabase
    .from('team_workouts')
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'sent')
    .order('year', { ascending: false })
    .order('week_number', { ascending: false });

  if (error) throw error;
  return data as TeamWorkout[];
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
  return data as TeamWorkout[];
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
