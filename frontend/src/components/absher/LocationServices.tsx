import { Baby, Car, FileText, Building2, MapPin } from "lucide-react";

const services = [
  {
    id: 1,
    icon: Baby,
    title: "تسجيل مولود جديد",
    subtitle: "متاح في منطقتك الآن",
  },
  {
    id: 2,
    icon: Car,
    title: "نقل ملكية مركبة",
    subtitle: "خدمة سريعة في موقعك",
  },
  {
    id: 3,
    icon: FileText,
    title: "إصدار شهادة",
    subtitle: "الشهادات الحكومية",
  },
  {
    id: 4,
    icon: Building2,
    title: "خدمات عقارية",
    subtitle: "تسجيل وتوثيق العقارات",
  },
];

const LocationServices = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">حسب موقعك</h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {services.map((service, index) => (
          <div
            key={service.id}
            className="bg-white rounded-2xl p-5 shadow-card cursor-pointer group animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex flex-col items-end">
              <div className="flex items-start gap-2 mb-3 w-full justify-end">
                <div className="service-icon-square w-14 h-14 group-hover:border-primary transition-all duration-300">
                  <service.icon className="w-6 h-6" strokeWidth={1.2} />
                </div>
                <div className="location-dot mt-1" />
              </div>
              <h4 className="font-bold text-foreground text-sm mb-1 text-right">
                {service.title}
              </h4>
              <p className="text-xs text-foreground-light text-right">
                {service.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocationServices;
