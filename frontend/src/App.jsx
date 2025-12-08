// frontend/src/App.jsx
import React, { useEffect, useState, useRef } from "react";
import SmsPanel from "./components/SmsPanel";
import ActionModal from "./components/ActionModal";
import Profile from "./components/Profile";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const STORAGE_KEY = "absher_demo_user";

export default function App() {
  const audioRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // "chat" or "profile"
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState(null);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [proposedAction, setProposedAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [proactiveRunning, setProactiveRunning] = useState(false);
  const [toast, setToast] = useState(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Image uploading (ID photo)
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ---------- load user from localStorage on first render ----------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.userId && parsed.userName) {
        setUserId(parsed.userId);
        setUserName(parsed.userName);
      }
    } catch (err) {
      console.error("Failed to parse stored user", err);
    }
  }, []);

  // ---------- keep localStorage in sync with userId/userName ----------
  useEffect(() => {
    if (userId && userName) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ userId, userName })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [userId, userName]);

  // Fetch notifications when logged in
  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId]);

  async function fetchNotifications() {
    if (!userId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/notifications/${userId}`);
      const data = await res.json();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      if (!res.ok) {
        // Backend reachable but rejected → most likely credentials
        if (res.status === 401) {
          setLoginError("اسم المستخدم أو كلمة المرور غير صحيحة");
          return;
        }

        // Other HTTP errors
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `خطأ من الخادم (${res.status})`);
      }

      const data = await res.json();
      setUserId(data.user_id);
      setUserName(data.name);
      setMessages([]);
      setNotifications([]);
      setToast(`مرحباً ${data.name}!`);
    } catch (e) {
      console.error(e);
      // Network-level errors → explain it correctly
      setLoginError("تعذر الاتصال بالخادم.");
    } finally {
      setLoginLoading(false);
    }
  }

async function sendMessage(customText) {
  const raw = customText != null ? customText : input;
  const text = raw.trim();

  if (!text || loading || !userId) return;

  // Only clear the textarea if this came from the textarea
  if (customText == null) {
    setInput("");
  }

  setMessages((prev) => [
    ...prev,
    {
      id: Date.now(),
      from: "user",
      text,
      time: new Date().toISOString(),
    },
  ]);

  setLoading(true);

  try {
    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, message: text }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        from: "agent",
        text: data.reply,
        time: new Date().toISOString(),
      },
    ]);

    if (data.proposed_action) {
      setProposedAction(data.proposed_action);
    }
  } catch (e) {
    console.error(e);
    setToast("حدث خطأ أثناء الاتصال بالخادم.");
  } finally {
    setLoading(false);
  }
}


async function handleUploadIdPhoto(e) {
  const file = e.target.files?.[0];
  if (!file || !userId) return;

  setUploadingPhoto(true);
  try {
    const formData = new FormData();
    formData.append("user_id", userId);
    formData.append("file", file);

    const res = await fetch(`${BACKEND_URL}/upload/id-photo`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "فشل رفع الصورة.");
    }

    setToast("تم رفع صورة الهوية بنجاح.");

    // 🔴 This actually talks to the agent:
    await sendMessage("تم رفع صورة الهوية الوطنية المطلوبة.");
  } catch (err) {
    console.error(err);
    setToast("فشل رفع الصورة. تأكد من أن الملف صورة وحاول مرة أخرى.");
  } finally {
    setUploadingPhoto(false);
    e.target.value = "";
  }
}


  async function confirmAction(accepted, paymentData) {
    if (!userId || !proposedAction) return;

    const serviceType = proposedAction.data?.service_type;
    if (!serviceType) {
      console.error("Missing service_type in proposedAction.data");
      setToast("لا يمكن تحديد نوع الخدمة للتجديد.");
      return;
    }

    setActionLoading(true);
    try {
      if (!accepted) {
        // User rejected → no payment, just notify backend
        const res = await fetch(`${BACKEND_URL}/confirm-action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            action_id: proposedAction.id,
            accepted: false,
            service_type: serviceType,
          }),
        });

        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 2,
            from: "agent",
            text: data.detail,
            time: new Date().toISOString(),
          },
        ]);
        setToast("تم رفض الإجراء.");
      } else {
        // 1) Call payment API
        const amount = proposedAction.data?.amount;
        const currency = proposedAction.data?.currency || "SAR";

        const payRes = await fetch(`${BACKEND_URL}/payment/charge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            action_id: proposedAction.id,
            amount,
            currency,
            ...paymentData,
          }),
        });

        const payData = await payRes.json();

        if (!payRes.ok || payData.status !== "success") {
          setToast(payData.failure_reason || "فشل الدفع.");
          setActionLoading(false);
          return;
        }

        // 2) Payment OK → confirm action (renew THIS specific service)
        const res = await fetch(`${BACKEND_URL}/confirm-action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            action_id: proposedAction.id,
            accepted: true,
            service_type: serviceType,
          }),
        });

        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 2,
            from: "agent",
            text: data.detail,
            time: new Date().toISOString(),
          },
        ]);

        setToast("تم الدفع وتجديد الخدمة بنجاح.");
        fetchNotifications();
      }
    } catch (e) {
      console.error(e);
      setToast("فشل معالجة الإجراء.");
    } finally {
      setActionLoading(false);
      setProposedAction(null);
    }
  }

  async function runProactive() {
    if (!userId) return;
    setProactiveRunning(true);

    try {
      await fetch(
        `${BACKEND_URL}/run_proactive?user_id=${encodeURIComponent(userId)}`,
        {
          method: "POST",
        }
      );
      await fetchNotifications();
      setToast("تم تشغيل المحرك الاستباقي.");
    } catch (e) {
      console.error(e);
      setToast("فشل تشغيل المحرك الاستباقي.");
    } finally {
      setProactiveRunning(false);
    }
  }

  // ---------- Voice helpers ----------

  async function sendAudioToTranscribe(blob) {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const res = await fetch(`${BACKEND_URL}/voice/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Transcription failed");
      }

      const data = await res.json();
      const text = data.text || "";
      if (!text) return;

      setInput((prev) => (prev ? prev + " " : "") + text);
    } catch (e) {
      console.error(e);
      setToast("فشل تحويل الصوت إلى نص.");
    }
  }

  async function toggleRecording() {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        stream.getTracks().forEach((t) => t.stop());
        await sendAudioToTranscribe(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error", err);
      setToast("تعذر الوصول إلى الميكروفون.");
    }
  }

  async function playMessageAsVoice(text) {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
        setIsSpeaking(false);
      }

      setIsSpeaking(true);

      const res = await fetch(`${BACKEND_URL}/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        throw new Error("TTS failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setIsSpeaking(false);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setIsSpeaking(false);
        setToast("فشل تشغيل الصوت.");
      };

      await audio.play();
    } catch (e) {
      console.error(e);
      setIsSpeaking(false);
      setToast("فشل تشغيل الصوت.");
    }
  }

  // ------------------ RENDER ------------------

  const inAppNotifications = notifications.filter(
    (n) => n.channel === "in_app"
  );

  // If not logged in: show login page
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100" dir="rtl">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg border text-right">
          <h1 className="text-lg font-semibold mb-1">مساعد أبشر الذكي</h1>
          <p className="text-xs text-slate-500 mb-4">
            تسجيل دخول  – يتم التحقق من البيانات من ملف JSON في الخادم.
          </p>

          <form className="space-y-3" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs mb-1">اسم المستخدم</label>
              <input
                className="w-full rounded-xl border px-3 py-2 text-sm bg-slate-50 text-right"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="مثال: abdullah"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">كلمة المرور</label>
              <input
                type="password"
                className="w-full rounded-xl border px-3 py-2 text-sm bg-slate-50 text-right"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="مثال: 123456"
              />
            </div>
            {loginError && (
              <div className="text-xs text-red-500 text-right">{loginError}</div>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-xl bg-emerald-600 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loginLoading ? "جاري تسجيل الدخول..." : "دخول"}
            </button>
          </form>

          <div className="mt-4 text-[11px] text-slate-500 text-right">
            بيانات تسجيل الدخول للتجربة:
            <div className="flex gap-4"><pre className="font-mono">abdullah </pre> <pre>123456</pre> </div>
            <div className="flex gap-4"><pre className="font-mono">fatimah </pre> <pre>password</pre></div>
            <div className="flex gap-4"><pre className="font-mono">khaled </pre> <pre>123123</pre>  </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100" dir="rtl">
      <header className="bg-white border-b px-4 py-3 shadow-sm flex justify-between items-center">
        <div className="text-right">
          <h1 className="font-semibold text-slate-900">مساعد أبشر الذكي</h1>
          <div className="text-xs text-slate-500">
            تسجيل الدخول باسم {userName} ({userId})
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-3">
            <button
              className={`text-xs ${
                activeTab === "chat"
                  ? "text-emerald-600 font-semibold"
                  : "text-slate-500"
              }`}
              onClick={() => setActiveTab("chat")}
            >
              المحادثة
            </button>

            <button
              className={`text-xs ${
                activeTab === "profile"
                  ? "text-emerald-600 font-semibold"
                  : "text-slate-500"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              الملف الشخصي
            </button>
          </div>

          <button
            className="text-xs text-red-500"
            onClick={() => {
              setUserId(null);
              setUserName(null);
              setMessages([]);
              setNotifications([]);
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 gap-4 p-4 md:flex-row flex-col text-right">
        {activeTab === "chat" && (
          <>
            {/* CHAT SECTION */}
            <section className="flex flex-col flex-1 bg-white rounded-xl p-4 shadow-sm border">
              <h2 className="text-sm font-semibold mb-2">المحادثة</h2>

              <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl p-3 space-y-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.from === "user" ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-xl px-3 py-2 text-sm ${
                        m.from === "user"
                          ? "bg-emerald-600 text-white"
                          : "bg-white border border-slate-200"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          {m.text}
                          <div className="text-[10px] opacity-50 mt-1">
                            {new Date(m.time).toLocaleTimeString("ar")}
                          </div>
                        </div>

                        {m.from === "agent" && (
                          <button
                            type="button"
                            className={`text-[10px] opacity-70 hover:opacity-100 ${
                              isSpeaking ? "cursor-not-allowed" : ""
                            }`}
                            onClick={() => !isSpeaking && playMessageAsVoice(m.text)}
                            title={isSpeaking ? "جاري التشغيل..." : "تشغيل الصوت"}
                          >
                            {isSpeaking ? "🔊…" : "🔊"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="text-xs text-slate-500 text-left">
                    المساعد يكتب…
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2 items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 h-16 rounded-xl border p-2 bg-slate-50 text-right"
                  placeholder="اكتب رسالة… أو استخدم الميكروفون 🎙️"
                />

                {/* Upload ID photo button */}
                <label className="cursor-pointer rounded-xl border px-3 py-2 text-sm bg-white text-slate-700">
                  {uploadingPhoto ? "جاري الرفع..." : "📷 صورة الهوية"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadIdPhoto}
                    disabled={uploadingPhoto}
                  />
                </label>

                {/* Voice recording */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`rounded-xl px-3 py-2 text-sm border ${
                    isRecording ? "bg-red-500 text-white" : "bg-white"
                  }`}
                  title={isRecording ? "إيقاف التسجيل" : "بدء التسجيل"}
                >
                  {isRecording ? "إيقاف" : "🎙️"}
                </button>

                <button
                  onClick={() => sendMessage()}
                  className="bg-emerald-600 text-white rounded-xl px-4 py-2 text-sm"
                >
                  إرسال
                </button>
              </div>
            </section>

            {/* Right Column */}
            <aside className="flex flex-col gap-4 md:w-80 w-full">
              <SmsPanel
                notifications={notifications}
                onRunProactive={runProactive}
                running={proactiveRunning}
              />

              <div className="flex flex-col flex-1 bg-white rounded-xl p-4 border shadow-sm">
                <h2 className="text-sm font-semibold">الإشعارات داخل التطبيق</h2>

                <div className="flex-1 overflow-y-auto space-y-2 mt-2">
                  {inAppNotifications.map((n) => (
                    <div
                      key={n.id}
                      className="bg-slate-50 p-2 rounded-xl border text-xs"
                    >
                      <div className="flex justify-between">
                        <span className="uppercase text-[10px]">
                          {n.channel}
                        </span>
                        <span className="text-[10px]">
                          {new Date(n.created_at).toLocaleString("ar")}
                        </span>
                      </div>
                      <div className="mt-1">{n.message}</div>
                    </div>
                  ))}
                </div>

                <button
                  className="text-xs text-emerald-600 mt-2"
                  onClick={fetchNotifications}
                >
                  تحديث
                </button>
              </div>
            </aside>
          </>
        )}

        {activeTab === "profile" && (
          <Profile
            userId={userId}
            userName={userName}
            notifications={notifications}
          />
        )}
      </main>

      {toast && (
        <div className="fixed bottom-4 inset-x-0 flex justify-center">
          <div className="bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow">
            {toast}{" "}
            <button
              onClick={() => setToast(null)}
              className="ml-3 text-slate-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {proposedAction && (
        <ActionModal
          action={proposedAction}
          loading={actionLoading}
          onConfirm={confirmAction}
          onClose={() => !actionLoading && setProposedAction(null)}
        />
      )}
    </div>
  );
}
