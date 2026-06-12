'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, Problem, Lang, problemText, choiceText } from '@/lib/api'
import { useLang, LangToggle } from '@/lib/lang'
import { useNotes } from '@/lib/notes'
import {
  fmt, buildWordFreq, loadLS, mergeGreenPhrases,
  HighlightedText, LS_CUSTOM, LS_EXCLUDED,
} from '@/lib/highlight'

const LETTERS = 'ABCDEF'
const LS_HIGHLIGHT = 'aip-quiz-highlight'

export default function NotesPage() {
  const [lang, setLang] = useLang()
  const [problems, setProblems] = useState<Problem[]>([])
  const [wordFreqByLang, setWordFreqByLang] = useState<Record<Lang, Map<string, number>>>({ ko: new Map(), en: new Map() })
  const wordFreq = wordFreqByLang[lang]
  const [customGreen, setCustomGreen] = useState<string[]>([])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [highlightOn, setHighlightOn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { notes, remove, clearAll } = useNotes()

  useEffect(() => {
    api.getAllProblems()
      .then(ps => {
        setProblems(ps)
        setWordFreqByLang({ ko: buildWordFreq(ps, 'ko'), en: buildWordFreq(ps, 'en') })
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
    setCustomGreen(loadLS(LS_CUSTOM))
    setExcluded(new Set(loadLS(LS_EXCLUDED)))
    setHighlightOn(localStorage.getItem(LS_HIGHLIGHT) === '1')
  }, [])

  if (loading) return <div className="text-center py-20 text-gray-400">불러오는 중...</div>
  if (error) return <div className="text-center py-20 text-red-400">{error}</div>

  const greenPhrases = mergeGreenPhrases(lang, customGreen)

  // 노트에 담긴 문제만 추려서, 최근 등록 순으로 정렬
  const noted = problems
    .map((p, qi) => ({ p, qi }))
    .filter(({ p }) => !!notes[p.id])
    .sort((a, b) => (notes[b.p.id].ts ?? 0) - (notes[a.p.id].ts ?? 0))

  return (
    <div className="max-w-3xl mx-auto">
      <div className="sticky top-[53px] z-20 bg-gray-50 pb-3 pt-1 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-700">
              오답노트 <span className="text-gray-400 font-normal">({noted.length}문제)</span>
            </h1>
            <LangToggle lang={lang} setLang={setLang} />
          </div>
          {noted.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('오답노트를 전체 비울까요?')) clearAll()
              }}
              className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-400 hover:border-red-400 hover:bg-red-50 transition-colors"
            >
              전체 비우기
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          <span className="text-amber-500 font-semibold">★</span> 마킹한 문제와 틀린 문제가 모입니다 · 각 카드의{' '}
          <span className="text-red-400 font-bold">완료/제거</span>로 노트에서 뺄 수 있어요
        </p>
        {noted.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <Link
              href="/quiz?source=notes&mode=sequential"
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors"
            >
              오답노트 풀기
            </Link>
            <Link
              href="/quiz?source=notes&mode=random"
              className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 transition-colors"
            >
              랜덤으로 풀기
            </Link>
          </div>
        )}
      </div>

      {noted.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          아직 오답노트가 비어 있습니다.<br />
          순서대로/랜덤 풀기에서 <span className="text-amber-500 font-semibold">☆ 노트</span> 버튼으로 마킹하거나,
          틀린 문제가 자동으로 모입니다.
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {noted.map(({ p, qi }) => {
            const entry = notes[p.id]
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400">Q{qi + 1}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                        entry.reason === 'wrong'
                          ? 'bg-red-50 text-red-500'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {entry.reason === 'wrong' ? '오답' : '마킹'}
                    </span>
                  </div>
                  <button
                    onClick={() => remove(p.id)}
                    title="오답노트에서 제거"
                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    완료 / 제거
                  </button>
                </div>

                <p className="text-gray-800 leading-relaxed text-sm sm:text-base mb-3">
                  {fmt(problemText(p, lang))}
                </p>

                <div className="space-y-1.5">
                  {p.choices?.map(c => {
                    const cls = c.is_correct
                      ? 'border-2 border-green-400 bg-green-50 text-green-800'
                      : 'border border-gray-100 bg-gray-50 text-gray-400'
                    return (
                      <div key={c.id} className={`px-3 py-2 rounded-xl text-sm ${cls}`}>
                        <span className="font-bold mr-1.5">{LETTERS[c.order_num]}.</span>
                        {highlightOn && c.is_correct ? (
                          <HighlightedText
                            text={fmt(choiceText(c, lang))}
                            wordFreq={wordFreq}
                            customGreen={greenPhrases}
                            excluded={excluded}
                            readOnly
                          />
                        ) : (
                          fmt(choiceText(c, lang))
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
