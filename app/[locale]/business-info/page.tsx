import React from 'react';
import { useTranslations } from 'next-intl';
import { Building2, Phone, Mail, MapPin, FileText, User, Shield, DollarSign, Calendar, ExternalLink } from 'lucide-react';

export default function BusinessInfoPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          {/* <Building2 className="w-8 h-8 text-blue-600" /> */}
          사업자 정보 및 약관
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

        {/* Privacy Policy */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            {/* <Shield className="w-7 h-7 text-blue-600" /> */}
            개인정보처리방침 (Privacy Policy)
          </h1>
          
          <div className="flex items-center gap-2 text-gray-600 mb-6">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">시행일자: 2025-06-19</span>
          </div>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 mb-6">
              <strong>Lumary(이하 "회사")</strong>는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수하고 있습니다. 
              본 개인정보처리방침은 Lumary에서 제공하는 웹 기반 요약 서비스(이하 "서비스") 이용 시, 사용자의 개인정보가 어떻게 수집, 이용, 보관, 보호되는지를 안내합니다.
            </p>

            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                  제1조 (수집하는 개인정보 항목)
                </h3>
                <p className="mb-3">회사는 다음과 같은 개인정보를 수집할 수 있습니다:</p>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-700">회원가입 및 로그인 시</h4>
                    <ul className="list-disc list-inside text-gray-600 ml-4">
                      <li>이메일 주소 (OAuth 또는 이메일 로그인 시)</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700">서비스 이용 과정에서 자동 수집되는 정보</h4>
                    <ul className="list-disc list-inside text-gray-600 ml-4">
                      <li>IP 주소, 브라우저 정보, 접속 일시, 사용 이력 등 로그 데이터</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700">결제 처리 시 (제3자 결제 모듈을 통해 수집되며, 회사가 직접 보관하지 않음)</h4>
                    <ul className="list-disc list-inside text-gray-600 ml-4">
                      <li>거래 ID, 결제 금액, 결제 상태 등</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                  제2조 (개인정보의 수집 및 이용 목적)
                </h3>
                <p className="mb-3">회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                  <li>서비스 제공, 사용자 인증, 로그인 유지</li>
                  <li>유료 서비스 결제 및 환불 처리</li>
                  <li>고객 문의 응대 및 기술 지원</li>
                  <li>서비스 개선을 위한 통계 분석 및 사용자 피드백 반영</li>
                  <li>법령상 의무 이행</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                  제3조 (개인정보의 보유 및 이용 기간)
                </h3>
                <p className="mb-3 text-sm">회원탈퇴 시, 회사는 개인정보를 즉시 파기합니다.</p>
                <p className="mb-3 text-sm">단, 다음과 같은 정보는 관련 법령에 따라 일정 기간 보관됩니다:</p>
                
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <h4 className="font-medium text-gray-700 mb-2">전자상거래 등에서의 소비자 보호에 관한 법률</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
                    <li>대금 결제 및 재화 등의 공급에 관한 기록: 5년</li>
                    <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                  제4조 (개인정보 보호책임자)
                </h3>
                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-700">성명: 조승주</p>
                      <p className="text-gray-600">이메일: <a href="mailto:lumary.help@gmail.com" className="text-blue-600 hover:text-blue-800 underline">lumary.help@gmail.com</a></p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Refund Policy */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            {/* <DollarSign className="w-7 h-7 text-green-600" /> */}
            환불 규정 (Refund Policy)
          </h1>
          
          <div className="flex items-center gap-2 text-gray-600 mb-6">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">시행일자: 2025-06-19</span>
          </div>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 mb-6">
              <strong>Lumary(이하 "회사")</strong>의 유료 서비스 이용과 관련된 환불 정책을 다음과 같이 안내드립니다.
            </p>

            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                  제1조 (환불 가능 조건)
                </h3>
                <p className="mb-3 text-sm">다음의 조건을 모두 만족할 경우 전액 환불이 가능합니다:</p>
                
                <div className="bg-green-50 p-3 rounded-lg text-sm">
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>결제일로부터 <strong>7일 이내</strong></li>
                    <li>해당 기간 동안 <strong>요약 기능을 한 번도 사용하지 않은 경우</strong></li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                  제2조 (환불 불가 조건)
                </h3>
                <p className="mb-3 text-sm">다음의 경우에는 환불이 제한될 수 있습니다:</p>
                
                <div className="bg-red-50 p-3 rounded-lg text-sm">
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>요약 기능을 1회 이상 사용한 경우</li>
                    <li>단순 변심, 실수로 인한 구매</li>
                    <li>무료 체험 기간이 제공된 후 결제된 경우</li>
                    <li>제3자 결제 서비스의 정책상 환불이 불가능한 경우</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                  제3조 (환불 신청 절차)
                </h3>
                <p className="mb-3 text-sm">환불을 원하실 경우, 다음 정보를 포함하여 <a href="mailto:lumary.help@gmail.com" className="text-blue-600 hover:text-blue-800 underline">lumary.help@gmail.com</a>으로 문의해주세요:</p>
                
                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>이름 / 이메일</li>
                    <li>결제 일자 및 영수증 (가능한 경우)</li>
                    <li>환불 사유</li>
                  </ul>
                </div>
                
                <p className="mt-3 text-gray-600 text-sm">
                  회사는 신청 접수 후 <strong>영업일 기준 3일 이내</strong>에 회신 및 환불 여부를 안내드립니다.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                  제4조 (정기결제 해지 안내)
                </h3>
                
                <div className="bg-amber-50 p-3 rounded-lg text-sm">
                  <p className="text-gray-700 mb-2">
                    사용자는 언제든지 다음 링크를 통해 정기결제를 해지할 수 있습니다:
                  </p>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                    <a 
                      href="https://lumary.lemonsqueezy.com/billing" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      https://lumary.lemonsqueezy.com/billing
                    </a>
                  </div>
                  
                  <p className="text-gray-600">
                    해지 후에도 구독 만료일까지는 프리미엄 기능을 사용할 수 있습니다.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Related Links */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">관련 정보</h2>
          <div className="flex flex-wrap gap-4">
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