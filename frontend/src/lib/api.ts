import questionsData from './questions.json'

export interface Choice {
  id: number
  problem_id: number
  content: string
  is_correct: boolean
  order_num: number
}

export interface Problem {
  id: number
  title: string
  content: string
  category: string | null
  difficulty?: string
  choices?: Choice[]
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
