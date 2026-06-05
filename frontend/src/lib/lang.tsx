'use client'
import { useEffect, useState } from 'react'
import type { Lang } from './api'

const LS_LANG = 'aip-lang'

/** 한/영 언어 상태를 localStorage에 유지하며 공유. */
export function useLang(): [Lang, (l: Lang) => void, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>('ko')

  useEffect(() => {
    const saved = (typeof localStorage !== 'undefined' && localStorage.getItem(LS_LANG)) as Lang | null
    if (saved === 'ko' || saved === 'en') setLangState(saved)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(LS_LANG, l) } catch {}
  }
  const toggle = () => setLang(lang === 'ko' ? 'en' : 'ko')

  return [lang, setLang, toggle]
}

/** 한국어 / English 토글 버튼. */
export function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="inline-flex rounded-full border border-gray-200 bg-white p-0.5 text-xs font-semibold shadow-sm">
      {(['ko', 'en'] as Lang[]).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-3 py-1 rounded-full transition-colors ${
            lang === l ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {l === 'ko' ? '한국어' : 'EN'}
        </button>
      ))}
    </div>
  )
}
