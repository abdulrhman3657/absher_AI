import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogIn, User, Lock, AlertCircle } from "lucide-react";
import { login } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Demo users from users.json
  const demoUsers = [
    { username: "abdullah", password: "123456", name: "Abdullah Al Saud" },
    { username: "fatimah", password: "password", name: "Fatimah Al Harbi" },
    { username: "khaled", password: "123123", name: "Khaled Al Otaibi" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "فشل تسجيل الدخول. يرجى التحقق من اسم المستخدم وكلمة المرور.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (demoUsername: string, demoPassword: string) => {
    setUsername(demoUsername);
    setPassword(demoPassword);
    setError(null);
    setIsLoading(true);

    try {
      await login(demoUsername, demoPassword);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "فشل تسجيل الدخول.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6faf9] via-white to-[#f0fbf8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0FAE9E] to-[#0B7F74] text-white text-3xl font-bold shadow-lg mb-4">
            أبشر
          </div>
          <h1 className="text-3xl font-bold text-[#1f3a37] mb-2">مرحباً بك</h1>
          <p className="text-[#4d6f6a]">سجل الدخول للوصول إلى خدمات أبشر</p>
        </div>

        <Card className="border-[#dfe8e6] shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-[#1f3a37]">تسجيل الدخول</CardTitle>
            <CardDescription className="text-[#4d6f6a]">
              أدخل بياناتك للوصول إلى حسابك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-right">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-right text-[#1f3a37]">
                  اسم المستخدم
                </Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#4d6f6a]" />
                  <Input
                    id="username"
                    dir="rtl"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    required
                    disabled={isLoading}
                    className="pr-10 bg-[#f6faf9] border-[#dfe8e6] focus:border-[#0FAE9E]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-right text-[#1f3a37]">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#4d6f6a]" />
                  <Input
                    id="password"
                    dir="rtl"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    required
                    disabled={isLoading}
                    className="pr-10 bg-[#f6faf9] border-[#dfe8e6] focus:border-[#0FAE9E]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full bg-gradient-to-br from-[#0FAE9E] to-[#0B7F74] hover:from-[#0B7F74] hover:to-[#0FAE9E] text-white shadow-lg h-12 text-base font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  <>
                    <LogIn className="ml-2 h-5 w-5" />
                    تسجيل الدخول
                  </>
                )}
              </Button>
            </form>

            {/* Demo Users Quick Login */}
            <div className="mt-6 pt-6 border-t border-[#e6efed]">
              <p className="text-sm text-center text-[#4d6f6a] mb-4">
                أو سجل الدخول كأحد المستخدمين التجريبيين:
              </p>
              <div className="space-y-2">
                {demoUsers.map((user) => (
                  <Button
                    key={user.username}
                    type="button"
                    variant="outline"
                    onClick={() => handleQuickLogin(user.username, user.password)}
                    disabled={isLoading}
                    className="w-full justify-start text-right border-[#dfe8e6] hover:bg-[#f0fbf8] hover:border-[#0FAE9E]"
                  >
                    <div className="flex-1 text-right">
                      <div className="font-semibold text-[#1f3a37]">{user.name}</div>
                      <div className="text-xs text-[#4d6f6a]">@{user.username}</div>
                    </div>
                    <User className="ml-2 h-4 w-4 text-[#0FAE9E]" />
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-[#4d6f6a] mt-6">
          نظام أبشر الذكي • خدمة تجريبية
        </p>
      </div>
    </div>
  );
};

export default Login;

