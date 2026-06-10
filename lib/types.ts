export type ModeId = 'roast' | 'coach' | 'intl'
export type Step = 'mode' | 'upload' | 'analyzing'
export type View = 'landing' | 'workspace' | 'results'

export interface ResumeSection {
  label: string
  score: number
  note: string
}

export interface AnalysisResult {
  score: number
  grade: string
  verdict: string
  summary: string
  sections: ResumeSection[]
  wins: string[]
  fixes: string[]
  flags: string[]
}

export interface ModeConfig {
  id: ModeId
  glyph: string
  name: string
  tagline: string
  blurb: string
  accent: string
  accent2: string
  cta: string
  sample: string
}
