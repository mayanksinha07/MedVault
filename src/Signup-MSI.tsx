import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import doctorHeroImage from "./assets/doctor-hero-img.png";
import blueBackdrop from "./assets/blue-backdrop.png";
import canvasImage from "./assets/canvas-curve.png";
import medvaultLogo from "./assets/MedVault Logo.png";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Phone, UserRound } from "lucide-react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const FALLBACK_SIGNUP_URL = "https://api.escuelajs.co/api/v1/users/";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HERO_STATIC_TEXT = "Protect your friends and Family";
const HERO_TYPING_TEXT = "with MedVault";

function SignUp() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [typedHeroText, setTypedHeroText] = useState("");
  const [isDeletingHeroText, setIsDeletingHeroText] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

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

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleAgreeTermsChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({
      ...current,
      agreeTerms: event.target.checked,
    }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const fullName = formData.fullName.trim();
    const phone = formData.phone.trim();
    const email = formData.email.trim();

    if (!fullName || !phone || !email || !formData.password) {
      setErrorMessage("Please fill all required fields.");
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Password and confirm password do not match.");
      return;
    }

    if (!formData.agreeTerms) {
      setErrorMessage("Please accept the terms and privacy policy.");
      return;
    }

    setLoading(true);

    try {
      if (API_URL) {
        const payload = {
          name: fullName,
          email,
          phone,
          password: formData.password,
        };
        await axios.post(`${API_URL}/auth/signup`, payload);
      } else {
        await axios.post(FALLBACK_SIGNUP_URL, {
          name: fullName,
          email,
          password: formData.password,
          avatar: "https://i.imgur.com/LDOO4Qs.jpg",
        });
      }

      setSuccessMessage("Account created successfully. Redirecting to Sign In...");
      setErrorMessage("");
      setFormData({
        fullName: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
        agreeTerms: false,
      });
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (error) {
      console.error("Signup failed", error);
      const message = axios.isAxiosError(error)
        ? ((error.response?.data as { message?: string } | undefined)?.message ||
          error.message)
        : "Could not create account. Please try again.";
      setErrorMessage(message);
      setSuccessMessage("");
    } finally {
      setLoading(false);
    }
  };

  return (
     
    <div className="min-h-screen w-full flex flex-col md:flex-row">
        {/*Left Side */}
    
      <div className="md:w-1/2 w-full min-h-screen bg-indigo-50 flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <img 
          src={canvasImage} 
          className="absolute left-0 top-0 w-full h-full object-cover opacity-90"
          style={{ mixBlendMode: 'multiply' }}
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
                  <h2 className="text-3xl font-bold text-slate-800">
                    Create Your Account
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Secure your family health records with MedVault.
                  </p>
                </div>
          
                <div className="relative">
                  <UserRound
                    size={16}
                    className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
                  />
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Full Name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                </div>

                <div className="relative">
                  <Phone
                    size={16}
                    className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                </div>



                <div className="relative">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email ID"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                </div>
          
          
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Create Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-12 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
                  />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-12 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <label className="flex items-start gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={formData.agreeTerms}
                    onChange={handleAgreeTermsChange}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  I agree to MedVault Terms and Privacy Policy.
                </label>

                {errorMessage && (
                  <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
                    {errorMessage}
                  </p>
                )}

                {successMessage && (
                  <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {successMessage}
                  </p>
                )}
          
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3 rounded-xl font-semibold transition hover:from-cyan-700 hover:to-blue-700 shadow-lg"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>

                <button
                  onClick={() => navigate("/")}
                  type="button"
                  className="border border-cyan-300 text-cyan-700 py-3 rounded-xl font-semibold transition hover:bg-cyan-50"
                >
                  Already have an account? Sign In
                </button>

                <Link
                  to="/doctor/auth"
                  className="text-center border border-slate-300 text-slate-700 py-3 rounded-xl font-semibold transition hover:bg-slate-50"
                >
                  Doctor? Sign in here
                </Link>
          
              </form>
        </div>
      </div>
      
    </div>
  );
}

export default SignUp;

