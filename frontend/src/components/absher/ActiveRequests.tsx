import { FileText, BookOpen, ChevronLeft, Clock } from "lucide-react";

const requests = [
  {
    id: 1,
    icon: FileText,
    title: "إصدار إقامة",
    status: "قيد المعالجة",
    statusType: "pending",
    progress: 30,
    date: "منذ 3 أيام",
  },
  {
    id: 2,
    icon: BookOpen,
    title: "تجديد الجواز",
    status: "قيد الإجراء",
    statusType: "processing",
    progress: 65,
    date: "منذ يومين",
  },
];

const ActiveRequests = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">متابعة الطلبات</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requests.map((request, index) => (
          <div
            key={request.id}
            className="bg-white rounded-2xl p-5 shadow-card cursor-pointer group animate-fade-in"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <ChevronLeft className="w-5 h-5 text-foreground-light group-hover:text-primary transition-colors" />
              <div className="flex items-center gap-3">
                <div>
                  <h4 className="font-bold text-foreground text-right">{request.title}</h4>
                  <p className="text-xs text-foreground-light text-right">{request.date}</p>
                </div>
                <div className="service-icon-square w-12 h-12">
                  <request.icon className="w-5 h-5" strokeWidth={1.2} />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">{request.progress}%</span>
                <span className={`status-chip ${request.statusType === 'pending' ? 'status-pending' : 'status-processing'}`}>
                  {request.status}
                </span>
              </div>
              
              <div className="progress-bar">
                <div 
                  className="progress-fill animate-progress-fill"
                  style={{ '--progress-width': `${request.progress}%` } as React.CSSProperties}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActiveRequests;
