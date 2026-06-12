'use client'
import { useCallback, useEffect, useState } from 'react'

export const LS_KNOWN = 'aip-known-ids'
const CHANGED_EVENT = 'aip-known-changed'

/** '확실히 아는 문제' id 집합을 localStorage에서 로드. */
export function loadKnown(): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(LS_KNOWN)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed as number[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveKnown(s: Set<number>) {
  localStorage.setItem(LS_KNOWN, JSON.stringify([...s]))
  // 같은 탭 내 다른 컴포넌트들이 즉시 갱신되도록 커스텀 이벤트 발행
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

/** '확실히 아는 문제'(복습 대상에서 제외)를 localStorage로 관리하는 훅. */
export function useKnown() {
  const [known, setKnown] = useState<Set<number>>(new Set())

  useEffect(() => {
    setKnown(loadKnown())
    const onChange = () => setKnown(loadKnown())
    window.addEventListener(CHANGED_EVENT, onChange)
    window.addEventListener('storage', onChange) // 다른 탭에서의 변경
    return () => {
      window.removeEventListener(CHANGED_EVENT, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  /** 아는 문제 토글: 있으면 제거(다시 복습 대상), 없으면 추가(복습에서 제외). */
  const toggle = useCallback((id: number) => {
    setKnown(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveKnown(next)
      return next
    })
  }, [])

  /** 아는 문제로 등록. */
  const add = useCallback((id: number) => {
    setKnown(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveKnown(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setKnown(() => {
      saveKnown(new Set())
      return new Set()
    })
  }, [])

  return { known, toggle, add, clearAll }
}
