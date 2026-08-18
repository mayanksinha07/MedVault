import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import doctorHeroImage from "./assets/doctor-hero-img.png";
import blueBackdrop from "./assets/blue-backdrop.png";
import canvasImage from "./assets/canvas-curve.png";
import medvaultLogo from "./assets/MedVault Logo.png";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import axios from "axios";

const LOGIN_URL = "https://api.escuelajs.co/api/v1/auth/login";
const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const HERO_STATIC_TEXT = "Protect your friends and Family";
const HERO_TYPING_TEXT = "with MedVault";

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState(
    "Use your registered email and password to continue."
  );
  const [typedHeroText, setTypedHeroText] = useState("");
  const [isDeletingHeroText, setIsDeletingHeroText] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem("saved_email");
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    const atFullText = typedHeroText === HERO_TYPING_TEXT;
    const atEmptyText = typedHeroText.length === 0;

    let delay = isDeletingHeroText ? 70 : 95;
    if (atFullText) {
      delay = 1300;
    } else if (atEmptyText && isDeletingHeroText) {
      delay = 400;
    }

    const timer = window.setTimeout(() => {
      if (isDeletingHeroText) {
        if (atEmptyText) {
          setIsDeletingHeroText(false);
          return;
        }
        setTypedHeroText(HERO_TYPING_TEXT.slice(0, typedHeroText.length - 1));
        return;
      }

      if (atFullText) {
        setIsDeletingHeroText(true);
        return;
      }

      setTypedHeroText(HERO_TYPING_TEXT.slice(0, typedHeroText.length + 1));
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isDeletingHeroText, typedHeroText]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setErrorMessage("Please fill all fields.");
      return;
    }

    try {
      setLoading(true);

      const endpoint = API_URL ? `${API_URL}/auth/login` : LOGIN_URL;
      const response = await axios.post(endpoint, {
        email: normalizedEmail,
        password,
      });

      const token =
        response.data?.token || response.data?.access_token || "";

      if (!token) {
        throw new Error("Token missing in login response");
      }

      if (rememberMe) {
        localStorage.setItem("token", token);
        sessionStorage.removeItem("token");
        localStorage.setItem("saved_email", normalizedEmail);
      } else {
        sessionStorage.setItem("token", token);
        localStorage.removeItem("token");
        localStorage.removeItem("saved_email");
      }

      setNotice("Login successful. Redirecting to dashboard...");
      navigate("/dashboard");
    } catch (error) {
      console.log("Login failed", error);
      const message = axios.isAxiosError(error)
        ? ((error.response?.data as { message?: string } | undefined)?.message ||
          error.message)
        : "Login failed. Please try again.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row">
      <div className="md:w-1/2 w-full min-h-screen bg-indigo-50 flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <img
          src={canvasImage}
          className="absolute left-0 top-0 w-full h-full object-cover opacity-90"
          style={{ mixBlendMode: "multiply" }}
        />

        <div className="relative z-10 w-full flex flex-col items-center">
          <h1 className="text-center mb-10 leading-tight px-4">
            <span className="block text-[30px] md:text-[40px] font-black tracking-tight text-slate-800 drop-shadow-[0_3px_14px_rgba(15,23,42,0.22)]">
              {HERO_STATIC_TEXT}
            </span>
            <span className="mt-3 inline-flex min-h-10 items-center rounded-full bg-white/80 px-4 py-1.5 text-base md:text-xl font-semibold text-cyan-700 ring-1 ring-cyan-200 shadow-sm">
              {typedHeroText}
              <span className="ml-1 inline-block h-5 w-[2px] animate-pulse bg-cyan-600" />
            </span>
          </h1>

          <div
            className="relative w-full max-w-[360px] h-[320px] md:h-[360px] bg-cover bg-center flex items-center justify-center rounded-3xl mx-auto"
            style={{ backgroundImage: `url(${blueBackdrop})` }}
          >
            <img
              src={doctorHeroImage}
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-[340px] md:h-[400px]"
            />
          </div>
        </div>
      </div>

      <div className="md:w-1/2 w-full min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-100 flex items-center justify-center relative overflow-hidden">
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-cyan-200/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-8 h-56 w-56 rounded-full bg-blue-200/60 blur-3xl" />

        <div className="absolute top-6 left-6">
          <img src={medvaultLogo} className="w-20 h-17" />
        </div>

        <div className="w-full max-w-md px-6 relative z-10">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[430px] flex flex-col gap-4 border border-white/70 rounded-3xl p-8 bg-white/90 backdrop-blur shadow-[0_22px_60px_-20px_rgba(2,132,199,0.45)]"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-800">Welcome Back</h2>
              <p className="mt-1 text-sm text-slate-500">
                Sign in to continue to your MedVault dashboard.
              </p>
            </div>

            <div className="relative">
              <Mail
                size={16}
                className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
              />
              <input
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrorMessage("");
                }}
                type="email"
                placeholder="Email ID"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none transition focus:border-cyan-400 focus:bg-white"
              />
            </div>

            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
              />
              <input
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorMessage("");
                }}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-12 outline-none transition focus:border-cyan-400 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-500">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => setNotice("Password reset will be available soon.")}
                className="text-cyan-700 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {errorMessage && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3 rounded-xl font-semibold transition hover:from-cyan-700 hover:to-blue-700 shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-200" />
              <p className="text-xs text-slate-400">or</p>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              onClick={() => navigate("/signup")}
              type="button"
              className="border border-cyan-300 text-cyan-700 py-3 rounded-xl font-semibold transition hover:bg-cyan-50"
            >
              New User? Sign Up
            </button>

            <p className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-50 px-3 py-2 text-xs text-cyan-700">
              <ShieldCheck size={14} />
              {notice}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
