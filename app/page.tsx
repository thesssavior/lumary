import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function Home() {
  const hdrs = await headers();
  const acceptLanguage = hdrs.get('accept-language') ?? '';
  const supportedLocales = ['ko', 'en'];
  // Parse and normalize languages
  const langs = acceptLanguage
    .split(',')
    .map((lang: string) => {
      // take only the language code before region and trim whitespace (e.g. ' en-US' -> 'en')
      const code = lang.split(';')[0].trim();
      return code.split('-')[0].toLowerCase();
    });
  // Find first supported locale or fallback to 'ko'
  const locale = langs.find((l: string) => supportedLocales.includes(l)) ?? 'ko';
  redirect(`/${locale}`);
} 