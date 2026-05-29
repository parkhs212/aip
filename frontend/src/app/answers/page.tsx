'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export default function AnswersPage() {
  const [, setLoaded] = useState(false)

  useEffect(() => {
    api.getAllProblems().then(() => setLoaded(true))
  }, [])

  return (
    <div className="max-w-3xl mx-auto py-20 text-center text-gray-400">
      준비 중입니다.
    </div>
  )
}
