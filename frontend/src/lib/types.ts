export type Skill = "listening" | "reading" | "writing" | "speaking";

export interface Profile {
  exam_type: "academic" | "general";
  current_level: string;
  target_band: number;
  exam_date: string | null;
  daily_minutes: number;
  weak_skills: Skill[];
  onboarded: boolean;
  country: string;
  bio: string;
}

export interface UserSettings {
  explain_in_uzbek: boolean;
  tts_enabled: boolean;
  tts_rate: number;
  email_notifications: boolean;
  theme: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_verified: boolean;
  is_admin: boolean;
  is_premium: boolean;
  plan: "free" | "premium";
  subscription: { plan: string; status: string; provider: string; expires_at: string | null } | null;
  created_at: string;
  profile: Profile | null;
  settings: UserSettings | null;
}

export interface Task {
  id: number;
  date: string;
  skill: string;
  title: string;
  description: string;
  duration_min: number;
  link: string;
  completed: boolean;
}

export interface Question {
  id: number;
  section: number;
  order: number;
  qtype: "mcq" | "tfng" | "ynng" | "matching_headings" | "gap_fill" | "short_answer" | "writing_task" | "speaking_prompt";
  prompt: string;
  options: string[];
  word_limit: number | null;
  points: number;
  extra: Record<string, any>;
  answer?: string[];
  response?: string;
  is_correct?: boolean | null;
}

export interface TestSummary {
  id: number;
  title: string;
  skill: Skill;
  exam_type: string;
  description: string;
  duration_min: number;
  difficulty: string;
  is_premium: boolean;
  locked: boolean;
  questions: number;
  attempts: number;
  best_band: number | null;
}

export interface Section {
  title: string;
  text?: string;
  audio_script?: string;
  audio_url?: string;
  instructions?: string;
}

export interface WritingFeedback {
  band: number;
  criteria: Record<string, { band: number; comment: string }>;
  grammar_errors: { original: string; correction: string; explanation: string }[];
  vocabulary_issues: { original: string; suggestion: string; explanation: string }[];
  structure: Record<string, string>;
  strengths: string[];
  improvements: string[];
  improved_essay: string;
  summary: string;
  provider: string;
  model: string;
  is_demo: boolean;
  word_count?: number;
  disclaimer?: string;
  locked?: string[];
  demo_reason?: string;
}

export interface SpeakingFeedback {
  band: number;
  criteria: Record<string, { band: number; comment: string }>;
  grammar_errors: { original: string; correction: string; explanation: string }[];
  vocabulary: { good: string[]; suggestions: { original: string; suggestion: string }[] };
  improved_answers: { question: string; sample: string }[];
  tips: string[];
  summary: string;
  is_demo: boolean;
  provider: string;
  disclaimer?: string;
}
