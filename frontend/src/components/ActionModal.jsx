import { useState } from "react";

function mapServiceTypeToLabel(type) {
  if (!type) return "خدمة غير معروفة";
  switch (type) {
    case "national_id":
      return "تجديد الهوية الوطنية";
    case "driver_license":
      return "تجديد رخصة القيادة";
    case "passport":
      return "تجديد الجواز";
    case "vehicle_registration":
      return "تجديد استمارة المركبة";
    default:
      return type.replace(/_/g, " ");
  }
}

export default function ActionModal({ action, loading, onConfirm, onClose }) {
  const [step, setStep] = useState("review"); // "review" | "payment"
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");

  const serviceType = action?.data?.service_type;
  const amount = action?.data?.amount;
  const currency = action?.data?.currency || "SAR";

  const serviceLabel = mapServiceTypeToLabel(serviceType);

  const handleSubmitPayment = () => {
    if (loading) return;

    onConfirm(true, {
      card_holder: cardHolder,
      card_number: cardNumber,
      expiry_month: expiryMonth,
      expiry_year: expiryYear,
      cvv,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">
          المساعد يقترح تجديد خدمة
        </h2>

        {step === "review" && (
          <>
            <p className="mb-2 text-sm text-slate-800">
              <span className="font-semibold">الخدمة:</span>{" "}
              {serviceLabel}
            </p>

            <p className="mb-2 text-sm text-slate-800">
              <span className="font-semibold">الرسوم:</span>{" "}
              {amount != null ? `${amount} ${currency}` : "سيتم احتسابها آلياً"}
            </p>

            <p className="mb-4 text-xs text-slate-600">
              {action.description}
            </p>

            <p className="mb-6 text-xs text-slate-500">
              لن يتم تنفيذ أي تجديد أو سحب مبلغ حتى تقوم بإدخال بيانات الدفع
              في الخطوة التالية وتأكيد العملية.
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
                onClick={() => setStep("payment")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={loading}
              >
                متابعة إلى الدفع
              </button>
            </div>
          </>
        )}

        {step === "payment" && (
          <>
            <p className="mb-3 text-sm text-slate-800">
              <span className="font-semibold">الدفع لـ:</span>{" "}
              {serviceLabel}
            </p>

            <p className="mb-3 text-sm text-slate-800">
              <span className="font-semibold">المبلغ:</span>{" "}
              {amount != null ? `${amount} ${currency}` : "غير محدد"}
            </p>

            <div className="space-y-2 mb-4 text-sm">
              <div>
                <label className="block text-xs mb-1">اسم حامل البطاقة</label>
                <input
                  className="w-full rounded-xl border px-3 py-2 text-sm bg-slate-50"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="كما هو مكتوب على البطاقة"
                />
              </div>
              <div>
                <label className="block text-xs mb-1">رقم البطاقة</label>
                <input
                  className="w-full rounded-xl border px-3 py-2 text-sm bg-slate-50"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="**** **** **** ****"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs mb-1">شهر الانتهاء</label>
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm bg-slate-50"
                    value={expiryMonth}
                    onChange={(e) => setExpiryMonth(e.target.value)}
                    placeholder="MM"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1">سنة الانتهاء</label>
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm bg-slate-50"
                    value={expiryYear}
                    onChange={(e) => setExpiryYear(e.target.value)}
                    placeholder="YY"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs mb-1">CVV</label>
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm bg-slate-50"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="***"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <button
                onClick={() => setStep("review")}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                disabled={loading}
              >
                رجوع
              </button>

              <button
                onClick={handleSubmitPayment}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "جارٍ المعالجة..." : "دفع وتأكيد التجديد"}
              </button>
            </div>

            <p className="mt-3 text-[10px] text-slate-400">
              هذه عملية دفع تجريبية فقط لأغراض العرض، ولا يتم ربطها بأي بوابة
              دفع حقيقية.
            </p>
          </>
        )}

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
