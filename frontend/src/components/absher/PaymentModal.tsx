import { useState } from "react";
import { X, Check, Loader2, CreditCard } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProposedAction } from "@/lib/api";
import clsx from "clsx";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  proposedAction: ProposedAction;
  onSuccess: () => void;
}

const PaymentModal = ({ open, onClose, proposedAction, onSuccess }: PaymentModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Extract payment info from proposed action
  const amount = proposedAction.data?.amount || 150.0;
  const serviceName = proposedAction.description || "خدمة";
  const serviceType = proposedAction.data?.service_type || "";

  const serviceNames: Record<string, string> = {
    national_id: "تجديد الهوية الوطنية",
    driver_license: "تجديد رخصة القيادة",
    passport: "تجديد جواز السفر",
    vehicle_registration: "تجديد استمارة المركبة",
  };

  const displayServiceName = serviceNames[serviceType] || serviceName;

  const handleApplePay = async () => {
    setIsProcessing(true);

    // Simulate Apple Pay processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);

      // Auto close after success animation
      setTimeout(() => {
        setIsSuccess(false);
        onSuccess();
        onClose();
      }, 2000);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-transparent border-0 shadow-2xl">
        <div className="bg-white rounded-3xl overflow-hidden">
          {/* Apple Pay Header */}
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#000000] px-6 py-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <CreditCard className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Apple Pay</h2>
            <p className="text-white/70 text-sm">الدفع الآمن</p>
          </div>

          {/* Payment Details */}
          <div className="px-6 py-6 bg-white">
            {!isSuccess ? (
              <>
                {/* Merchant Info */}
                <div className="text-center mb-6 pb-6 border-b border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">الدفع إلى</div>
                  <div className="text-xl font-semibold text-[#1f3a37]">أبشر</div>
                  <div className="text-xs text-gray-400 mt-1">Absher.gov.sa</div>
                </div>

                {/* Service Details */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-start">
                    <div className="text-right">
                      <div className="font-semibold text-[#1f3a37] text-base">{displayServiceName}</div>
                      <div className="text-xs text-gray-500 mt-1">{serviceName}</div>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-[#1f3a37] text-lg">
                        {amount.toFixed(2)} ر.س
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200"></div>

                  {/* Total */}
                  <div className="flex justify-between items-center pt-2">
                    <div className="text-right font-semibold text-lg text-[#1f3a37]">المجموع</div>
                    <div className="text-left font-bold text-xl text-[#1f3a37]">
                      {amount.toFixed(2)} ر.س
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#007AFF] to-[#0051D5] flex items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          className="w-6 h-6 text-white"
                          fill="currentColor"
                        >
                          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.67-1.09-.21-2.21-.43-3.52-.43-.51 0-1.02.03-1.54.1-4.12.52-7.3 2.25-7.3 5.21V24h15.58c-.01-1.45-.39-2.89-1.14-3.72zM12.03.01c-.83 0-1.5.67-1.5 1.5v.01c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5S12.86.01 12.03.01zM23 13.28c0-4.41-3.5-8-7.8-8-4.31 0-7.8 3.59-7.8 8 0 4.41 3.49 8 7.8 8 4.31 0 7.8-3.59 7.8-8zm-7.8 5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-[#1f3a37]">Apple Pay</div>
                        <div className="text-xs text-gray-500">الدفع عبر Apple Pay</div>
                      </div>
                    </div>
                    <div className="text-gray-400">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleApplePay}
                    disabled={isProcessing}
                    className={clsx(
                      "w-full h-14 rounded-2xl text-base font-semibold transition-all",
                      "bg-gradient-to-r from-[#000000] to-[#1a1a1a] text-white",
                      "hover:from-[#1a1a1a] hover:to-[#2a2a2a]",
                      "shadow-lg hover:shadow-xl",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>جاري المعالجة...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <svg
                          viewBox="0 0 24 24"
                          className="w-6 h-6 text-white"
                          fill="currentColor"
                        >
                          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.67-1.09-.21-2.21-.43-3.52-.43-.51 0-1.02.03-1.54.1-4.12.52-7.3 2.25-7.3 5.21V24h15.58c-.01-1.45-.39-2.89-1.14-3.72zM12.03.01c-.83 0-1.5.67-1.5 1.5v.01c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5S12.86.01 12.03.01zM23 13.28c0-4.41-3.5-8-7.8-8-4.31 0-7.8 3.59-7.8 8 0 4.41 3.49 8 7.8 8 4.31 0 7.8-3.59 7.8-8zm-7.8 5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                        </svg>
                        <span>الدفع باستخدام Apple Pay</span>
                      </div>
                    )}
                  </Button>

                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="w-full h-12 rounded-xl border-gray-300 text-[#1f3a37] hover:bg-gray-50"
                  >
                    إلغاء
                  </Button>
                </div>
              </>
            ) : (
              // Success State
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <Check className="h-10 w-10 text-green-600" strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-bold text-[#1f3a37] mb-2">تم الدفع بنجاح</h3>
                <p className="text-gray-500 mb-4">تمت معالجة طلبك بنجاح</p>
                <div className="text-sm text-gray-400">
                  رقم المعاملة: {Math.random().toString(36).substring(2, 15).toUpperCase()}
                </div>
              </div>
            )}
          </div>

          {/* Apple Pay Footer */}
          {!isSuccess && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>محمي بواسطة Apple Pay</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;

