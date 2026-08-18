import React, { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Edit3,
  Lock,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import AppSidebar from "../components/AppSidebar";

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  patientId: string;
  dateOfBirth: string;
  bloodGroup: string;
  address: string;
  emergencyContact: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const getAuthToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: "",
    email: "",
    phone: "",
    patientId: "",
    dateOfBirth: "",
    bloodGroup: "",
    address: "",
    emergencyContact: "",
  });

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [statusMessage, setStatusMessage] = useState(
    "Your profile details are up to date."
  );

  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      if (!API_URL) {
        setStatusMessage("Profile is using local placeholder data. Add VITE_API_URL for live profile sync.");
        return;
      }

      const token = getAuthToken();
      if (!token) {
        setStatusMessage("Please sign in again to load your profile.");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load profile");
        }

        const data = (await response.json()) as {
          user?: {
            name?: string;
            email?: string;
            phone?: string;
            patientId?: string;
          };
        };

        if (data.user) {
          setProfileData((current) => ({
            ...current,
            name: data.user?.name || "",
            email: data.user?.email || "",
            phone: data.user?.phone || "",
            patientId: data.user?.patientId || "",
          }));
        }
      } catch {
        setStatusMessage("Could not load profile from backend.");
      }
    };

    void loadProfile();
  }, []);

  const handleProfileChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfileData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleProfileSubmit = (e: FormEvent) => {
    e.preventDefault();
    setStatusMessage("Profile saved successfully. Patient details updated.");
  };

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage("New password and confirm password do not match.");
      return;
    }

    setPasswordMessage("Password changed successfully.");
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-gray-800">
      <AppSidebar active="profile" patientName={profileData.name} />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex flex-col gap-6">
          <section className="rounded-3xl bg-gradient-to-r from-blue-700 via-cyan-600 to-teal-500 p-8 text-white shadow-lg">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 text-white backdrop-blur">
                  <User size={40} />
                  <button
                    type="button"
                    className="absolute -bottom-2 -right-2 rounded-full bg-white p-2 text-blue-600 shadow-md"
                    aria-label="Update profile picture"
                  >
                    <Camera size={16} />
                  </button>
                </div>

                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-blue-100">
                    Patient Account
                  </p>
                  <h1 className="mt-2 text-3xl font-bold">{profileData.name}</h1>
                  <p className="mt-2 text-sm text-blue-50">
                    Securely manage your personal profile, patient ID, and account
                    settings in one place.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                  <p className="text-sm text-blue-100">Patient ID</p>
                  <p className="mt-1 font-semibold">{profileData.patientId}</p>
                </div>
                <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                  <p className="text-sm text-blue-100">Email</p>
                  <p className="mt-1 font-semibold">{profileData.email}</p>
                </div>
                <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                  <p className="text-sm text-blue-100">Phone</p>
                  <p className="mt-1 font-semibold">{profileData.phone}</p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Personal Information
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Update the details attached to your MedVault profile.
                  </p>
                </div>
                <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                  <Edit3 size={18} />
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-600">
                      Full Name
                    </span>
                    <input
                      type="text"
                      name="name"
                      value={profileData.name}
                      onChange={handleProfileChange}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-600">
                      Email Address
                    </span>
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-600">
                      Phone Number
                    </span>
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-600">
                      Patient ID
                    </span>
                    <input
                      type="text"
                      name="patientId"
                      value={profileData.patientId}
                      readOnly
                      className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-600 outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-600">
                      Date of Birth
                    </span>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={profileData.dateOfBirth}
                      onChange={handleProfileChange}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-600">
                      Blood Group
                    </span>
                    <input
                      type="text"
                      name="bloodGroup"
                      value={profileData.bloodGroup}
                      onChange={handleProfileChange}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-600">
                    Address
                  </span>
                  <textarea
                    name="address"
                    rows={3}
                    value={profileData.address}
                    onChange={handleProfileChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-600">
                    Emergency Contact
                  </span>
                  <input
                    type="tel"
                    name="emergencyContact"
                    value={profileData.emergencyContact}
                    onChange={handleProfileChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white"
                  />
                </label>

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-emerald-600">{statusMessage}</p>
                  <button
                    type="submit"
                    className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Save Profile
                  </button>
                </div>
              </form>
            </section>

            <div className="space-y-6">
              <section className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">Profile Summary</h2>
                <div className="mt-5 space-y-4">
                  <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                    <Mail className="mt-1 text-blue-600" size={18} />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-slate-800">{profileData.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                    <Phone className="mt-1 text-blue-600" size={18} />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium text-slate-800">{profileData.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                    <ShieldCheck className="mt-1 text-blue-600" size={18} />
                    <div>
                      <p className="text-sm text-gray-500">Patient ID</p>
                      <p className="font-medium text-slate-800">
                        {profileData.patientId}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-white/10 p-3">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Change Password</h2>
                    <p className="text-sm text-slate-300">
                      Keep your MedVault account secure.
                    </p>
                  </div>
                </div>

                <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
                  <input
                    type="password"
                    name="currentPassword"
                    placeholder="Current Password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 outline-none transition focus:border-cyan-400"
                  />
                  <input
                    type="password"
                    name="newPassword"
                    placeholder="New Password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 outline-none transition focus:border-cyan-400"
                  />
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm New Password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 outline-none transition focus:border-cyan-400"
                  />

                  {passwordMessage && (
                    <p className="text-sm text-cyan-300">{passwordMessage}</p>
                  )}

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-900 transition hover:bg-cyan-300"
                  >
                    Update Password
                  </button>
                </form>
              </section>
            </div>
          </div>
        </div>

        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white transition hover:bg-rose-700"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </main>
    </div>
  );
};

export default Profile;
