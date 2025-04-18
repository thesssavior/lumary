import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { Inter } from 'next/font/google';
import '../globals.css';
import { Navbar } from '@/components/navbar';
import SidebarLayout from '@/components/SidebarLayout';

const inter = Inter({ subsets: ['latin'] });

export function generateStaticParams() {
  return [
    { locale: 'ko' },
    { locale: 'en' }
  ];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const { locale = 'ko' } = resolvedParams;

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Navbar />
      <SidebarLayout>
        <div className="container mx-auto px-4 py-8 bg-white h-full">
          {children}
        </div>
      </SidebarLayout>
    </NextIntlClientProvider>
  );
}