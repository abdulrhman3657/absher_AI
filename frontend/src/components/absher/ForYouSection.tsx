import { useState } from "react";
import { Sparkles, ChevronLeft, ChevronRight, Ban, Gavel, CarFront, FileBarChart, Shield } from "lucide-react";
import PersonalInsights from "./PersonalInsights";
import LocationServices from "./LocationServices";
import ActiveRequests from "./ActiveRequests";

const services = [
  {
    id: 1,
    icon: Shield,
    title: "إصدار شهادة خلو سوابق",
    isNew: true,
  },
  {
    id: 2,
    icon: FileBarChart,
    title: "تقارير أبشر",
    isNew: false,
  },
  {
    id: 3,
    icon: CarFront,
    title: "متابعة المركبات",
    isNew: false,
  },
  {
    id: 4,
    icon: Gavel,
    title: "مزاد اللوحات الإلكتروني",
    isNew: false,
  },
  {
    id: 5,
    icon: Ban,
    title: "إيقاف الخدمات وقيود السفر",
    isNew: false,
  },
];

const ForYouSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(services.length - 4, prev + 1));
  };

  return (
    <section className="py-8">
      {/* AI-Powered Section with Dotted Border */}
      <div className="relative border-2 border-dashed border-primary/30 rounded-3xl p-8 bg-gradient-to-br from-primary/[0.02] to-transparent mb-8">
        {/* خدمات مخصصة لك Section */}
        <div>
          {/* Section Header - Top Right */}
          <div className="flex items-center justify-end gap-3 mb-8">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">خدمات مخصصة لك</h2>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="space-y-8">
            <PersonalInsights />
            <LocationServices />
            <ActiveRequests />
          </div>
        </div>
      </div>

      {/* خدمات أخرى Section - Outside the dotted border */}
      <div>
        {/* Section Header with Lines */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handlePrev}
            className="w-10 h-10 rounded-full border-2 border-primary text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="h-px flex-1 bg-border" />

          <h2 className="text-xl font-bold text-foreground whitespace-nowrap">خدمات أخرى</h2>

          <div className="h-px flex-1 bg-border" />

          <button
            onClick={handleNext}
            className="w-10 h-10 rounded-full border-2 border-primary text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Carousel Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-2xl p-6 shadow-card cursor-pointer group relative flex flex-col items-center"
            >
              {service.isNew && (
                <span className="absolute top-3 right-3 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  جديد
                </span>
              )}

              <div className="service-icon-square mb-4 group-hover:border-primary transition-all duration-300">
                <service.icon className="w-7 h-7" strokeWidth={1.2} />
              </div>

              <h3 className="font-semibold text-foreground text-center text-sm leading-relaxed">
                {service.title}
              </h3>
            </div>
          ))}
        </div>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <div className="w-3 h-3 rounded-full bg-border" />
        </div>
      </div>
    </section>
  );
};

export default ForYouSection;
