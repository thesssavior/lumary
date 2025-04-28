import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations(); // Keep for potential future use or remove if not needed
  
  return (
    <main className="min-h-screen bg-white text-black flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-3xl font-bold mb-4">서버 점검 중</h1>
        <p className="text-xl text-gray-600">죄송합니다 서둘러 고치겠습니다ㅠㅠ</p>
      </div>
    </main>
  );
} 