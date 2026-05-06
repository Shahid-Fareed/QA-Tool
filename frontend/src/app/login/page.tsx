"use client";

import React, { useActionState, useEffect, useRef } from "react";
import { loginAction, type LoginState } from "./actions";
import {
  Zap,
  Lock,
  Mail,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load persisted credentials
    const savedEmail = localStorage.getItem("remember_email");
    const savedPassword = localStorage.getItem("remember_password");
    const savedRemember = localStorage.getItem("remember_me") === "true";

    if (savedRemember) {
      setRememberMe(true);
      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
    }

    emailRef.current?.focus();
  }, []);

  const handleFormSubmit = () => {
    if (rememberMe) {
      localStorage.setItem("remember_email", email);
      localStorage.setItem("remember_password", password);
      localStorage.setItem("remember_me", "true");
    } else {
      localStorage.removeItem("remember_email");
      localStorage.removeItem("remember_password");
      localStorage.setItem("remember_me", "false");
    }
  };

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-15%] w-[50%] h-[50%] bg-brand/4 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[50%] h-[50%] bg-brand/4 blur-[140px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,217,180,0.03)_0%,transparent_70%)]" />
      </div>

      {/* Subtle grid lines */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16,217,180,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,217,180,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative w-full max-w-sm z-10">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8 gap-4">
          <div className="w-14 h-14 rounded-2xl border border-brand/30 bg-brand/5 flex items-center justify-center animate-pulse-emerald shadow-[0_0_30px_-5px_rgba(16,217,180,0.3)]">
            <Zap className="w-7 h-7 text-brand fill-current" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              QA Tool
            </h1>
          </div>
        </div>

        {/* Login Card */}
        <div className="spatial-card rounded-2xl p-8 cyan-glow">
          {/* Card Header */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Login
            </h2>
          </div>

          {/* Divider */}
          <div className="h-px bg-linear-to-r from-transparent via-brand/20 to-transparent mb-6" />

          {/* Error Alert */}
          {state?.error && (
            <div className="flex items-start gap-3 p-3 mb-5 rounded-xl border border-red-500/20 bg-red-500/5">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400 leading-relaxed">
                {state.error}
              </p>
            </div>
          )}

          <form
            action={formAction}
            onSubmit={handleFormSubmit}
            className="space-y-5"
          >
            {/* Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-muted-foreground"
              >
                Email
              </label>
              <div className="relative group/input">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within/input:text-brand transition-colors pointer-events-none" />
                <input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isPending}
                  placeholder="Enter Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-foreground bg-brand/5 border border-border placeholder:text-muted-foreground/30 focus:outline-none focus:border-brand/50 focus:bg-brand/10 focus:shadow-[0_0_0_3px_rgba(0,184,212,0.08)] hover:border-brand/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-muted-foreground"
              >
                Password
              </label>
              <div className="relative group/input">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within/input:text-brand transition-colors pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-sm text-foreground bg-brand/5 border border-border placeholder:text-muted-foreground/30 focus:outline-none focus:border-brand/50 focus:bg-brand/10 focus:shadow-[0_0_0_3px_rgba(0,184,212,0.08)] hover:border-brand/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground/40 hover:text-brand transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label
                className="flex items-center gap-2 cursor-pointer group"
                htmlFor="remember-me"
              >
                <div className="relative flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="sr-only"
                    checked={rememberMe}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setRememberMe(isChecked);
                      if (!isChecked) {
                        localStorage.removeItem("remember_email");
                        localStorage.removeItem("remember_password");
                        localStorage.setItem("remember_me", "false");
                      }
                    }}
                  />
                  <div
                    className={`
                    w-4.5 h-4.5 rounded-md border transition-all duration-200 flex items-center justify-center
                    ${rememberMe ? "bg-brand border-brand shadow-[0_0_10px_rgba(0,184,212,0.3)]" : "border-border bg-brand/5 group-hover:border-brand/30"}
                  `}
                  >
                    {rememberMe && (
                      <Check className="w-3 h-3 text-surface stroke-3" />
                    )}
                  </div>
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  Remember me
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit"
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-brand/80 text-surface border border-brand/80 hover:bg-brand hover:border-brand hover:shadow-[0_0_30px_-5px_rgba(0,229,255,0.6)] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2 mt-4"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-[10px] text-white/15 mt-6">
          Access is monitored for security.
        </p>
      </div>
    </main>
  );
}
