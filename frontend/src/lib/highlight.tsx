'use client'
import { useMemo } from 'react'
import { Problem, Lang } from './api'
import greenPhrasesData from './greenPhrases.json'

// 정답에서 선별한 핵심 문구(언어별). 전체 1회 등장하는 것만 등록됨.
export const DEFAULT_GREEN: Record<Lang, string[]> = greenPhrasesData as Record<Lang, string[]>

export const LS_CUSTOM = 'aip-custom-green'
export const LS_EXCLUDED = 'aip-excluded-green'

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

export function fmt(text: string) {
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

/** 해당 언어의 모든 선택지 텍스트 목록. (문제 본문은 제외 — 선택지에서만 비교) */
function problemTexts(p: Problem, lang: Lang): string[] {
  const choices = p.choices?.map(c => (lang === 'en' ? (c.content_en ?? c.content) : c.content)) ?? []
  return choices.map(fmt)
}

export function buildWordFreq(problems: Problem[], lang: Lang): Map<string, number> {
  const freq = new Map<string, number>()
  for (const p of problems) {
    for (const text of problemTexts(p, lang)) {
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

export function countPhrase(phrase: string, problems: Problem[], lang: Lang): number {
  const term = phrase.toLowerCase()
  let count = 0
  for (const p of problems) {
    for (const text of problemTexts(p, lang)) {
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

export function loadLS(key: string, fallback: string[] = []): string[] {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}

/** 기본(자동) 핵심 문구 + 사용자 추가 문구 병합. 긴 문구가 먼저 매칭되도록 길이순 정렬. */
export function mergeGreenPhrases(lang: Lang, customGreen: string[]): string[] {
  return [...(DEFAULT_GREEN[lang] ?? []), ...customGreen]
    .filter((p, i, arr) => arr.findIndex(q => q.toLowerCase() === p.toLowerCase()) === i)
    .sort((a, b) => b.length - a.length)
}

export function HighlightedText({
  text,
  wordFreq,
  customGreen,
  excluded,
  readOnly = false,
  onExcludeWord,
  onRemovePhrase,
}: {
  text: string
  wordFreq: Map<string, number>
  customGreen: string[]
  excluded: Set<string>
  readOnly?: boolean
  onExcludeWord?: (root: string) => void
  onRemovePhrase?: (p: string) => void
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
              {!readOnly && (
                <button
                  onClick={() => onRemovePhrase?.(seg.phrase!)}
                  className="text-red-400 hover:text-red-600 text-sm font-bold leading-none"
                >×</button>
              )}
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
                    {!readOnly && (
                      <button
                        onClick={() => onExcludeWord?.(root)}
                        className="text-red-400 hover:text-red-600 text-sm font-bold leading-none"
                      >×</button>
                    )}
                  </span>
                )
              }
              return <span key={ti} className={readOnly ? '' : 'text-gray-800'}>{token}</span>
            })}
          </span>
        )
      })}
    </>
  )
}
