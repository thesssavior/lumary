import FeatureBoard from "@/components/community/FeatureBoard";
import ContactSection from "@/components/community/ContactSection";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CommunityPage = () => {
  const t = useTranslations();

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <section className="space-y-4">
            <h1 className="text-3xl font-semibold text-gray-900">{t('communityPage.title')}</h1>
            <p className="text-gray-600">
              {t('communityPage.description')}
            </p>
          </section>

          <Tabs defaultValue="contact" className="w-full ">
            <TabsList className="grid lg:w-1/4 grid-cols-2">
              <TabsTrigger value="contact" className="data-[state=active]:bg-black data-[state=active]:text-white">{t('communityPage.contactTab')}</TabsTrigger>
              <TabsTrigger value="feature-board" className="data-[state=active]:bg-black data-[state=active]:text-white">{t('communityPage.featureBoardTab')}</TabsTrigger>
            </TabsList>
            <TabsContent value="contact">
              <ContactSection />
            </TabsContent>
            <TabsContent value="feature-board">
              <FeatureBoard />
            </TabsContent>
          </Tabs>
          
          <Separator className="my-8" />
          
          {/* <footer className="text-center text-gray-500 text-sm">
            <p>{t('communityPage.footerText')}</p>
          </footer> */}
        </div>
      </main>
    </div>
  );
};

export default CommunityPage;
