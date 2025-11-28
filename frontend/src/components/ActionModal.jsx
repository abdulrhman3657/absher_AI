import React from "react";

export default function ActionModal({ action, loading, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">
          المساعد يريد تنفيذ إجراء
        </h2>

        <p className="mb-4 text-sm text-slate-800">
          <span className="font-semibold">الإجراء:</span> {action.description}
        </p>

        <p className="mb-6 text-xs text-slate-500">
          هذا مجرد نموذج تجريبي. عند التأكيد سيتم تنفيذ عملية وهمية من جهة الخادم.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => !loading && onConfirm(false)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            disabled={loading}
          >
            لا
          </button>

          <button
            onClick={() => !loading && onConfirm(true)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "جارٍ التنفيذ..." : "نعم، متابعة"}
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-3 block text-xs text-slate-400 hover:text-slate-600"
          disabled={loading}
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}
