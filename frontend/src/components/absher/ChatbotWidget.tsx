import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  Camera,
  FileUp,
  Image,
  MessageCircle,
  Mic,
  Volume2,
  Send,
  X,
  Loader2,
} from "lucide-react";
import clsx from "clsx";
import {
  getUserId,
  sendChatMessage,
  uploadIdPhoto,
  getUploadedImageUrl,
  textToSpeech,
  transcribeAudio,
  confirmAction,
  type ProposedAction,
} from "@/lib/api";
import PaymentModal from "./PaymentModal";

type QuickAction = {
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const quickActions: QuickAction[] = [
  { label: "تجديد الهوية", icon: RefreshIcon },
  { label: "سداد المخالفات", icon: WalletIcon },
  { label: "حجز موعد", icon: CalendarIcon },
  { label: "إصدار جواز سفر", icon: PassportIcon },
  { label: "نقل ملكية مركبة", icon: CarIcon },
];

type Message = {
  from: "user" | "assistant";
  text: string;
  proposedAction?: ProposedAction;
  imageUrl?: string;
  isImageUpload?: boolean;
  audioUrl?: string;
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [animateEntry, setAnimateEntry] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "assistant",
      text: "مرحباً، أنا مساعد أبشر الذكي. كيف يمكنني خدمتك اليوم؟",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcribedText, setTranscribedText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ProposedAction | null>(null);
  const [ttsGeneratingIndex, setTtsGeneratingIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const ttsObjectUrlsRef = useRef<string[]>([]);

  // Absher primary palette
  const brandColor = useMemo(() => "#009A93", []);
  const brandDark = useMemo(() => "#0B7F74", []);

  const latestAssistantIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].from === "assistant") {
        return i;
      }
    }
    return -1;
  }, [messages]);

  const latestAssistantMessage =
    latestAssistantIndex >= 0 ? messages[latestAssistantIndex] : null;

  // Get user_id on mount
  useEffect(() => {
    const id = getUserId();
    if (id) {
      setUserId(id);
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setAnimateEntry(true));
      return;
    }
    setAnimateEntry(false);
  }, [isOpen]);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue.trim();
    if (!textToSend || isLoading || !userId) return;

    // Add user message
    const userMessage: Message = { from: "user", text: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await sendChatMessage(userId, textToSend);
      
      // Add assistant response
      const assistantMessage: Message = {
        from: "assistant",
        text: response.reply,
        proposedAction: response.proposed_action,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        from: "assistant",
        text: "عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionLabel: string) => {
    handleSendMessage(actionLabel);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      const errorMessage: Message = {
        from: "assistant",
        text: "الرجاء اختيار ملف صورة صالح.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const errorMessage: Message = {
        from: "assistant",
        text: "حجم الصورة كبير جداً. الرجاء اختيار صورة أصغر من 10 ميجابايت.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result as string;
      setImagePreview(previewUrl);

      // Add user message with image preview
      const userMessage: Message = {
        from: "user",
        text: "تم رفع صورة للهوية الوطنية",
        imageUrl: previewUrl,
        isImageUpload: true,
      };
      setMessages((prev) => [...prev, userMessage]);

      // Upload image
      handleImageUpload(file);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!userId) return;

    setIsUploading(true);

    try {
      const response = await uploadIdPhoto(userId, file);
      
      // Get the processed image URL (backend saves it with the filename)
      // We need to construct the filename from the response
      // The backend returns media_id, but we need the filename
      // For now, we'll show a success message and the preview
      
      const successMessage: Message = {
        from: "assistant",
        text: `تم معالجة الصورة بنجاح! تم إزالة الخلفية وتجهيزها لصورة الهوية الوطنية.\n\nمعرف الصورة: ${response.media_id}`,
      };
      setMessages((prev) => [...prev, successMessage]);

      // Optionally, you could fetch the processed image if you have the filename
      // For now, we'll keep the preview
    } catch (error: any) {
      console.error("Error uploading image:", error);
      const errorMessage: Message = {
        from: "assistant",
        text: error.message?.includes("REMOVEBG_API_KEY")
          ? "خدمة إزالة الخلفية غير متاحة حالياً. يرجى المحاولة لاحقاً."
          : "حدث خطأ أثناء معالجة الصورة. يرجى المحاولة مرة أخرى.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsUploading(false);
      setImagePreview(null);
    }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handlePlayTextToSpeech = async (text: string | undefined, messageIndex: number) => {
    if (!text?.trim() || ttsGeneratingIndex !== null) return;

    setTtsGeneratingIndex(messageIndex);

    try {
      let audioUrl = messages[messageIndex]?.audioUrl;

      if (!audioUrl) {
        audioUrl = await textToSpeech(text);
        ttsObjectUrlsRef.current.push(audioUrl);

        setMessages((prev) => {
          const updated = [...prev];
          if (updated[messageIndex]) {
            updated[messageIndex] = { ...updated[messageIndex], audioUrl };
          }
          return updated;
        });
      }

      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (error) {
      console.error("Error generating speech:", error);
      setMessages((prev) => [
        ...prev,
        {
          from: "assistant",
          text: "تعذر إنشاء الصوت حالياً. يرجى المحاولة لاحقاً.",
        },
      ]);
    } finally {
      setTtsGeneratingIndex(null);
    }
  };

  const handleExecuteAction = (action: ProposedAction) => {
    setSelectedAction(action);
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async () => {
    if (!selectedAction || !userId) return;

    try {
      const serviceTypeMap: Record<string, string> = {
        renew_national_id: "national_id",
        renew_driver_license: "driver_license",
        renew_passport: "passport",
        renew_vehicle_registration: "vehicle_registration",
      };

      const serviceType = serviceTypeMap[selectedAction.type] || selectedAction.data?.service_type || "national_id";

      await confirmAction({
        user_id: userId,
        action_id: selectedAction.id,
        accepted: true,
        service_type: serviceType,
      });

      // Add success message
      const successMessage: Message = {
        from: "assistant",
        text: "تم تأكيد الإجراء بنجاح! تم تجديد الخدمة.",
      };
      setMessages((prev) => [...prev, successMessage]);
    } catch (error: any) {
      console.error("Error confirming action:", error);
      const errorMessage: Message = {
        from: "assistant",
        text: "حدث خطأ أثناء تأكيد الإجراء. يرجى المحاولة مرة أخرى.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  // Audio visualization
  const visualizeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average audio level
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(average / 255); // Normalize to 0-1

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(visualizeAudio);
    }
  };

  // Start microphone
  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio context for visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      setIsMicActive(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      const errorMessage: Message = {
        from: "assistant",
        text: "تعذر الوصول إلى الميكروفون. يرجى التحقق من الصلاحيات.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  // Stop microphone
  const stopMicrophone = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    mediaRecorderRef.current = null;
    setIsMicActive(false);
    setIsRecording(false);
    setAudioLevel(0);
    setTranscribedText("");
  };

  // Start recording
  const startRecording = () => {
    if (!mediaRecorderRef.current || isRecording) return;

    audioChunksRef.current = [];
    mediaRecorderRef.current.start();
    setIsRecording(true);
    visualizeAudio();
  };

  // Stop recording and transcribe
  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    return new Promise<void>((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve();
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        setAudioLevel(0);

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        // Create blob from recorded chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm;codecs=opus",
        });

        if (audioBlob.size > 0) {
          setIsTranscribing(true);
          setTranscribedText("");
          try {
            const text = await transcribeAudio(audioBlob);
            setTranscribedText(text);
            if (text.trim()) {
              await handleSendMessage(text);
            } else {
              const errorMessage: Message = {
                from: "assistant",
                text: "لم يتم التعرف على أي نص. يرجى المحاولة مرة أخرى.",
              };
              setMessages((prev) => [...prev, errorMessage]);
            }
          } catch (error: any) {
            console.error("Transcription error:", error);
            const errorMessage: Message = {
              from: "assistant",
              text: "حدث خطأ أثناء تحويل الصوت إلى نص. يرجى المحاولة مرة أخرى.",
            };
            setMessages((prev) => [...prev, errorMessage]);
          } finally {
            setIsTranscribing(false);
          }
        }

        resolve();
      };

      mediaRecorderRef.current.stop();
    });
  };

  // Toggle microphone (close mic)
  const toggleMicrophone = async () => {
    if (isMicActive) {
      if (isRecording) {
        await stopRecording();
      }
      stopMicrophone();
    } else {
      await startMicrophone();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMicrophone();
      ttsObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed left-4 bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-gradient-to-br from-[#0FAE9E] to-[#0B7F74] text-white shadow-[0px_8px_22px_rgba(0,0,0,0.18)] transition-transform duration-150 hover:translate-y-[-2px] active:scale-95 focus:outline-none focus:ring-4 focus:ring-[#0FAE9E33] md:left-6 md:bottom-6"
        aria-label="فتح محادثة المساعد"
      >
        <MessageCircle className="h-7 w-7" strokeWidth={2} />
      </button>

      {isOpen && (
        <div
          className={clsx(
            // Align the widget on the left even in RTL layouts
            "fixed inset-0 z-50 flex items-end justify-end bg-[#0B1F1D]/35 backdrop-blur-sm transition-opacity duration-200 ease-out",
            animateEntry ? "opacity-100" : "opacity-0",
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_10%_20%,rgba(15,174,158,0.08),transparent_50%),radial-gradient(70%_70%_at_60%_0%,rgba(11,127,116,0.08),transparent_45%)]"
            aria-hidden
          />
          <div
            className={clsx(
              "pointer-events-auto relative flex h-[calc(100vh-32px)] w-full flex-col overflow-hidden bg-white shadow-[0px_18px_42px_rgba(0,0,0,0.20)] transition-all duration-250 ease-out origin-[10%_90%] md:origin-bottom-left md:ml-8 md:h-[min(86vh,780px)] md:max-w-[560px] md:rounded-[26px] md:border md:border-[#dfe8e6]",
              animateEntry
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-3 scale-[0.97] opacity-0",
            )}
            style={{
              boxShadow: `0px 18px 42px ${brandDark}33`,
            }}
          >
            <header className="relative overflow-hidden bg-gradient-to-br from-[#0FAE9E] via-[#0b8f83] to-[#0B7F74] text-white md:rounded-t-[26px]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.10),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.12),transparent_32%)]" />
              <div className="flex items-start gap-3 px-5 pb-5 pt-5 sm:px-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-[18px] font-bold shadow-inner">
                  أبشر
                </div>
                <div className="flex-1 text-right">
                  <div className="text-sm text-white/90">مساعد أبشر الذكي</div>
                  <div className="text-lg font-semibold">مرحباً، كيف نساعدك؟</div>
                  <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs backdrop-blur-[2px]">
                    <span className="h-2 w-2 rounded-full bg-[#7CE1CD]" />
                    متصل الآن • دعم فوري
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                  aria-label="إغلاق المحادثة"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#f6faf9] to-white px-4 pb-4 pt-4 sm:px-5">
              {isMicActive ? (
                // Voice Mode - Dedicated Voice Interface
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-8 py-8">
                  {/* Large Microphone Visualization */}
                  <div className="flex flex-col items-center gap-6">
                    {/* Audio Waveform Visualization */}
                    <div className="flex items-center justify-center gap-1.5 h-32 w-full max-w-md">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-[#0FAE9E] to-[#0B7F74] rounded-full transition-all duration-100"
                          style={{
                            height: isRecording
                              ? `${Math.max(8, audioLevel * 120 + Math.random() * 20)}px`
                              : "8px",
                            opacity: isRecording ? 0.6 + audioLevel * 0.4 : 0.2,
                          }}
                        />
                      ))}
                    </div>

                    {/* Large Record Button */}
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isTranscribing}
                      className={clsx(
                        "flex h-24 w-24 items-center justify-center rounded-full transition-all shadow-2xl",
                        isRecording
                          ? "bg-red-500 hover:bg-red-600 text-white scale-110 animate-pulse"
                          : "bg-gradient-to-br from-[#0FAE9E] to-[#0B7F74] hover:from-[#0B7F74] hover:to-[#0FAE9E] text-white",
                        isTranscribing && "opacity-50 cursor-not-allowed"
                      )}
                      aria-label={isRecording ? "إيقاف التسجيل" : "بدء التسجيل"}
                    >
                      {isTranscribing ? (
                        <Loader2 className="h-10 w-10 animate-spin" strokeWidth={2.5} />
                      ) : (
                        <Mic className="h-10 w-10" strokeWidth={2.5} />
                      )}
                    </button>

                    {/* Status Text */}
                    <div className="text-center">
                      {isTranscribing ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-[#0FAE9E]" />
                          <p className="text-lg font-medium text-[#1f3a37]">
                            جاري تحويل الصوت إلى نص...
                          </p>
                        </div>
                      ) : isRecording ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                          <p className="text-lg font-medium text-[#1f3a37]">
                            جاري التسجيل... اضغط للتوقف
                          </p>
                        </div>
                      ) : (
                        <p className="text-lg font-medium text-[#4d6f6a]">
                          اضغط لبدء التسجيل
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Transcription Display */}
                  {transcribedText && (
                    <div className="w-full max-w-2xl">
                      <div className="bg-white rounded-2xl border-2 border-[#0FAE9E] p-6 shadow-lg">
                        <div className="text-xs font-semibold text-[#0B7F74] mb-3 text-right">
                          النص المقروء:
                        </div>
                        <p className="text-base text-[#1f3a37] text-right leading-relaxed">
                          {transcribedText}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Latest Assistant Response */}
                  {messages.length > 0 && messages[messages.length - 1].from === "assistant" && latestAssistantMessage && (
                    <div className="w-full max-w-2xl">
                      <div className="bg-white rounded-2xl border border-[#e6efed] p-6 shadow-lg">
                        <div className="mb-3 flex items-center justify-between text-xs font-semibold text-[#0B7F74] text-right">
                          <span>رد المساعد:</span>
                          <button
                            type="button"
                            onClick={() => handlePlayTextToSpeech(latestAssistantMessage.text, latestAssistantIndex)}
                            disabled={ttsGeneratingIndex === latestAssistantIndex || !latestAssistantMessage.text?.trim()}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[#0B7F74] transition hover:bg-[#f0fbf8] disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="تشغيل الرد صوتياً"
                          >
                            {ttsGeneratingIndex === latestAssistantIndex ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                            ) : (
                              <Volume2 className="h-3.5 w-3.5" strokeWidth={2} />
                            )}
                            <span className="text-[10px] font-semibold">سماع</span>
                          </button>
                        </div>
                        <p className="text-base text-[#1f3a37] text-right leading-relaxed whitespace-pre-wrap">
                          {latestAssistantMessage.text}
                        </p>
                        {latestAssistantMessage.proposedAction && (
                          <div className="mt-4 pt-4 border-t border-[#e6efed]">
                            <div className="text-sm font-semibold text-[#0B7F74] mb-2 text-right">
                              إجراء مقترح:
                            </div>
                            <div className="text-sm text-[#1f3a37] mb-3 text-right">
                              {latestAssistantMessage.proposedAction?.description}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleExecuteAction(latestAssistantMessage.proposedAction!)}
                              className="w-full px-4 py-2 rounded-lg bg-[#0FAE9E] text-white text-sm font-medium hover:bg-[#0B7F74] transition"
                            >
                              تنفيذ الإجراء
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Loading Indicator */}
                  {isLoading && (
                    <div className="flex items-center gap-3 text-[#4d6f6a]">
                      <Loader2 className="h-5 w-5 animate-spin text-[#0FAE9E]" />
                      <span className="text-base">جاري الإرسال...</span>
                    </div>
                  )}
                </div>
              ) : (
                // Normal Chat Mode
                <div className="space-y-3">
                  <div className="space-y-3 rounded-2xl border border-[#e6efed] bg-white/70 p-3 shadow-sm backdrop-blur max-sm:-mx-1">
                    <div className="flex items-center justify-between text-xs text-[#0B7F74] px-1">
                      <span>ابدأ بسرعة</span>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] text-[#14756c] shadow-sm">
                        خدمات شائعة
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 md:gap-4 max-sm:overflow-x-auto max-sm:pb-1">
                      {quickActions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => handleQuickAction(action.label)}
                          disabled={isLoading}
                          className="group flex h-16 items-center justify-center gap-3 rounded-xl border border-[#dfe8e6] bg-white px-3 text-sm font-semibold text-[#1f3a37] transition hover:-translate-y-0.5 hover:border-[#0FAE9E] hover:bg-[#f0fbf8] hover:shadow-[0_10px_24px_rgba(15,174,158,0.12)] max-sm:min-w-[170px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0FAE9E]/10 text-[#0FAE9E] group-hover:bg-[#0FAE9E]/15">
                            <action.icon className="h-4 w-4" />
                          </span>
                          <span className="truncate text-right">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={clsx("flex", {
                          "justify-start": message.from === "user",
                          "justify-end": message.from === "assistant",
                        })}
                      >
                        <div
                          className={clsx(
                            "max-w-[82%] whitespace-pre-wrap text-sm leading-relaxed md:max-w-[78%]",
                            {
                              "rounded-[18px_18px_6px_18px] bg-gradient-to-br from-[#0FAE9E] to-[#0B7F74] px-3.5 py-2.5 text-white shadow-sm ring-1 ring-[#0FAE9E]/30":
                                message.from === "user",
                              "rounded-[18px_18px_18px_6px] border border-[#e6efed] bg-white px-3.5 py-2.5 text-[#1f3a37] shadow-sm":
                                message.from === "assistant",
                            },
                          )}
                        >
                          {message.imageUrl && (
                            <div className="mb-2 rounded-lg overflow-hidden">
                              <img
                                src={message.imageUrl}
                                alt="Uploaded"
                                className="w-full h-auto max-h-64 object-contain bg-gray-50"
                              />
                            </div>
                          )}
                          {message.text && (
                            <div className={message.imageUrl ? "mt-2" : ""}>
                              {message.text}
                            </div>
                          )}
                          {message.from === "assistant" && (
                            <div className="mt-2 flex items-center justify-between text-[11px] text-[#4d6f6a]">
                              <span>بوت • الآن</span>
                              <button
                                type="button"
                                onClick={() => handlePlayTextToSpeech(message.text, index)}
                                disabled={ttsGeneratingIndex === index || !message.text?.trim()}
                                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[#0B7F74] transition hover:bg-[#f0fbf8] disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="تشغيل الرد صوتياً"
                              >
                                {ttsGeneratingIndex === index ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                                ) : (
                                  <Volume2 className="h-3.5 w-3.5" strokeWidth={2} />
                                )}
                                <span className="text-[10px] font-semibold">سماع</span>
                              </button>
                            </div>
                          )}
                          {message.proposedAction && (
                            <div className="mt-3 pt-3 border-t border-[#e6efed]">
                              <div className="text-xs font-semibold text-[#0B7F74] mb-2">
                                إجراء مقترح:
                              </div>
                              <div className="text-xs text-[#1f3a37] mb-2">
                                {message.proposedAction.description}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleExecuteAction(message.proposedAction!)}
                                className="w-full mt-2 px-3 py-1.5 rounded-lg bg-[#0FAE9E] text-white text-xs font-medium hover:bg-[#0B7F74] transition"
                              >
                                تنفيذ الإجراء
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {(isLoading || isUploading) && (
                      <div className="flex justify-end">
                        <div className="rounded-[18px_18px_18px_6px] border border-[#e6efed] bg-white px-3.5 py-2.5 shadow-sm">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-[#0FAE9E]" />
                            <span className="text-xs text-[#4d6f6a]">
                              {isUploading ? "جاري معالجة الصورة..." : "جاري الإرسال..."}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              )}
            </div>

            <footer className="border-t border-[#e6efed] bg-white px-3 py-3 sm:px-4">
              {isMicActive ? (
                // Voice Mode Footer - Just close button
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={toggleMicrophone}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl border-2 border-[#dfe8e6] bg-white text-[#1f3a37] hover:bg-[#f0fbf8] hover:border-[#0FAE9E] transition"
                  >
                    <X className="h-4 w-4" />
                    <span className="text-sm font-medium">العودة إلى النص</span>
                  </button>
                </div>
              ) : (
                // Text Input Mode
                <div className="flex w-full flex-row-reverse items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim() || isLoading || isUploading}
                    className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-[#0FAE9E] to-[#0B7F74] text-white shadow-[0_12px_20px_rgba(15,174,158,0.28)] transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="إرسال الرسالة"
                  >
                    {isLoading || isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.8} />
                    ) : (
                      <Send className="h-5 w-5" strokeWidth={1.8} />
                    )}
                  </button>

                  <label className="relative flex-1">
                    <span className="sr-only">حقل الرسالة</span>
                    <input
                      ref={inputRef}
                      dir="rtl"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="اكتب رسالتك هنا…"
                      disabled={isLoading || isUploading}
                      className="w-full rounded-2xl border border-[#dfe8e6] bg-[#f6faf9] px-4 py-3 pl-14 text-[15px] text-[#1f3a37] outline-none transition focus:border-[#0FAE9E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(15,174,158,0.12)] disabled:opacity-50"
                      style={{
                        boxShadow: `0 0 0 1px ${brandColor}0f`,
                      }}
                    />
                    <button
                      type="button"
                      onClick={toggleMicrophone}
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-[#0FAE9E] transition hover:scale-105 active:scale-95"
                      aria-label="تشغيل الميكروفون"
                    >
                      <Mic className="h-5 w-5" strokeWidth={1.8} />
                    </button>
                  </label>

                  <div className="flex flex-none items-center gap-2">
                    <IconButton ariaLabel="تشغيل الكاميرا">
                      <Camera className="h-5 w-5" strokeWidth={1.8} />
                    </IconButton>
                    <IconButton
                      ariaLabel="رفع صورة"
                      onClick={triggerImageUpload}
                      disabled={isUploading || isLoading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.8} />
                      ) : (
                        <Image className="h-5 w-5" strokeWidth={1.8} />
                      )}
                    </IconButton>
                    <IconButton ariaLabel="رفع ملف">
                      <FileUp className="h-5 w-5" strokeWidth={1.8} />
                    </IconButton>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              )}
            </footer>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {selectedAction && (
        <PaymentModal
          open={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedAction(null);
          }}
          proposedAction={selectedAction}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}

function IconButton({
  children,
  ariaLabel,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dfe8e6] bg-white text-[#0FAE9E] transition hover:-translate-y-0.5 hover:bg-[#f0fbf8] hover:shadow-[0_8px_18px_rgba(15,174,158,0.16)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

function RefreshIcon(props: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7-3.22M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7 3.22" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 4v6h6M21 20v-6h-6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function WalletIcon(props: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M4 7.5C4 6.12 5.12 5 6.5 5h11A2.5 2.5 0 0 1 20 7.5V9H4z" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 9h16v7.5A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 14h2.5a1 1 0 0 0 0-2H16a1 1 0 0 0 0 2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function CalendarIcon(props: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><rect x="4" y="5" width="16" height="15" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 3v4M16 3v4M4 9h16" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function PassportIcon(props: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><rect x="6" y="3" width="12" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="11" r="2.5"/><path d="M9 16h6" strokeLinecap="round"/></svg>;
}

function CarIcon(props: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M3 13h18l-1.2-3.6A2 2 0 0 0 17.9 8H6.1a2 2 0 0 0-1.9 1.4z" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 16h12" strokeLinecap="round"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>;
}

