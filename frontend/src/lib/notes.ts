'use client'
import { useCallback, useEffect, useState } from 'react'

export const LS_NOTES = 'aip-review-notes'

/** 노트 등록 사유: 'marked' = 직접 마킹, 'wrong' = 오답 자동 등록 */
export type NoteReason = 'marked' | 'wrong'
export interface NoteEntry { reason: NoteReason; ts: number }
export type NotesMap = Record<number, NoteEntry>

const CHANGED_EVENT = 'aip-notes-changed'

export function loadNotes(): NotesMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LS_NOTES)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as NotesMap) : {}
  } catch {
    return {}
  }
}

function saveNotes(notes: NotesMap) {
  localStorage.setItem(LS_NOTES, JSON.stringify(notes))
  // 같은 탭 내 다른 컴포넌트들이 즉시 갱신되도록 커스텀 이벤트 발행
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

/** 오답노트(마킹 + 오답)를 localStorage로 관리하는 훅. */
export function useNotes() {
  const [notes, setNotes] = useState<NotesMap>({})

  useEffect(() => {
    setNotes(loadNotes())
    const onChange = () => setNotes(loadNotes())
    window.addEventListener(CHANGED_EVENT, onChange)
    window.addEventListener('storage', onChange) // 다른 탭에서의 변경
    return () => {
      window.removeEventListener(CHANGED_EVENT, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  /** 직접 마킹 토글: 이미 노트에 있으면 제거, 없으면 'marked'로 추가. */
  const toggleMark = useCallback((id: number) => {
    setNotes(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = { reason: 'marked', ts: Date.now() }
      saveNotes(next)
      return next
    })
  }, [])

  /** 오답 자동 등록: 이미 있으면(마킹 포함) 그대로 둔다. */
  const addWrong = useCallback((id: number) => {
    setNotes(prev => {
      if (prev[id]) return prev
      const next = { ...prev, [id]: { reason: 'wrong' as NoteReason, ts: Date.now() } }
      saveNotes(next)
      return next
    })
  }, [])

  /** 노트에서 제거(오답노트 탭에서 더 이상 안 보이게). */
  const remove = useCallback((id: number) => {
    setNotes(prev => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      saveNotes(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setNotes(() => {
      saveNotes({})
      return {}
    })
  }, [])

  return { notes, toggleMark, addWrong, remove, clearAll }
}
