import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Неверный email или пароль. Если регистрировались через Google — войдите через Google.";
  }
  if (m.includes("email not confirmed")) {
    return "Email ещё не подтверждён. Проверьте почту и перейдите по ссылке из письма.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Слишком много попыток. Попробуйте через минуту.";
  }
  if (m.includes("network")) {
    return "Проблема с сетью. Проверьте соединение и попробуйте снова.";
  }
  return message;
}

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(translateAuthError(error.message));
      return;
    }
    if (data.session) {
      navigate({ to: "/app" });
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
          <h1 className="text-3xl font-serif">С возвращением</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Войдите, чтобы продолжить путь
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pwd">Пароль</Label>
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
                Забыли пароль?
              </Link>
            </div>
            <Input id="pwd" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
            {submitting ? "Вход…" : "Войти"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>или</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full rounded-xl" onClick={onGoogle}>
          Войти через Google
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Нет аккаунта?{" "}
          <Link to="/register" className="text-primary hover:underline">
            Создать
          </Link>
        </p>
      </div>
    </div>
  );
}
