import { Search, LogOut, Globe, User, Bell, LayoutDashboard, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "@/lib/api";

const navItems = [
  { icon: Globe, label: "English" },
  { icon: BookOpen, label: "دليل الخدمات" },
  { icon: Bell, label: "الاشعارات" },
  { icon: LayoutDashboard, label: "تعديل معلومات المستخدم" },
  { icon: User, label: "لوحة المعلومات" },
];

const Navigation = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-24">
          {/* Vision 2030 Logo */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <div className="w-8 h-10 flex flex-col gap-0.5">
                  <div className="flex gap-0.5">
                    <div className="w-2 h-2 bg-primary rounded-sm" />
                    <div className="w-2 h-2 bg-primary rounded-sm" />
                    <div className="w-2 h-2 bg-primary rounded-sm" />
                  </div>
                  <div className="flex gap-0.5">
                    <div className="w-2 h-2 bg-primary rounded-sm" />
                    <div className="w-2 h-2 bg-primary rounded-sm" />
                    <div className="w-2 h-2 bg-primary rounded-sm" />
                  </div>
                  <div className="flex gap-0.5">
                    <div className="w-2 h-2 bg-primary rounded-sm" />
                    <div className="w-2 h-2 bg-primary rounded-sm" />
                    <div className="w-2 h-2 bg-primary rounded-sm" />
                  </div>
                </div>
                <span className="text-primary font-bold text-xl">أبشر</span>
              </div>
            </div>
          </div>

          {/* Navigation Icons */}
          <div className="hidden lg:flex items-center gap-3">
            {navItems.map((item, index) => (
              <div key={index} className="nav-icon-box">
                <item.icon className="w-5 h-5 text-foreground-light" strokeWidth={1.5} />
                <span className="text-[10px] text-foreground-light">{item.label}</span>
              </div>
            ))}
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="nav-icon-box hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5 text-foreground-light" strokeWidth={1.5} />
              <span className="text-[10px] text-foreground-light">تسجيل الخروج</span>
            </button>
            
            {/* User Avatar */}
            <div className="nav-icon-box">
              <div className="w-8 h-8 rounded-full bg-amber-100 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-b from-amber-200 to-amber-300 flex items-center justify-center">
                  <User className="w-5 h-5 text-amber-700" />
                </div>
              </div>
              <span className="text-[10px] text-foreground-light">
                {currentUser?.name || "المستخدم"}
              </span>
            </div>
          </div>

          {/* Saudi Emblem */}
          <div className="w-16 h-16">
            <svg viewBox="0 0 100 100" className="w-full h-full text-primary" fill="currentColor">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M50 15 L55 30 L70 30 L58 40 L63 55 L50 45 L37 55 L42 40 L30 30 L45 30 Z" />
              <path d="M35 60 Q50 75 65 60" fill="none" stroke="currentColor" strokeWidth="3"/>
              <path d="M40 70 L50 85 L60 70" fill="none" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
        </div>
      </div>
      
      {/* Search Bar Section */}
      <div className="bg-background py-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center bg-white rounded-lg border border-border px-4 py-3 max-w-2xl">
            <button className="bg-muted px-4 py-2 rounded-lg text-sm font-medium text-foreground ml-3">
              بحث
            </button>
            <input 
              type="text" 
              placeholder="اكتب هنا للبحث"
              className="flex-1 outline-none text-sm placeholder:text-muted-foreground text-right"
            />
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
