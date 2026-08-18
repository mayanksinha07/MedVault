import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, Stethoscope, UserRound } from "lucide-react";

import doctorHeroImage from "./assets/doctor-hero-img.png";
import blueBackdrop from "./assets/blue-backdrop.png";
import canvasImage from "./assets/canvas-curve.png";
import medvaultLogo from "./assets/MedVault Logo.png";

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const DOCTOR_TOKEN_KEY = "doctor_token";
const HERO_STATIC_TEXT = "Deliver better care";
const HERO_TYPING_TEXT = "with MedVault Doctor Portal";

type Mode = "signin" | "signup";

const DoctorAuth = () => {
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [typedHeroText, setTypedHeroText] = useState("");
  const [isDeletingHeroText, setIsDeletingHeroText] = useState(false);
  const [notice, setNotice] = useState("Secure doctor authentication with role-based access.");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "",
    clinicName: "",
    licenseNumber: "",
    password: "",
  });
  const navigate = useNavigate();

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

    return () => window.clearTimeout(timer);
  }, [typedHeroText, isDeletingHeroText]);

  const endpoint = API_URL ? `${API_URL}/doctor` : "";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!endpoint) {
      setError("VITE_API_URL is missing.");
      return;
    }

    setLoading(true);
    try {
      const isSignUp = mode === "signup";
      const response = await fetch(`${endpoint}/${isSignUp ? "signup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSignUp
            ? form
            : {
                email: form.email,
                password: form.password,
              }
        ),
      });

      const data = (await response.json()) as {
        token?: string;
        doctor?: { doctorId?: string; name?: string; specialization?: string };
        message?: string;
      };

      if (!response.ok || !data.token) {
        throw new Error(data.message || "Doctor authentication failed");
      }

      localStorage.setItem(DOCTOR_TOKEN_KEY, data.token);
      if (data.doctor) {
        localStorage.setItem("doctor_profile", JSON.stringify(data.doctor));
      }
      setNotice(
        isSignUp
          ? `Account created. Your Doctor ID is ${data.doctor?.doctorId || "generated"}.`
          : `Welcome ${data.doctor?.name || "Doctor"}`
      );
      navigate("/doctor/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
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
            className="w-full max-w-[460px] flex flex-col gap-4 border border-white/70 rounded-3xl p-8 bg-white/90 backdrop-blur shadow-[0_22px_60px_-20px_rgba(2,132,199,0.45)]"
            onSubmit={handleSubmit}
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-800">
                {mode === "signin" ? "Doctor Sign In" : "Doctor Sign Up"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {mode === "signin"
                  ? "Access your connected patients and records securely."
                  : "Create your clinical account to join MedVault."}
              </p>
            </div>

            <div className="mt-1 inline-flex rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  mode === "signin" ? "bg-white text-slate-900" : "text-slate-600"
                }`}
                onClick={() => setMode("signin")}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  mode === "signup" ? "bg-white text-slate-900" : "text-slate-600"
                }`}
                onClick={() => setMode("signup")}
              >
                Sign Up
              </button>
            </div>

            {mode === "signup" && (
              <>
                <div className="relative">
                  <UserRound size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
                  <input
                    required
                    placeholder="Full Name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="relative">
                    <Phone size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
                    <input
                      required
                      placeholder="Phone"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none transition focus:border-cyan-400 focus:bg-white"
                    />
                  </div>
                  <div className="relative">
                    <Stethoscope
                      size={16}
                      className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
                    />
                    <input
                      required
                      placeholder="Specialization"
                      value={form.specialization}
                      onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none transition focus:border-cyan-400 focus:bg-white"
                    />
                  </div>
                </div>
                <input
                  required
                  placeholder="Hospital / Clinic Name"
                  value={form.clinicName}
                  onChange={(e) => setForm((f) => ({ ...f, clinicName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 outline-none transition focus:border-cyan-400 focus:bg-white"
                />
                <input
                  required
                  placeholder="License Number"
                  value={form.licenseNumber}
                  onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 outline-none transition focus:border-cyan-400 focus:bg-white"
                />
              </>
            )}

            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
              <input
                required
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none transition focus:border-cyan-400 focus:bg-white"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
              <input
                required
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
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

            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

            <button
              disabled={loading}
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3 font-semibold transition hover:from-cyan-700 hover:to-blue-700 disabled:bg-cyan-300"
            >
              {loading ? "Please wait..." : mode === "signup" ? "Create Doctor Account" : "Sign In"}
            </button>

            <Link
              to="/"
              className="text-center border border-slate-300 text-slate-700 py-3 rounded-xl font-semibold transition hover:bg-slate-50"
            >
              Back to Patient Login
            </Link>

            <p className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-50 px-3 py-2 text-xs text-cyan-700">
              <ShieldCheck size={14} />
              {notice}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DoctorAuth;

