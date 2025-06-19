import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function Footer() {
  const t = useTranslations();

  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-6 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex flex-wrap justify-center sm:justify-start gap-6 text-sm text-gray-600">
            <Link href="/business-info" className="hover:text-gray-900 font-medium">
              {t('Footer.businessInfo', { defaultValue: '사업자 정보 및 약관' })}
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            © 2024 Lumary. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
} 