import questionsData from './questions.json'

export type Lang = 'ko' | 'en'

export interface Choice {
  id: number
  problem_id: number
  content: string
  content_en?: string
  is_correct: boolean
  order_num: number
}

export interface Problem {
  id: number
  title: string
  title_en?: string
  content: string
  content_en?: string
  category: string | null
  difficulty?: string
  select?: number
  choices?: Choice[]
}

/** 언어에 맞는 문제 본문 텍스트를 반환. en 없으면 ko로 폴백. */
export function problemText(p: Problem, lang: Lang): string {
  return lang === 'en' ? (p.content_en ?? p.content) : p.content
}

/** 언어에 맞는 선택지 텍스트를 반환. en 없으면 ko로 폴백. */
export function choiceText(c: Choice, lang: Lang): string {
  return lang === 'en' ? (c.content_en ?? c.content) : c.content
}

const problems = questionsData as Problem[]

export const api = {
  getAllProblems: (): Promise<Problem[]> => Promise.resolve(problems),
  getProblem: (id: number): Promise<Problem> => {
    const p = problems.find(p => p.id === id)
    return p ? Promise.resolve(p) : Promise.reject(new Error('문제를 찾을 수 없습니다'))
  },
  getProblems: ({ category, difficulty }: { category?: string; difficulty?: string } = {}): Promise<Problem[]> => {
    let result = problems
    if (category) result = result.filter(p => p.category === category)
    if (difficulty) result = result.filter(p => p.difficulty === difficulty)
    return Promise.resolve(result)
  },
  getCategories: (): Promise<string[]> => {
    const cats = [...new Set(problems.map(p => p.category).filter(Boolean))] as string[]
    return Promise.resolve(cats)
  },
}
