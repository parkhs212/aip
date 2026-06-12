'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, Problem, Lang, problemText, choiceText } from '@/lib/api'
import { useLang, LangToggle } from '@/lib/lang'
import { useKnown } from '@/lib/known'
import {
  fmt, buildWordFreq, loadLS, mergeGreenPhrases,
  HighlightedText, LS_CUSTOM, LS_EXCLUDED,
} from '@/lib/highlight'

const LETTERS = 'ABCDEF'
const LS_HIGHLIGHT = 'aip-quiz-highlight'

export default function ReviewPage() {
  const [lang, setLang] = useLang()
  const [problems, setProblems] = useState<Problem[]>([])
  const [wordFreqByLang, setWordFreqByLang] = useState<Record<Lang, Map<string, number>>>({ ko: new Map(), en: new Map() })
  const wordFreq = wordFreqByLang[lang]
  const [customGreen, setCustomGreen] = useState<string[]>([])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [highlightOn, setHighlightOn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { known, toggle, clearAll } = useKnown()

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

  // 아직 '알아요' 체크하지 않은 문제만, 원래 문제 순서대로
  const remaining = problems
    .map((p, qi) => ({ p, qi }))
    .filter(({ p }) => !known.has(p.id))

  return (
    <div className="max-w-3xl mx-auto">
      <div className="sticky top-[53px] z-20 bg-gray-50 pb-3 pt-1 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-700">
              복습 <span className="text-gray-400 font-normal">({remaining.length}문제)</span>
            </h1>
            <LangToggle lang={lang} setLang={setLang} />
          </div>
          {known.size > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`'알아요'로 뺀 ${known.size}문제를 다시 모두 복습 대상으로 되돌릴까요?`)) clearAll()
              }}
              className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 hover:bg-gray-100 transition-colors"
            >
              아는 문제 초기화 ({known.size})
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          확실히 아는 문제를 <span className="text-green-600 font-semibold">✓ 알아요</span>로 빼면, 모르는 문제만 남습니다
        </p>
        {remaining.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <Link
              href="/quiz?source=review&mode=sequential"
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              남은 문제 풀기
            </Link>
            <Link
              href="/quiz?source=review&mode=random"
              className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 transition-colors"
            >
              랜덤으로 풀기
            </Link>
          </div>
        )}
      </div>

      {remaining.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          {problems.length === 0
            ? '문제가 없습니다.'
            : '모든 문제를 ✓ 알아요로 체크했어요! 🎉'}
          {known.size > 0 && (
            <><br />위의 <span className="text-gray-500">아는 문제 초기화</span>로 다시 시작할 수 있어요.</>
          )}
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {remaining.map(({ p, qi }) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400">Q{qi + 1}</span>
                <button
                  onClick={() => toggle(p.id)}
                  title="확실히 아는 문제로 빼기"
                  className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                >
                  ✓ 알아요
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
          ))}
        </div>
      )}
    </div>
  )
}
