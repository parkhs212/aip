'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { api, Problem } from '@/lib/api'

const LETTERS = 'ABCDEF'

function fmt(text: string) {
  return text.replace(/\n/g, ' ').replace(/ {2,}/g, ' ').trim()
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function QuizContent() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') === 'random' ? 'random' : 'sequential'

  const [problems, setProblems] = useState<Problem[]>([])
  const [order, setOrder] = useState<number[]>([])
  const [cursor, setCursor] = useState(0)
  const [selectedSet, setSelectedSet] = useState<Set<number>>(new Set())
  const [submitted, setSubmitted] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getAllProblems()
      .then(ps => {
        setProblems(ps)
        const idx = Array.from({ length: ps.length }, (_, i) => i)
        setOrder(mode === 'random' ? shuffle(idx) : idx)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [mode])

  const reset = () => { setSelectedSet(new Set()); setSubmitted(false); setShowAnswer(false) }
  const goNext = () => { if (cursor < problems.length - 1) { setCursor(c => c + 1); reset() } }
  const goPrev = () => { if (cursor > 0) { setCursor(c => c - 1); reset() } }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (loading) return <div className="text-center py-20 text-gray-400">불러오는 중...</div>
  if (error) return <div className="text-center py-20 text-red-400">{error}</div>

  const problem = problems[order[cursor]]
  if (!problem) return null

  const correctCount = problem.choices?.filter(c => c.is_correct).length ?? 0
  const isMulti = correctCount > 1
  const answered = submitted || (!isMulti && selectedSet.size > 0)

  const toggleChoice = (choiceId: number, isCorrect: boolean) => {
    if (answered || showAnswer) return
    if (!isMulti) {
      setSelectedSet(new Set([choiceId]))
      setSubmitted(true)
    } else {
      setSelectedSet(prev => {
        const next = new Set(prev)
        if (next.has(choiceId)) next.delete(choiceId)
        else next.add(choiceId)
        return next
      })
    }
  }

  const handleSubmit = () => {
    if (isMulti && selectedSet.size > 0 && !answered) setSubmitted(true)
  }

  const isAllCorrect = (() => {
    if (!answered) return null
    const correctIds = new Set(problem.choices?.filter(c => c.is_correct).map(c => c.id))
    if (selectedSet.size !== correctIds.size) return false
    for (const id of selectedSet) if (!correctIds.has(id)) return false
    return true
  })()

  const qNum = order[cursor] + 1
  const progress = ((cursor + 1) / problems.length) * 100
  const modeColor = mode === 'random' ? 'text-indigo-500' : 'text-blue-500'
  const barColor = mode === 'random' ? 'bg-indigo-500' : 'bg-blue-500'
  const nextColor = mode === 'random'
    ? 'bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200'
    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200'

  return (
    <div className="max-w-2xl mx-auto">
      {/* 모드 + 진행률 */}
      <div className="flex items-center justify-between text-xs mb-2">
        <span className={`font-semibold ${modeColor}`}>
          {mode === 'random' ? '랜덤 풀기' : '순서대로 풀기'}
        </span>
        <span className="text-gray-400">{cursor + 1} / {problems.length} · Q{qNum}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1 mb-6">
        <div className={`h-1 rounded-full transition-all ${barColor}`} style={{ width: `${progress}%` }} />
      </div>

      {/* 문제 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-3">
        {isMulti && (
          <p className="text-xs font-semibold text-amber-500 mb-2">{correctCount}개를 선택하세요</p>
        )}
        <p className="text-gray-800 leading-relaxed text-sm sm:text-base">
          {fmt(problem.content)}
        </p>
      </div>

      {/* 선택지 */}
      <div className="space-y-2 mb-4">
        {problem.choices?.map((c, i) => {
          const isSelected = selectedSet.has(c.id)
          let cls = 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'

          if (answered) {
            if (c.is_correct && isSelected) {
              cls = 'border-2 border-green-500 bg-green-50 text-green-800'
            } else if (!c.is_correct && isSelected) {
              cls = 'border-2 border-red-400 bg-red-50 text-red-800'
            } else if (c.is_correct && !isSelected) {
              cls = 'border-2 border-green-400 bg-green-50 text-green-700'
            } else {
              cls = 'border border-gray-100 bg-gray-50 text-gray-300 cursor-default'
            }
          } else if (showAnswer) {
            cls = c.is_correct
              ? 'border-2 border-blue-500 bg-blue-50 text-blue-800 font-medium'
              : 'border border-gray-100 bg-gray-50 text-gray-300 cursor-default'
          } else if (isSelected) {
            cls = 'border-2 border-amber-400 bg-amber-50 text-amber-800 cursor-pointer'
          }

          return (
            <button
              key={c.id}
              onClick={() => toggleChoice(c.id, c.is_correct)}
              disabled={answered || showAnswer}
              className={`w-full text-left px-4 py-3 rounded-xl transition-colors text-sm sm:text-base ${cls}`}
            >
              <span className="font-bold mr-2">{LETTERS[i]}.</span>
              {fmt(c.content)}
            </button>
          )
        })}
      </div>

      {/* 복수 선택 제출 버튼 */}
      {isMulti && !answered && !showAnswer && (
        <button
          onClick={handleSubmit}
          disabled={selectedSet.size === 0}
          className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 disabled:bg-gray-200 disabled:cursor-default transition-colors mb-4"
        >
          제출 ({selectedSet.size}/{correctCount})
        </button>
      )}

      {/* 결과 메시지 */}
      {answered && isAllCorrect !== null && (
        <p className={`text-center text-sm font-semibold mb-4 ${isAllCorrect ? 'text-green-600' : 'text-red-500'}`}>
          {isAllCorrect ? '정답입니다!' : '오답입니다.'}
        </p>
      )}

      {/* 하단 버튼: 이전 | 정답보기 | 다음 */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={goPrev}
          disabled={cursor === 0}
          className="flex-1 px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:text-gray-200 disabled:border-gray-100 disabled:cursor-default font-medium text-sm transition-colors"
        >
          ← 이전
        </button>

        <button
          onClick={() => { if (!answered) setShowAnswer(v => !v) }}
          disabled={answered}
          className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
            answered
              ? 'bg-gray-100 text-gray-300 cursor-default'
              : showAnswer
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {showAnswer ? '정답 숨기기' : '정답 보기'}
        </button>

        <button
          onClick={goNext}
          disabled={cursor === problems.length - 1}
          className={`flex-1 px-4 py-3 rounded-xl text-white font-medium text-sm transition-colors ${nextColor} disabled:cursor-default`}
        >
          다음 →
        </button>
      </div>
    </div>
  )
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">불러오는 중...</div>}>
      <QuizContent />
    </Suspense>
  )
}
