import { Briefcase, Car, Users, UserCheck, Calendar } from "lucide-react";

const categories = [
  {
    id: 1,
    title: "خدماتي",
    icon: Briefcase,
  },
  {
    id: 2,
    title: "المركبات",
    icon: Car,
  },
  {
    id: 3,
    title: "أفراد الأسرة",
    icon: Users,
  },
  {
    id: 4,
    title: "العمالة",
    icon: UserCheck,
  },
  {
    id: 5,
    title: "مواعيد",
    icon: Calendar,
  },
];

const MainCategories = () => {
  return (
    <section className="py-8">
      <div className="flex justify-center gap-6 flex-wrap">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className="flex flex-col items-center gap-4 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Square Dotted Icon */}
            <div className="service-icon group-hover:border-primary transition-all duration-300">
              <category.icon className="w-10 h-10" strokeWidth={1.2} />
            </div>
            
            {/* Green Button */}
            <button className="btn-primary min-w-[140px] text-sm py-3 rounded-lg">
              {category.title}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MainCategories;
