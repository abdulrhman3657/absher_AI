import { Phone, Eye, Plus, Minus } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-card mt-12">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Logo & Contact */}
          <div className="lg:col-span-1">
            <div className="flex flex-col items-start gap-4">
              {/* Absher Logo */}
              <div className="flex items-center gap-2">
                <div className="w-12 h-16 flex flex-col gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-1">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="w-3 h-3 bg-card rounded-sm" />
                      ))}
                    </div>
                  ))}
                </div>
                <span className="text-3xl font-bold text-card">أبشر</span>
              </div>
              
              <div className="flex items-center gap-2 text-card/80">
                <Phone className="w-5 h-5" />
                <span className="text-lg font-semibold" dir="ltr">920020405</span>
              </div>
              
              {/* App Store Badges */}
              <div className="flex flex-col gap-2 mt-4">
                <a href="#" className="bg-card/10 hover:bg-card/20 transition-colors rounded-lg px-3 py-2 flex items-center gap-2">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <div className="text-right">
                    <span className="text-[10px] opacity-60">Download on the</span>
                    <p className="text-xs font-semibold">App Store</p>
                  </div>
                </a>
                <a href="#" className="bg-card/10 hover:bg-card/20 transition-colors rounded-lg px-3 py-2 flex items-center gap-2">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.53 12.9 20.18 13.18L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z"/>
                  </svg>
                  <div className="text-right">
                    <span className="text-[10px] opacity-60">GET IT ON</span>
                    <p className="text-xs font-semibold">Google Play</p>
                  </div>
                </a>
                <a href="#" className="bg-card/10 hover:bg-card/20 transition-colors rounded-lg px-3 py-2 flex items-center gap-2">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <div className="text-right">
                    <span className="text-[10px] opacity-60">EXPLORE IT ON</span>
                    <p className="text-xs font-semibold">AppGallery</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
          
          {/* Important Links */}
          <div>
            <h4 className="font-bold text-card mb-4">روابط مهمة</h4>
            <ul className="space-y-2 text-sm text-card/70">
              <li><a href="#" className="hover:text-card transition-colors">بوابة وزارة الداخلية</a></li>
              <li><a href="#" className="hover:text-card transition-colors">المنصة الوطنية الموحدة</a></li>
              <li><a href="#" className="hover:text-card transition-colors">الاستراتيجية الوطنية للبيانات</a></li>
              <li><a href="#" className="hover:text-card transition-colors">منصة البيانات المفتوحة</a></li>
              <li><a href="#" className="hover:text-card transition-colors">بوابة المشاركة الالكترونية</a></li>
            </ul>
          </div>
          
          {/* Help & Support */}
          <div>
            <h4 className="font-bold text-card mb-4">المساعدة والدعم</h4>
            <ul className="space-y-2 text-sm text-card/70">
              <li><a href="#" className="hover:text-card transition-colors">اتصل بنا</a></li>
              <li><a href="#" className="hover:text-card transition-colors">بلاغ عن فساد (نزاهة)</a></li>
              <li><a href="#" className="hover:text-card transition-colors">الأسئلة الشائعة</a></li>
              <li><a href="#" className="hover:text-card transition-colors">قنوات الخدمة</a></li>
              <li><a href="#" className="hover:text-card transition-colors">التسجيل والاشتراك</a></li>
            </ul>
          </div>
          
          {/* About Absher */}
          <div>
            <h4 className="font-bold text-card mb-4">عن منصة أبشر</h4>
            <ul className="space-y-2 text-sm text-card/70">
              <li><a href="#" className="hover:text-card transition-colors">عن أبشر</a></li>
              <li><a href="#" className="hover:text-card transition-colors">سياسة الخصوصية</a></li>
              <li><a href="#" className="hover:text-card transition-colors">شروط الاستخدام</a></li>
              <li><a href="#" className="hover:text-card transition-colors">الأخبار</a></li>
              <li><a href="#" className="hover:text-card transition-colors">بيانات إحصائية</a></li>
            </ul>
          </div>
          
          {/* Social & Accessibility */}
          <div>
            <h4 className="font-bold text-card mb-4">وسائل التواصل الاجتماعي</h4>
            <div className="flex items-center gap-2 mb-6">
              <a href="#" className="w-10 h-10 rounded-full bg-card/10 flex items-center justify-center hover:bg-card/20 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-2.95v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-card/10 flex items-center justify-center hover:bg-card/20 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-card/10 flex items-center justify-center hover:bg-card/20 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-card/10 flex items-center justify-center hover:bg-card/20 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
            
            <h4 className="font-bold text-card mb-4">أدوات المساعدة</h4>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 rounded-full bg-card/10 flex items-center justify-center hover:bg-card/20 transition-colors">
                <Eye className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-full bg-card/10 flex items-center justify-center hover:bg-card/20 transition-colors text-lg font-bold">
                +A
              </button>
              <button className="w-10 h-10 rounded-full bg-card/10 flex items-center justify-center hover:bg-card/20 transition-colors text-sm font-bold">
                -A
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
