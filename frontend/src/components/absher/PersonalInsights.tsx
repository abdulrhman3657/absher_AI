import { Users, CreditCard, Car, AlertCircle } from "lucide-react";

const insights = [
  {
    id: 1,
    icon: Users,
    title: "انتهت صلاحية جواز أحد أفراد الأسرة",
    description: "يجب تجديد جواز السفر قبل السفر",
    action: "اضغط للتجديد",
    urgent: true,
  },
  {
    id: 2,
    icon: CreditCard,
    title: "تبقى 20 يوم لانتهاء الهوية",
    description: "قم بتجديد الهوية الوطنية",
    action: "جدد الهوية",
    urgent: false,
  },
  {
    id: 3,
    icon: Car,
    title: "لديك مخالفة مرورية غير مسددة",
    description: "مخالفة تجاوز السرعة - 500 ريال",
    action: "ادفع الآن",
    urgent: true,
  },
];

const PersonalInsights = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">الاستباقية الشخصية</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight, index) => (
          <div
            key={insight.id}
            className="bg-white rounded-2xl p-5 shadow-card relative overflow-hidden animate-fade-in"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            {insight.urgent && (
              <div className="absolute top-0 left-0 w-full h-1 bg-status-pending" />
            )}
            
            <div className="flex flex-col h-full">
              {/* Square Dotted Icon */}
              <div className="service-icon-square mb-4 self-end">
                <insight.icon className="w-7 h-7" strokeWidth={1.2} />
              </div>
              
              <h4 className="font-bold text-foreground mb-2 leading-relaxed text-right">
                {insight.title}
              </h4>
              
              <p className="text-sm text-foreground-light mb-4 flex-1 text-right">
                {insight.description}
              </p>
              
              <button className="btn-primary w-full text-sm">
                {insight.action}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonalInsights;
