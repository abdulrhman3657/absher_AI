import Navigation from "@/components/absher/Navigation";
import MainCategories from "@/components/absher/MainCategories";
import Sidebar from "@/components/absher/Sidebar";
import ForYouSection from "@/components/absher/ForYouSection";
import Footer from "@/components/absher/Footer";
import ChatbotWidget from "@/components/absher/ChatbotWidget";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            <MainCategories />
            <ForYouSection />
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block w-72">
            <Sidebar />
          </div>
        </div>
      </main>

      <Footer />
      <ChatbotWidget />
    </div>
  );
};

export default Index;
