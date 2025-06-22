import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  if (!locale) {
    locale = 'ko'; // Default to Korean
  }
  return {
    messages: (await import(`@/messages/${locale}.json`)).default,
    locale,
    timeZone: 'Asia/Seoul' // Add default timezone to prevent markup mismatches
  };
}); 