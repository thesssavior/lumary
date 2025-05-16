'use client'

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Mail, MessageCircle, Send } from "lucide-react";
import { useTranslations } from 'next-intl';
import Image from 'next/image';

const ContactSection = () => {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: message, email: email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('contactSection.toastErrorGeneric'));
      }

      setSuccess(true);
      setEmail("");
      setMessage("");
      setTimeout(() => setSuccess(false), 5000);
    } catch (error: any) {
      setError(error.message || t('contactSection.toastErrorGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-10 mt-8">
      
      <div className="space-y-4">
        <div>
            <h2 className="text-xl font-semibold text-gray-900 my-2">{t('contactSection.directContactTitle')}</h2>
            <p className="text-gray-600">{t('contactSection.directContactDescription')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:w-3/4">
            <Card className="p-6 notion-card">
                <div className="flex items-center space-x-3">
                    <MessageCircle className="h-5 w-5 text-gray-700" />
                    <div className="flex items-center space-x-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-700">{t('contactSection.kakaoCardTitle')}</h3>
                            <a href="https://open.kakao.com/o/sip4wCwh" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {t('contactSection.kakaoHandle')}
                            </a>
                        </div>
                        <Image src="/openchat_qr.png" alt="KakaoTalk Open Chat QR Code" width={60} height={60} className="hidden md:block" />
                    </div>
                </div>
            </Card>

            <Card className="p-6 notion-card">
                <div className="flex items-center space-x-3 mt-2">
                    <Mail className="h-5 w-5 text-gray-700" />
                    <div>
                        <h3 className="text-sm font-medium text-gray-700">{t('contactSection.emailCardTitle')}</h3>
                        <a href="mailto:ssaviormessiah@gmail.com" className="text-blue-600 hover:underline">
                        {t('contactSection.emailAddress')}
                        </a>
                    </div>
                </div>
            </Card>
          
        </div>
      </div>

      <div className="space-y-6 lg:w-3/5">
        <h2 className="text-xl font-semibold text-gray-900">{t('contactSection.contactFeedbackTitle')}</h2>
        
        <Card className="p-6 notion-card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">{t('contactSection.emailLabel')}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('contactSection.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-gray-700">{t('contactSection.messageLabel')}</label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <MessageCircle className="h-4 w-4 text-gray-400" />
                  </div>
                  <Textarea
                    id="message"
                    placeholder={t('contactSection.messagePlaceholder')}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    className="min-h-[120px] pl-10"
                  />
                </div>
              </div>
            </div>

            {success && (
                <p className="text-sm text-green-600">{t('contactSection.toastMessageSentDescription')}</p>
            )}
            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex lg:justify-end">
                <Button 
                type="submit" 
                className="w-full lg:w-1/4"
                disabled={isSubmitting}
                >
                {isSubmitting ? (
                    t('contactSection.sendingButton')
                ) : (
                    <>
                    <Send className="h-4 w-4 mr-2" />
                    {t('contactSection.sendMessageButton')}
                    </>
                )}
                </Button>
            </div>
          </form>
        </Card>
      </div>

    </div>
  );
};

export default ContactSection;
