import React from 'react';
import { useTranslations } from 'next-intl';
import { Building2, Phone, Mail, MapPin, FileText, User } from 'lucide-react';

export default function BusinessInfoPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          {/* <Building2 className="w-8 h-8 text-blue-600" /> */}
          사업자 정보
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Company Information */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2">
              기업 정보
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <dt className="font-medium text-gray-700">상호명</dt>
                  <dd className="text-gray-600">루마리</dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <dt className="font-medium text-gray-700">대표자명</dt>
                  <dd className="text-gray-600">조승주</dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <dt className="font-medium text-gray-700">사업자등록번호</dt>
                  <dd className="text-gray-600">411-17-64537</dd>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2">
              연락처 정보
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <dt className="font-medium text-gray-700">사업장 주소</dt>
                  <dd className="text-gray-600">한양대학로 55 한양대학교 ERICA 창업보육센터 내 219-2호 날리지 랩(Knowledge Lab)</dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <dt className="font-medium text-gray-700">전화번호</dt>
                  <dd className="text-gray-600">010-4842-8226</dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <dt className="font-medium text-gray-700">이메일</dt>
                  <dd className="text-gray-600">ssaviormessiah@gmail.com</dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Business Information */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            추가 사업자 정보
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <dt className="font-medium text-gray-700 mb-1">업종</dt>
              <dd>정보통신업</dd>
            </div>
            
            <div>
              <dt className="font-medium text-gray-700 mb-1">개업일자</dt>
              <dd>2025-04-21</dd>
            </div>
            
            <div>
              <dt className="font-medium text-gray-700 mb-1">사업자상태</dt>
              <dd>사업중</dd>
            </div>
            
            <div>
              <dt className="font-medium text-gray-700 mb-1">과세유형</dt>
              <dd>일반과세</dd>
            </div>
          </div>
        </div>

        {/* Legal Notice */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>법적 고지:</strong> 이 정보는 전자상거래법 및 관련 법령에 따라 제공되는 사업자 정보입니다. 
            </p>
          </div>
        </div>

        {/* Related Links */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">관련 정보</h2>
          <div className="flex flex-wrap gap-4">
            <a 
              href="/terms" 
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              이용약관
            </a>
            <a 
              href="/privacy" 
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              개인정보처리방침
            </a>
            <a 
              href="https://www.ftc.go.kr/bizCommPop.do" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              사업자정보확인 (공정거래위원회)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 