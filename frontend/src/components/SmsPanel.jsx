import React from "react";

export default function SmsPanel({ notifications, onRunProactive, running }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">الرسائل النصية </h2>

        <button
          onClick={onRunProactive}
          disabled={running}
          className="rounded-full bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {running ? "جارٍ التشغيل..." : "تشغيل المحرك الاستباقي"}
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 rounded-2xl bg-slate-900/5 p-3">
          <div className="mx-auto flex h-full w-full max-w-xs flex-col rounded-3xl bg-slate-900 text-white shadow-inner">
            <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-slate-700" />

            <div className="mt-3 px-4 text-xs text-slate-300">
              +966 • مساعد أبشر
            </div>

            <div className="mt-2 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
              {notifications
                .filter((n) => n.channel === "sms")
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((n) => (
                  <div
                    key={n.id}
                    className="max-w-[80%] rounded-2xl bg-emerald-600 px-3 py-2 text-[11px]"
                  >
                    <div>{n.message}</div>
                    <div className="mt-1 text-[9px] opacity-70">
                      {new Date(n.created_at).toLocaleString("ar")}
                    </div>
                  </div>
                ))}

              {notifications.filter((n) => n.channel === "sms").length === 0 && (
                <div className="mt-3 text-[11px] text-slate-300">
                  لا توجد رسائل نصية بعد.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        هذه الرسائل يتم إنشاؤها من خلال /run_proactive.
      </p>
    </div>
  );
}
