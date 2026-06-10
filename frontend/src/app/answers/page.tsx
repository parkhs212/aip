'use client'
import { useEffect, useState } from 'react'
import { api, Problem, Lang, choiceText } from '@/lib/api'
import { useLang, LangToggle } from '@/lib/lang'
import {
  fmt, buildWordFreq, countPhrase, loadLS, mergeGreenPhrases,
  HighlightedText, LS_CUSTOM, LS_EXCLUDED,
} from '@/lib/highlight'

const LETTERS = 'ABCDEF'

export default function AnswersPage() {
  const [lang, setLang] = useLang()
  const [problems, setProblems] = useState<Problem[]>([])
  const [wordFreqByLang, setWordFreqByLang] = useState<Record<Lang, Map<string, number>>>({ ko: new Map(), en: new Map() })
  const wordFreq = wordFreqByLang[lang]
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
        setWordFreqByLang({ ko: buildWordFreq(ps, 'ko'), en: buildWordFreq(ps, 'en') })
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
    const count = countPhrase(phrase, problems, lang)
    if (count === 1) {
      if (!customGreen.includes(phrase)) saveCustom([...customGreen, phrase])
      const ex = new Set(excluded); ex.delete(phrase.toLowerCase()); saveExcluded(ex)
      setFeedback({ msg: `"${phrase}" 추가됨`, ok: true })
    } else if (count === 0) {
      setFeedback({ msg: `"${phrase}" — 찾을 수 없음`, ok: false })
    } else {
      setFeedback({ msg: `"${phrase}" — 선택지에 ${count}회 등장 (1회만 가능)`, ok: false })
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

  const greenPhrases = mergeGreenPhrases(lang, customGreen)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="sticky top-[53px] z-20 bg-gray-50 pb-3 pt-1 border-b border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="추가할 문구 입력 후 Enter (선택지에 1회 등장 시 초록 추가)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 shadow-sm"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
          >
            추가
          </button>
        </div>
        <p className={`text-xs mt-1.5 ${feedback ? (feedback.ok ? 'text-green-600' : 'text-red-500') : 'text-transparent'}`}>
          {feedback?.msg ?? '.'}
        </p>

        <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold text-gray-700">
            정답 목록 <span className="text-gray-400 font-normal">({problems.length}문제)</span>
          </h1>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400">
            <span className="text-green-600 font-semibold">초록</span> = 선택지에 1회 등장 단어 · 옆 <span className="text-red-400 font-bold">×</span> 로 제거
          </p>
          {(totalGreen > 0 || excluded.size > 0) && (
            <button
              onClick={() => {
                if (window.confirm('초록 강조 단어와 제외 목록을 모두 초기화할까요?')) {
                  saveCustom([]); saveExcluded(new Set())
                }
              }}
              className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-400 hover:border-red-400 hover:bg-red-50 transition-colors"
            >
              전체 초기화
            </button>
          )}
        </div>
        </div>
      </div>

      <div className="space-y-4 mt-4">
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
                        text={fmt(choiceText(c, lang))}
                        wordFreq={wordFreq}
                        customGreen={greenPhrases}
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
