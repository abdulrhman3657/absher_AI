import { Monitor, FileCheck, Wallet, ChevronLeft } from "lucide-react";

const menuItems = [
  {
    id: 1,
    icon: Monitor,
    title: "الخدمات الإلكترونية",
    active: true,
  },
  {
    id: 2,
    icon: FileCheck,
    title: "التفويضات",
    active: false,
  },
  {
    id: 3,
    icon: FileCheck,
    title: "استبيانات أبشر",
    active: false,
  },
  {
    id: 4,
    icon: Wallet,
    title: "المدفوعات الحكومية",
    active: false,
  },
];

const Sidebar = () => {
  return (
    <div className="bg-white rounded-2xl shadow-card p-2 w-full">
      {menuItems.map((item) => (
        <div
          key={item.id}
          className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
            item.active 
              ? "bg-primary/5 border-r-4 border-primary" 
              : "hover:bg-muted"
          }`}
        >
          <ChevronLeft className={`w-5 h-5 ${item.active ? "text-primary" : "text-muted-foreground"}`} />
          <div className="flex items-center gap-3">
            <span className={`font-medium ${item.active ? "text-primary" : "text-foreground"}`}>
              {item.title}
            </span>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              item.active ? "bg-primary/10" : "bg-muted"
            }`}>
              <item.icon className={`w-5 h-5 ${item.active ? "text-primary" : "text-foreground-light"}`} strokeWidth={1.5} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Sidebar;
