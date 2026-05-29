'use client'
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">AWS AIP-C01</h1>
      <p className="text-gray-400 mb-12 text-sm">97문제</p>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <a
          href="/quiz?mode=sequential"
          className="flex-1 bg-blue-600 text-white px-6 py-5 rounded-2xl hover:bg-blue-700 font-semibold text-lg shadow-sm transition-colors"
        >
          순서대로 풀기
        </a>
        <a
          href="/quiz?mode=random"
          className="flex-1 bg-indigo-500 text-white px-6 py-5 rounded-2xl hover:bg-indigo-600 font-semibold text-lg shadow-sm transition-colors"
        >
          랜덤 풀기
        </a>
        <a
          href="/answers"
          className="flex-1 bg-white text-gray-700 border border-gray-200 px-6 py-5 rounded-2xl hover:bg-gray-50 font-semibold text-lg shadow-sm transition-colors"
        >
          정답 보기
        </a>
      </div>
    </div>
  )
}
