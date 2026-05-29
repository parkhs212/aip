import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'AWS AIP-C01 스터디',
  description: 'AWS AIP-C01 시험 문제 학습',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-6 sticky top-0 z-10">
          <Link href="/" className="font-bold text-lg text-blue-600">AIP-C01</Link>
          <Link href="/quiz?mode=sequential" className="text-sm text-gray-600 hover:text-blue-600 font-medium">순서대로</Link>
          <Link href="/quiz?mode=random" className="text-sm text-gray-600 hover:text-indigo-600 font-medium">랜덤</Link>
          <Link href="/answers" className="text-sm text-gray-600 hover:text-gray-900 font-medium">정답보기</Link>
        </nav>
        <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
