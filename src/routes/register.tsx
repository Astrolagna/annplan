import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("user already")) {
    return "Аккаунт с таким email уже существует. Попробуйте войти.";
  }
  if (m.includes("password") && m.includes("short")) {
    return "Пароль слишком короткий. Минимум 6 символов.";
  }
  if (m.includes("invalid email")) {
    return "Некорректный email.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Слишком много попыток. Попробуйте через минуту.";
  }
  return message;
}

function RegisterPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [needConfirm, setNeedConfirm] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    setSubmitting(false);
    if (error) {
      toast.error(translateAuthError(error.message));
      return;
    }
    if (data.session) {
      toast.success("Аккаунт создан");
      navigate({ to: "/app" });
    } else {
      // Email confirmation required.
      setNeedConfirm(true);
      toast.success("Проверьте почту, чтобы подтвердить регистрацию");
    }
  }

  async function onGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/app`,
    });
    if (result.error) toast.error(translateAuthError(result.error.message));
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md card-soft p-8">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">✦</div>
          <h1 className="text-3xl font-serif">Создать аккаунт</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Начните вести свой джйотиш-планер
          </p>
        </div>

        {needConfirm ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-foreground">
              Мы отправили письмо на <span className="font-medium">{email}</span>.
              Откройте его и перейдите по ссылке, чтобы подтвердить регистрацию.
              После этого вы сможете войти.
            </p>
            <Button onClick={() => navigate({ to: "/login" })} className="w-full rounded-xl">
              Перейти ко входу
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd">Пароль</Label>
                <Input id="pwd" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
                {submitting ? "Создание…" : "Зарегистрироваться"}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span>или</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="w-full rounded-xl" onClick={onGoogle}>
              Продолжить с Google
            </Button>
          </>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
