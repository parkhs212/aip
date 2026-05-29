'use client'
import { useEffect, useState } from 'react'
import { api, Problem } from '@/lib/api'

const DIFFICULTY_COLOR: Record<string, string> = {
  '하': 'bg-green-100 text-green-700',
  '중': 'bg-yellow-100 text-yellow-700',
  '상': 'bg-red-100 text-red-700',
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [filterCat, setFilterCat] = useState('')
  const [filterDiff, setFilterDiff] = useState('')
  const [selected, setSelected] = useState<Problem | null>(null)

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    api.getProblems({ category: filterCat || undefined, difficulty: filterDiff || undefined })
      .then(setProblems).catch(() => {})
  }, [filterCat, filterDiff])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">문제 목록</h1>

      {/* 필터 */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">전체 카테고리</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">전체 난이도</option>
          {['하', '중', '상'].map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* 문제 목록 */}
      <div className="space-y-3">
        {problems.map(p => (
          <button key={p.id} onClick={() => setSelected(p)}
            className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-400 hover:shadow-sm transition">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-800">{p.title}</span>
              <div className="flex gap-2">
                {p.category && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">{p.category}</span>}
                <span className={`text-xs px-2 py-1 rounded ${DIFFICULTY_COLOR[p.difficulty ?? ''] || ''}`}>{p.difficulty}</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.content}</p>
          </button>
        ))}
        {problems.length === 0 && <p className="text-gray-400 text-center py-12">문제가 없습니다</p>}
      </div>

      {/* 문제 상세 모달 */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-2">{selected.title}</h2>
            <p className="text-gray-700 mb-4">{selected.content}</p>
            {selected.choices && (
              <div className="space-y-2">
                {selected.choices.map(c => (
                  <div key={c.id}
                    className={`p-3 rounded-lg border text-sm ${c.is_correct ? 'border-green-400 bg-green-50 font-medium text-green-800' : 'border-gray-200 text-gray-600'}`}>
                    {c.is_correct && <span className="mr-1">✓</span>}{c.content}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setSelected(null)}
              className="mt-4 w-full bg-gray-100 hover:bg-gray-200 py-2 rounded-lg text-sm">닫기</button>
          </div>
        </div>
      )}
    </div>
  )
}
