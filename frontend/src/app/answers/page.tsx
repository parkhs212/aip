'use client'
import { useEffect, useState, useMemo } from 'react'
import { api, Problem } from '@/lib/api'

const LETTERS = 'ABCDEF'
const LS_CUSTOM = 'aip-custom-green'
const LS_EXCLUDED = 'aip-excluded-green'

const STOP_WORDS = new Set([
  '그리고', '그러나', '하지만', '또한', '또', '및', '혹은', '또는', '그런데', '그래서',
  '따라서', '그러므로', '즉', '왜냐하면', '반면', '한편', '그러면', '그렇지만', '아니면',
  '다만', '단', '게다가', '특히', '물론', '결국', '오히려', '그러면서', '그러자',
  '그럼에도', '더불어', '이처럼', '이에', '이를테면', '예컨대', '가령', '요컨대',
  '그러니', '그러니까', '왜냐면', '뿐만', '뿐아니라', '이와', '이러한', '이런', '그런',
  '한편으로', '반면에', '다시말해', '한마디로', '결론적으로',
])

const KO_PARTICLES = [
  '으로부터', '에서부터', '에게서', '한테서', '에서는', '으로는', '에서도', '으로도',
  '로부터', '에서', '에게', '한테', '에는', '에도', '으로', '부터', '까지', '처럼',
  '로는', '와도', '과도',
  '시켜서', '시키고', '시키는', '시키며', '시키면', '시킨', '시켜',
  '하여서', '하고서', '하여', '하고', '하며', '하면', '하는', '하던', '하다',
  '되어서', '되어', '되고', '되며', '되면', '되는', '되던', '된',
  '합니다', '됩니다', '입니다', '습니다',
  '하기', '되기', '한',
  '이라', '이고', '이나', '이든', '이며', '이란',
  '로', '와', '과', '이', '가', '을', '를', '은', '는', '의', '에', '도', '만',
  '라', '고', '나', '든', '며', '란',
]

function fmt(text: string) {
  return text.replace(/\n/g, ' ').replace(/ {2,}/g, ' ').trim()
}

function normalizeWord(w: string): string {
  return w.replace(/[.,?!:;()\[\]"'""''·]/g, '').toLowerCase()
}

function stripParticles(word: string): string {
  for (const p of KO_PARTICLES) {
    if (word.endsWith(p) && word.length - p.length >= 2) {
      return word.slice(0, word.length - p.length)
    }
  }
  return word
}

function buildWordFreq(problems: Problem[]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const p of problems) {
    const texts = [fmt(p.content), ...(p.choices?.map(c => fmt(c.content)) ?? [])]
    for (const text of texts) {
      for (const token of text.split(/\s+/)) {
        const w = normalizeWord(token)
        if (w.length < 2) continue
        if (STOP_WORDS.has(w)) continue
        const root = stripParticles(w)
        if (root.length >= 2) freq.set(root, (freq.get(root) ?? 0) + 1)
      }
    }
  }
  return freq
}

function countPhrase(phrase: string, problems: Problem[]): number {
  const term = phrase.toLowerCase()
  let count = 0
  for (const p of problems) {
    const texts = [fmt(p.content), ...(p.choices?.map(c => fmt(c.content)) ?? [])]
    for (const text of texts) {
      let idx = 0
      const lc = text.toLowerCase()
      while ((idx = lc.indexOf(term, idx)) !== -1) { count++; idx++ }
    }
  }
  return count
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function HighlightedText({
  text,
  wordFreq,
  customGreen,
  excluded,
  onExcludeWord,
  onRemovePhrase,
}: {
  text: string
  wordFreq: Map<string, number>
  customGreen: string[]
  excluded: Set<string>
  onExcludeWord: (root: string) => void
  onRemovePhrase: (p: string) => void
}) {
  type Seg = { text: string; phrase: string | null }

  const segments: Seg[] = useMemo(() => {
    let segs: Seg[] = [{ text, phrase: null }]
    for (const phrase of customGreen) {
      if (excluded.has(phrase.toLowerCase())) continue
      const next: Seg[] = []
      for (const seg of segs) {
        if (seg.phrase !== null) { next.push(seg); continue }
        const re = new RegExp(`(${escapeRe(phrase)})`, 'gi')
        for (const part of seg.text.split(re)) {
          next.push({ text: part, phrase: part.toLowerCase() === phrase.toLowerCase() ? phrase : null })
        }
      }
      segs = next
    }
    return segs
  }, [text, customGreen, excluded])

  return (
    <>
      {segments.map((seg, si) => {
        if (seg.phrase !== null) {
          return (
            <span key={si} className="inline-flex items-baseline gap-0.5">
              <span className="text-green-600 font-semibold">{seg.text}</span>
              <button
                onClick={() => onRemovePhrase(seg.phrase!)}
                className="text-red-400 hover:text-red-600 text-sm font-bold leading-none"
              >×</button>
            </span>
          )
        }
        return (
          <span key={si}>
            {seg.text.split(/(\s+)/).map((token, ti) => {
              if (/^\s+$/.test(token)) return <span key={ti}>{token}</span>
              const w = normalizeWord(token)
              const root = stripParticles(w)
              const isGreen = (
                w.length >= 2 &&
                root.length >= 2 &&
                !STOP_WORDS.has(w) &&
                wordFreq.get(root) === 1 &&
                !excluded.has(root)
              )
              if (isGreen) {
                const suffix = w.slice(root.length)
                const displayRoot = suffix && token.endsWith(suffix)
                  ? token.slice(0, token.length - suffix.length)
                  : token
                const displaySuffix = suffix && token.endsWith(suffix) ? suffix : ''
                return (
                  <span key={ti} className="inline-flex items-baseline gap-0.5">
                    <span>
                      <span className="text-green-600 font-semibold">{displayRoot}</span>
                      {displaySuffix && <span className="text-gray-400">{displaySuffix}</span>}
                    </span>
                    <button
                      onClick={() => onExcludeWord(root)}
                      className="text-red-400 hover:text-red-600 text-sm font-bold leading-none"
                    >×</button>
                  </span>
                )
              }
              return <span key={ti} className="text-gray-800">{token}</span>
            })}
          </span>
        )
      })}
    </>
  )
}

function loadLS(key: string, fallback: string[] = []): string[] {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}

export default function AnswersPage() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [wordFreq, setWordFreq] = useState<Map<string, number>>(new Map())
  const [customGreen, setCustomGreen] = useState<string[]>([])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getAllProblems()
      .then(ps => {
        setProblems(ps)
        setWordFreq(buildWordFreq(ps))
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
    setCustomGreen(loadLS(LS_CUSTOM))
    setExcluded(new Set(loadLS(LS_EXCLUDED)))
  }, [])

  const saveCustom = (list: string[]) => {
    setCustomGreen(list)
    localStorage.setItem(LS_CUSTOM, JSON.stringify(list))
  }
  const saveExcluded = (set: Set<string>) => {
    setExcluded(set)
    localStorage.setItem(LS_EXCLUDED, JSON.stringify([...set]))
  }

  const handleAdd = () => {
    const phrase = input.trim()
    if (!phrase || problems.length === 0) return
    const count = countPhrase(phrase, problems)
    if (count === 1) {
      if (!customGreen.includes(phrase)) saveCustom([...customGreen, phrase])
      const ex = new Set(excluded); ex.delete(phrase.toLowerCase()); saveExcluded(ex)
      setFeedback({ msg: `"${phrase}" 추가됨`, ok: true })
    } else if (count === 0) {
      setFeedback({ msg: `"${phrase}" — 찾을 수 없음`, ok: false })
    } else {
      setFeedback({ msg: `"${phrase}" — 전체 ${count}회 등장 (1회만 가능)`, ok: false })
    }
    setInput('')
    setTimeout(() => setFeedback(null), 3000)
  }

  const onExcludeWord = (root: string) => {
    const ex = new Set(excluded); ex.add(root); saveExcluded(ex)
  }
  const onRemovePhrase = (phrase: string) => {
    saveCustom(customGreen.filter(p => p !== phrase))
    const ex = new Set(excluded); ex.add(phrase.toLowerCase()); saveExcluded(ex)
  }

  if (loading) return <div className="text-center py-20 text-gray-400">불러오는 중...</div>
  if (error) return <div className="text-center py-20 text-red-400">{error}</div>

  const totalGreen = customGreen.filter(p => !excluded.has(p.toLowerCase())).length

  return (
    <div className="max-w-3xl mx-auto">
      <div className="sticky top-[53px] z-10 bg-gray-50 pb-3 pt-1">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="추가할 문구 입력 후 Enter (전체 1회 등장 시 초록 추가)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 shadow-sm"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
          >
            추가
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className={`text-xs ${feedback ? (feedback.ok ? 'text-green-600' : 'text-red-500') : 'text-transparent'}`}>
            {feedback?.msg ?? '.'}
          </p>
          {(totalGreen > 0 || excluded.size > 0) && (
            <button
              onClick={() => { saveCustom([]); saveExcluded(new Set()) }}
              className="text-xs text-gray-300 hover:text-red-400"
            >
              전체 초기화
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-bold text-gray-700">
          정답 목록 <span className="text-gray-400 font-normal">({problems.length}문제)</span>
        </h1>
        <p className="text-xs text-gray-400">
          <span className="text-green-600 font-semibold">초록</span> = 전체 1회 등장 단어 · 옆 <span className="text-red-400 font-bold">×</span> 로 제거
        </p>
      </div>

      <div className="space-y-4">
        {problems.map((p, qi) => {
          const correct = p.choices?.filter(c => c.is_correct) ?? []
          return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 px-4 py-5">
              <div className="flex items-baseline gap-3">
                <span className="text-xs font-semibold text-gray-400 shrink-0 w-8">Q{qi + 1}</span>
                <div className="flex flex-col gap-1 flex-1">
                  {correct.map(c => (
                    <p key={c.id} className="text-sm leading-relaxed">
                      <span className="font-bold text-gray-500 mr-1">{LETTERS[c.order_num]}.</span>
                      <HighlightedText
                        text={fmt(c.content)}
                        wordFreq={wordFreq}
                        customGreen={customGreen}
                        excluded={excluded}
                        onExcludeWord={onExcludeWord}
                        onRemovePhrase={onRemovePhrase}
                      />
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
