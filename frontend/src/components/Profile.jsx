import React from "react";

export default function Profile({ userId, userName, notifications }) {
  return (
    <div className="flex flex-col bg-white rounded-xl p-4 shadow-sm border w-full h-full">
      <h2 className="text-sm font-semibold mb-3">ملفي الشخصي</h2>

      <div className="space-y-3 text-sm">
        <div>
          <div className="text-xs text-slate-500">رقم الهوية</div>
          <div className="font-medium">{userId}</div>
        </div>

        <div>
          <div className="text-xs text-slate-500">الاسم</div>
          <div className="font-medium">{userName}</div>
        </div>

        <div>
          <div className="text-xs text-slate-500">الخدمات المسجلة</div>

          <div className="mt-1 space-y-2">
            {notifications.length === 0 && (
              <div className="text-xs text-slate-500">
                (ستظهر خدماتك بعد تحديث الجلسة)
              </div>
            )}

            {notifications.length > 0 &&
              [...new Set(notifications.map((n) => n.meta.service_type))]
                .filter(Boolean)
                .map((svc) => (
                  <div
                    key={svc}
                    className="bg-slate-50 border rounded-xl p-2 text-xs"
                  >
                    <div className="font-medium">
                      {svc.replace(/_/g, " ")}
                    </div>

                    {notifications
                      .filter((n) => n.meta.service_type === svc)
                      .slice(0, 1)
                      .map((info) => (
                        <div key={info.id} className="mt-1">
                          الانتهاء:{" "}
                          {info.meta.expiry_date
                            ? new Date(info.meta.expiry_date).toLocaleDateString("ar")
                            : "—"}
                        </div>
                      ))}
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}
