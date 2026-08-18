import React, { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  FileText,
  Hospital,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import AppSidebar from "../components/AppSidebar";

type AccessStatus = "active" | "expiring" | "expired";

interface SharedAccess {
  id: string;
  doctor: string;
  doctorId: string;
  specialty: string;
  hospital: string;
  reports: string[];
  sharedOn: string;
  expiresOn: string;
  purpose: string;
  status: AccessStatus;
  revokedByUser?: boolean;
  revokedAt?: string | null;
}

interface GrantAccessForm {
  doctor: string;
  doctorId: string;
  specialty: string;
  hospital: string;
  reports: string;
  expiresOn: string;
  purpose: string;
}

interface SharingSessionResponse {
  _id: string;
  doctor: string;
  doctorId?: string;
  specialty: string;
  hospital: string;
  reports: string[];
  sharedOn: string;
  expiresOn: string;
  purpose: string;
  status: AccessStatus;
  revokedByUser?: boolean;
  revokedAt?: string | null;
}

interface MedicalRecordOptionResponse {
  _id: string;
  title?: string;
  fileName?: string;
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const LOCAL_STORAGE_SHARING_KEY = "medvault_local_sharing_sessions";
const fallbackReportSuggestions = [
  "Cardiac ECG Report",
  "Blood Panel Q1",
  "MRI Scan",
  "Prescription Summary",
];
const getAuthToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const getDefaultExpiryDate = () => {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
};

const initialSharedAccess: SharedAccess[] = [
  {
    id: "sh-001",
    doctor: "Dr. Neha Sharma",
    doctorId: "DOC-1001",
    specialty: "Cardiologist",
    hospital: "Apollo Hospital",
    reports: ["Blood Panel", "ECG", "MRI Scan"],
    sharedOn: "2026-04-07",
    expiresOn: "2026-04-16",
    purpose: "Follow-up consultation for chest pain.",
    status: "active",
  },
  {
    id: "sh-002",
    doctor: "Dr. Rohan Patel",
    doctorId: "DOC-1002",
    specialty: "Orthopedic",
    hospital: "City Care Clinic",
    reports: ["X-Ray", "Prescription"],
    sharedOn: "2026-04-01",
    expiresOn: "2026-04-10",
    purpose: "Fracture review and recovery timeline.",
    status: "expired",
  },
  {
    id: "sh-003",
    doctor: "Dr. Aditi Menon",
    doctorId: "DOC-1003",
    specialty: "Endocrinologist",
    hospital: "Lifeline Medical Center",
    reports: ["HbA1c Report", "Thyroid Panel"],
    sharedOn: "2026-04-09",
    expiresOn: "2026-04-14",
    purpose: "Metabolic profile review.",
    status: "expiring",
  },
];

const statusStyles: Record<AccessStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  expiring: "bg-amber-100 text-amber-700",
  expired: "bg-rose-100 text-rose-700",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getStatusFromExpiry = (expiresOn: string): AccessStatus => {
  const expiryDate = new Date(expiresOn);
  const today = new Date();
  const daysLeft = Math.ceil(
    (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft <= 0) {
    return "expired";
  }
  if (daysLeft <= 2) {
    return "expiring";
  }
  return "active";
};

const loadLocalSessions = (): SharedAccess[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SHARING_KEY);
    if (!raw) {
      return initialSharedAccess;
    }
    const parsed = JSON.parse(raw) as SharedAccess[];
    return Array.isArray(parsed) ? parsed : initialSharedAccess;
  } catch {
    return initialSharedAccess;
  }
};

const saveLocalSessions = (sessions: SharedAccess[]) => {
  localStorage.setItem(LOCAL_STORAGE_SHARING_KEY, JSON.stringify(sessions));
};

const mapSession = (session: SharingSessionResponse): SharedAccess => ({
  id: session._id,
  doctor: session.doctor,
  doctorId: session.doctorId || "",
  specialty: session.specialty || "",
  hospital: session.hospital,
  reports: Array.isArray(session.reports) ? session.reports : [],
  sharedOn: session.sharedOn,
  expiresOn: session.expiresOn,
  purpose: session.purpose || "",
  status: session.status,
  revokedByUser: session.revokedByUser,
  revokedAt: session.revokedAt || null,
});

const ShareAccessPage: React.FC = () => {
  const [sharedAccess, setSharedAccess] = useState<SharedAccess[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revokingIds, setRevokingIds] = useState<string[]>([]);
  const [reportSuggestions, setReportSuggestions] = useState<string[]>(
    fallbackReportSuggestions
  );
  const [showReportDropdown, setShowReportDropdown] = useState(false);
  const [notice, setNotice] = useState(
    "Every access request is encrypted and protected with expiration controls."
  );
  const [grantForm, setGrantForm] = useState<GrantAccessForm>({
    doctor: "",
    doctorId: "",
    specialty: "",
    hospital: "",
    reports: "",
    expiresOn: getDefaultExpiryDate(),
    purpose: "",
  });
  const revokeTimersRef = React.useRef<Record<string, number>>({});

  const loadSessions = async () => {
    if (!API_URL) {
      const localData = loadLocalSessions();
      setSharedAccess(localData);
      setNotice("Using local sharing sessions. Add VITE_API_URL for live sync.");
      setLoading(false);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      const localData = loadLocalSessions();
      setSharedAccess(localData);
      setNotice("Sign in to sync sharing sessions from backend.");
      setLoading(false);
      return;
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [sharingResponse, recordsResponse] = await Promise.all([
        fetch(`${API_URL}/sharing`, { headers }),
        fetch(`${API_URL}/records`, { headers }),
      ]);

      if (!sharingResponse.ok) {
        throw new Error("Failed to load sharing sessions");
      }

      const sessions = (await sharingResponse.json()) as SharingSessionResponse[];
      setSharedAccess(Array.isArray(sessions) ? sessions.map(mapSession) : []);

      if (recordsResponse.ok) {
        const records = (await recordsResponse.json()) as MedicalRecordOptionResponse[];
        const derivedSuggestions = Array.from(
          new Set(
            records
              .map((item) => item.title || item.fileName || "")
              .map((item) => item.trim())
              .filter(Boolean)
          )
        );
        setReportSuggestions(
          derivedSuggestions.length ? derivedSuggestions : fallbackReportSuggestions
        );
      } else {
        setReportSuggestions(fallbackReportSuggestions);
      }

      setNotice("Sharing sessions synced with backend.");
    } catch {
      const localData = loadLocalSessions();
      setSharedAccess(localData);
      setReportSuggestions(fallbackReportSuggestions);
      setNotice("Backend unavailable. Showing local sharing sessions.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void loadSessions();
  }, []);

  React.useEffect(() => {
    sharedAccess.forEach((item) => {
      if (!item.revokedByUser || !item.revokedAt) {
        return;
      }
      if (revokeTimersRef.current[item.id]) {
        return;
      }

      const elapsed = Date.now() - new Date(item.revokedAt).getTime();
      const remaining = Math.max(0, 30000 - elapsed);

      revokeTimersRef.current[item.id] = window.setTimeout(() => {
        setSharedAccess((current) => {
          const next = current.filter((session) => session.id !== item.id);
          if (!API_URL) {
            saveLocalSessions(next);
          }
          return next;
        });
        delete revokeTimersRef.current[item.id];
      }, remaining);
    });

    return () => {
      Object.values(revokeTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      revokeTimersRef.current = {};
    };
  }, [sharedAccess]);

  const visibleAccess = React.useMemo(
    () =>
      sharedAccess.filter((item) => {
        if (!item.revokedByUser || !item.revokedAt) {
          return true;
        }
        return Date.now() - new Date(item.revokedAt).getTime() < 30000;
      }),
    [sharedAccess]
  );

  const activeCount = visibleAccess.filter(
    (item) => item.status === "active"
  ).length;
  const expiringCount = visibleAccess.filter(
    (item) => item.status === "expiring"
  ).length;
  const expiredCount = visibleAccess.filter(
    (item) => item.status === "expired"
  ).length;

  const filteredAccess = visibleAccess.filter((item) => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return true;
    }

    const searchableText = [
      item.doctor,
      item.doctorId,
      item.specialty,
      item.hospital,
      item.purpose,
      item.reports.join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(query);
  });

  const selectedReports = React.useMemo(
    () =>
      grantForm.reports
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [grantForm.reports]
  );

  const reportQuery = React.useMemo(() => {
    const parts = grantForm.reports.split(",");
    return (parts[parts.length - 1] || "").trim().toLowerCase();
  }, [grantForm.reports]);

  const filteredReportSuggestions = React.useMemo(() => {
    const selectedSet = new Set(selectedReports.map((item) => item.toLowerCase()));
    return reportSuggestions
      .filter((item) => !selectedSet.has(item.toLowerCase()))
      .filter((item) =>
        reportQuery ? item.toLowerCase().includes(reportQuery) : true
      )
      .slice(0, 8);
  }, [reportQuery, reportSuggestions, selectedReports]);

  const insertReportSuggestion = (value: string) => {
    const rawInput = grantForm.reports;
    const parts = rawInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const hasTrailingComma = rawInput.trimEnd().endsWith(",");

    if (parts.length === 0 || hasTrailingComma) {
      const nextParts = [...parts, value];
      setGrantForm((current) => ({
        ...current,
        reports: `${nextParts.join(", ")}, `,
      }));
      setShowReportDropdown(false);
      return;
    }

    const previousParts = parts.slice(0, -1);
    const nextParts = [...previousParts, value];
    setGrantForm((current) => ({
      ...current,
      reports: `${nextParts.join(", ")}, `,
    }));
    setShowReportDropdown(false);
  };

  const handleGrantFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setGrantForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (name === "reports") {
      setShowReportDropdown(true);
    }
  };

  const handleGrantAccess = async (event: FormEvent) => {
    event.preventDefault();

    const reports = grantForm.reports
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (reports.length === 0) {
      setNotice("Add at least one report before granting access.");
      return;
    }

    const status = getStatusFromExpiry(grantForm.expiresOn);

    const newAccess: SharedAccess = {
      id: `sh-${Date.now()}`,
      doctor: grantForm.doctor,
      doctorId: grantForm.doctorId,
      specialty: grantForm.specialty,
      hospital: grantForm.hospital,
      reports,
      sharedOn: new Date().toISOString().split("T")[0],
      expiresOn: grantForm.expiresOn,
      purpose: grantForm.purpose,
      status,
      revokedByUser: false,
      revokedAt: null,
    };

    setSubmitting(true);

    if (!API_URL) {
      setSharedAccess((current) => {
        const next = [newAccess, ...current];
        saveLocalSessions(next);
        return next;
      });
      setNotice(`Access granted to ${newAccess.doctor}.`);
      setGrantForm({
        doctor: "",
        doctorId: "",
        specialty: "",
        hospital: "",
        reports: "",
        expiresOn: getDefaultExpiryDate(),
        purpose: "",
      });
      setShowReportDropdown(false);
      setSubmitting(false);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setNotice("Please sign in again to grant access.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/sharing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctor: grantForm.doctor,
          doctorId: grantForm.doctorId,
          specialty: grantForm.specialty,
          hospital: grantForm.hospital,
          reports,
          expiresOn: grantForm.expiresOn,
          purpose: grantForm.purpose,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to grant access");
      }

      const session = (await response.json()) as SharingSessionResponse;
      const mappedSession = mapSession(session);
      setSharedAccess((current) => [mappedSession, ...current]);
      setNotice(`Access granted to ${mappedSession.doctor}.`);
      setGrantForm({
        doctor: "",
        doctorId: "",
        specialty: "",
        hospital: "",
        reports: "",
        expiresOn: getDefaultExpiryDate(),
        purpose: "",
      });
      setShowReportDropdown(false);
    } catch {
      setSharedAccess((current) => {
        const next = [newAccess, ...current];
        saveLocalSessions(next);
        return next;
      });
      setNotice("Backend unavailable. Access saved locally.");
      setGrantForm({
        doctor: "",
        doctorId: "",
        specialty: "",
        hospital: "",
        reports: "",
        expiresOn: getDefaultExpiryDate(),
        purpose: "",
      });
      setShowReportDropdown(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeAccess = async (id: string) => {
    const nowIso = new Date().toISOString();
    setRevokingIds((current) => [...current, id]);

    const applyLocalRevoke = () => {
      setSharedAccess((current) => {
        const next = current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "expired" as AccessStatus,
                revokedByUser: true,
                revokedAt: nowIso,
              }
            : item
        );
        if (!API_URL) {
          saveLocalSessions(next);
        }
        return next;
      });
    };

    if (!API_URL) {
      applyLocalRevoke();
      setNotice("Access was revoked successfully. Doctor info hides in 30 seconds.");
      setRevokingIds((current) => current.filter((item) => item !== id));
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setNotice("Please sign in again to revoke access.");
      setRevokingIds((current) => current.filter((item) => item !== id));
      return;
    }

    try {
      const response = await fetch(`${API_URL}/sharing/${id}/revoke`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to revoke access");
      }

      const session = (await response.json()) as SharingSessionResponse;
      setSharedAccess((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "expired" as AccessStatus,
                revokedByUser: true,
                revokedAt: session.revokedAt || nowIso,
              }
            : item
        )
      );
      setNotice("Access was revoked successfully. Doctor info hides in 30 seconds.");
    } catch {
      applyLocalRevoke();
      setNotice("Backend unavailable. Access revoked locally.");
    } finally {
      setRevokingIds((current) => current.filter((item) => item !== id));
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      <AppSidebar active="sharing" />

      <main className="flex-1 p-6 overflow-y-auto">
        <section className="rounded-3xl bg-gradient-to-r from-cyan-700 via-sky-600 to-blue-600 p-8 text-white shadow-lg">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-100">
                Secure Record Shari ng
              </p>
              <h1 className="mt-2 text-3xl font-bold">Access Control Center</h1>
              <p className="mt-2 max-w-2xl text-sm text-cyan-50">
                Grant doctors and hospitals temporary access to selected reports
                while keeping every action traceable.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("grant-access-form")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-sky-700 transition hover:bg-cyan-50"
            >
              <Plus size={18} />
              Grant Access
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 xl:col-span-2">
            <p className="text-sm text-gray-500">Search Shared Access</p>
            <div className="mt-3 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by doctor, doctor ID, hospital, report or purpose"
                className="ml-3 w-full bg-transparent outline-none text-sm"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-gray-500">Active</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{activeCount}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-gray-500">Expiring / Expired</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {expiringCount + expiredCount}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_1.85fr]">
          <div
            id="grant-access-form"
            className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Grant New Access</h2>
                <p className="text-sm text-gray-500">
                  Share only what is required, for as long as needed.
                </p>
              </div>
            </div>

            <form onSubmit={handleGrantAccess} className="mt-5 space-y-4">
              <input
                type="text"
                name="doctor"
                value={grantForm.doctor}
                onChange={handleGrantFormChange}
                required
                placeholder="Doctor Name"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
              />
              <input
                type="text"
                name="doctorId"
                value={grantForm.doctorId}
                onChange={handleGrantFormChange}
                required
                placeholder="Doctor ID"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
              />
              <input
                type="text"
                name="specialty"
                value={grantForm.specialty}
                onChange={handleGrantFormChange}
                required
                placeholder="Specialty"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
              />
              <input
                type="text"
                name="hospital"
                value={grantForm.hospital}
                onChange={handleGrantFormChange}
                required
                placeholder="Hospital / Clinic"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
              />
              <div className="relative">
                <input
                  type="text"
                  name="reports"
                  value={grantForm.reports}
                  onChange={handleGrantFormChange}
                  onFocus={() => setShowReportDropdown(true)}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setShowReportDropdown(false);
                    }, 120);
                  }}
                  required
                  placeholder="Reports (comma separated)"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                />

                {showReportDropdown && filteredReportSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-2 max-h-52 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-lg">
                    {filteredReportSuggestions.map((report) => (
                      <button
                        key={report}
                        type="button"
                        onClick={() => insertReportSuggestion(report)}
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-sky-50"
                      >
                        {report}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedReports.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedReports.map((report) => (
                    <span
                      key={report}
                      className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700"
                    >
                      {report}
                    </span>
                  ))}
                </div>
              )}
              <input
                type="date"
                name="expiresOn"
                value={grantForm.expiresOn}
                onChange={handleGrantFormChange}
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
              />
              <textarea
                name="purpose"
                value={grantForm.purpose}
                onChange={handleGrantFormChange}
                required
                rows={3}
                placeholder="Purpose of sharing"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
              />
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
              >
                <Plus size={16} />
                {submitting ? "Saving..." : "Confirm Grant Access"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Active Sharing Sessions
                </h2>
                <p className="text-sm text-gray-500">
                  Review active, expiring, and expired access sessions.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {filteredAccess.length} sessions
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {loading && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Loading sharing sessions...
                </div>
              )}

              {filteredAccess.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {item.doctor}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {item.specialty} at {item.hospital}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.status]}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm text-slate-700">
                      <UserRound size={15} className="text-sky-600" />
                      <span>
                        {item.doctor} | ID: {item.doctorId || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm text-slate-700">
                      <Hospital size={15} className="text-sky-600" />
                      <span>{item.hospital}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm text-slate-700">
                      <CalendarDays size={15} className="text-sky-600" />
                      <span>Shared {formatDate(item.sharedOn)}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm text-slate-700">
                      <Clock3 size={15} className="text-sky-600" />
                      <span>Expires {formatDate(item.expiresOn)}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <FileText size={15} />
                      Shared Reports
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {item.reports.map((report) => (
                        <span
                          key={`${item.id}-${report}`}
                          className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 border border-slate-200"
                        >
                          {report}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-gray-600">{item.purpose}</p>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={item.status === "expired" || revokingIds.includes(item.id)}
                      onClick={() => handleRevokeAccess(item.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-200"
                    >
                      <Trash2 size={14} />
                      {revokingIds.includes(item.id) ? "Revoking..." : "Revoke Access"}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {filteredAccess.length === 0 && (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-gray-500">
                No sharing sessions match your search.
              </div>
            )}
          </div>
        </section>

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
          <AlertTriangle size={18} />
          <p className="text-sm">{notice}</p>
        </div>
      </main>
    </div>
  );
};

export default ShareAccessPage;
