import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  BellRing,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  HeartPulse,
  MessageCircle,
  Phone,
  Pill,
  Search,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  TrendingUp,
  UserRound,
  Waves,
} from "lucide-react";
import AppSidebar from "../components/AppSidebar";

interface AppointmentItem {
  id: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  mode: "In-person" | "Online";
  status: "today" | "upcoming" | "completed";
}

interface ReminderItem {
  id: string;
  title: string;
  dosage: string;
  time: string;
  taken: boolean;
}

interface DashboardSummaryResponse {
  vitals: {
    heartRate: number;
    temperature: number;
    bloodPressure: string;
  };
  metrics: {
    healthScore: number;
  };
  recentAppointments: Array<Partial<AppointmentItem> & { id?: string }>;
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const getAuthToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const fallbackAppointments: AppointmentItem[] = [
  {
    id: "apt-001",
    doctor: "Dr. Neha Sharma",
    specialty: "Cardiology",
    date: "2026-04-14",
    time: "11:30 AM",
    mode: "In-person",
    status: "today",
  },
  {
    id: "apt-002",
    doctor: "Dr. Aditi Menon",
    specialty: "Endocrinology",
    date: "2026-04-18",
    time: "04:15 PM",
    mode: "Online",
    status: "upcoming",
  },
  {
    id: "apt-003",
    doctor: "Dr. Rohan Patel",
    specialty: "Orthopedics",
    date: "2026-04-09",
    time: "09:45 AM",
    mode: "In-person",
    status: "completed",
  },
];

const initialReminders: ReminderItem[] = [
  {
    id: "med-001",
    title: "Metformin",
    dosage: "500 mg",
    time: "08:00 AM",
    taken: true,
  },
  {
    id: "med-002",
    title: "Vitamin D3",
    dosage: "1000 IU",
    time: "01:00 PM",
    taken: false,
  },
  {
    id: "med-003",
    title: "Atorvastatin",
    dosage: "20 mg",
    time: "09:00 PM",
    taken: false,
  },
];

const waveBars = [34, 52, 48, 69, 57, 74, 62, 78, 55, 67, 44, 63, 58, 72];

const getStatusStyles = (status: AppointmentItem["status"]) => {
  if (status === "today") {
    return "bg-cyan-100 text-cyan-700";
  }
  if (status === "upcoming") {
    return "bg-indigo-100 text-indigo-700";
  }
  return "bg-emerald-100 text-emerald-700";
};

const Dashboard = () => {
  const [searchText, setSearchText] = useState("");
  const [reminders, setReminders] = useState<ReminderItem[]>(initialReminders);
  const [timelineAppointments, setTimelineAppointments] =
    useState<AppointmentItem[]>(fallbackAppointments);
  const [vitals, setVitals] = useState({
    heartRate: "72 bpm",
    temperature: "98.4 F",
    bloodPressure: "118 / 76",
  });
  const [healthScore, setHealthScore] = useState("91%");
  const [notice, setNotice] = useState(
    "Vitals are synced from your latest checkup and wearable feed."
  );

  useEffect(() => {
    let ignore = false;

    const loadDashboardSummary = async () => {
      if (!API_URL) {
        return;
      }

      const token = getAuthToken();
      if (!token) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/dashboard/summary`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load dashboard summary");
        }

        const data = (await response.json()) as DashboardSummaryResponse;
        if (ignore) {
          return;
        }

        if (data?.vitals) {
          setVitals({
            heartRate: `${data.vitals.heartRate} bpm`,
            temperature: `${data.vitals.temperature} F`,
            bloodPressure: data.vitals.bloodPressure,
          });
        }

        if (data?.metrics?.healthScore !== undefined) {
          setHealthScore(`${data.metrics.healthScore}%`);
        }

        if (Array.isArray(data?.recentAppointments) && data.recentAppointments.length) {
          const normalizedAppointments: AppointmentItem[] = data.recentAppointments.map(
            (item, index) => ({
              id: item.id || `apt-backend-${index}`,
              doctor: item.doctor || "Doctor",
              specialty: item.specialty || "Consultation",
              date: item.date || "",
              time: item.time || "",
              mode: (item.mode === "Online" ? "Online" : "In-person") as
                | "In-person"
                | "Online",
              status:
                item.status === "today" ||
                item.status === "upcoming" ||
                item.status === "completed"
                  ? item.status
                  : "upcoming",
            })
          );
          setTimelineAppointments(normalizedAppointments);
        }

        setNotice("Dashboard synced from backend successfully.");
      } catch {
        if (!ignore) {
          setNotice("Using local dashboard values. Backend summary unavailable.");
        }
      }
    };

    void loadDashboardSummary();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredAppointments = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return timelineAppointments.filter((item) => {
      if (!query) {
        return true;
      }

      const text = `${item.doctor} ${item.specialty} ${item.mode}`.toLowerCase();
      return text.includes(query);
    });
  }, [searchText, timelineAppointments]);

  const nextVisitText = useMemo(() => {
    const nextVisit = timelineAppointments.find(
      (item) => item.status === "today" || item.status === "upcoming"
    );

    if (!nextVisit) {
      return "No upcoming visits";
    }

    return `${nextVisit.date} | ${nextVisit.time}`;
  }, [timelineAppointments]);

  const completedReminders = reminders.filter((item) => item.taken).length;
  const adherenceRate = Math.round((completedReminders / reminders.length) * 100);

  const handleToggleReminder = (id: string) => {
    setReminders((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              taken: !item.taken,
            }
          : item
      )
    );

    setNotice("Medication reminder updated.");
  };

  const handleQuickAction = (label: string) => {
    setNotice(`${label} is ready.`);
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      <AppSidebar active="dashboard" />

      <main className="flex-1 p-6 overflow-y-auto">
        <section className="rounded-3xl bg-gradient-to-r from-blue-700 via-cyan-700 to-emerald-600 p-8 text-white shadow-lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-100">
                Health Operations
              </p>
              <h1 className="mt-2 text-3xl font-bold">Patient Command Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-cyan-50">
                Track vitals, appointments, and treatment progress from one place
                with secure access across your MedVault records.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleQuickAction("Medical records")}
                className="rounded-2xl bg-white px-4 py-3 text-left text-cyan-700 transition hover:bg-cyan-50"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-500">
                  Patient ID
                </p>
                <p className="mt-1 text-sm font-bold">MV-2026-1042</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickAction("Upcoming appointment")}
                className="rounded-2xl bg-white px-4 py-3 text-left text-cyan-700 transition hover:bg-cyan-50"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-500">
                  Next Visit
                </p>
                <p className="mt-1 text-sm font-bold">{nextVisitText}</p>
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search appointments by doctor, specialty or mode"
              className="ml-3 w-full bg-transparent text-sm outline-none"
            />
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Heart Rate</p>
              <HeartPulse className="text-rose-500" size={18} />
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">{vitals.heartRate}</p>
            <p className="mt-1 text-sm text-emerald-600">Normal Range</p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Body Temperature</p>
              <Thermometer className="text-amber-500" size={18} />
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">{vitals.temperature}</p>
            <p className="mt-1 text-sm text-emerald-600">Stable</p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Blood Pressure</p>
              <Activity className="text-cyan-600" size={18} />
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">{vitals.bloodPressure}</p>
            <p className="mt-1 text-sm text-cyan-700">Last Sync: 2h ago</p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Health Score</p>
              <TrendingUp className="text-emerald-600" size={18} />
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">{healthScore}</p>
            <p className="mt-1 text-sm text-emerald-600">+6% this week</p>
          </article>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.8fr_1.2fr]">
          <div className="space-y-6">
            <article className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">ECG Live Trend</h2>
                  <p className="text-sm text-slate-500">
                    Simulated wave snapshot from today&apos;s readings.
                  </p>
                </div>
                <div className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
                  Stable Rhythm
                </div>
              </div>

              <div className="mt-5 flex h-32 items-end gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                {waveBars.map((height, index) => (
                  <div
                    key={`${height}-${index}`}
                    className="flex-1 rounded-t-xl bg-gradient-to-t from-cyan-600 to-blue-500 transition-all duration-300"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <p className="text-slate-600">Average BPM: {vitals.heartRate}</p>
                <p className="inline-flex items-center gap-1 text-cyan-700">
                  <Waves size={14} />
                  Rhythm Guard Active
                </p>
              </div>
            </article>

            <article className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Appointment Timeline
                  </h2>
                  <p className="text-sm text-slate-500">
                    See upcoming and completed consultations in one view.
                  </p>
                </div>
                <Link
                  to="/appointments"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700"
                >
                  Open
                  <ChevronRight size={14} />
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {filteredAppointments.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{item.doctor}</p>
                        <p className="text-sm text-slate-600">{item.specialty}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 border border-slate-200">
                        <CalendarDays size={12} />
                        {item.date}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 border border-slate-200">
                        <Clock3 size={12} />
                        {item.time}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 border border-slate-200">
                        <Stethoscope size={12} />
                        {item.mode}
                      </span>
                    </div>
                  </div>
                ))}

                {filteredAppointments.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No appointments match your search.
                  </div>
                )}
              </div>
            </article>
          </div>

          <div className="space-y-6">
            <article className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Medication Reminders
                  </h2>
                  <p className="text-sm text-slate-500">
                    Today&apos;s adherence and intake schedule.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {adherenceRate}% done
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {reminders.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-600">
                          {item.dosage} | {item.time}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleReminder(item.id)}
                        className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
                          item.taken
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        }`}
                      >
                        {item.taken ? "Taken" : "Mark as taken"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <BellRing size={18} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Support and Safety</h2>
                  <p className="text-sm text-slate-300">
                    Secure communication and quick emergency contact.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <p className="inline-flex items-center gap-2">
                  <UserRound size={14} />
                  Assigned Care Team: Apollo Primary Unit
                </p>
                <p className="inline-flex items-center gap-2">
                  <ShieldCheck size={14} />
                  Record access is monitored in real time
                </p>
                <p className="inline-flex items-center gap-2">
                  <Pill size={14} />
                  3 medications scheduled for today
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleQuickAction("Calling care team")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-3 py-2 font-semibold text-slate-900 transition hover:bg-cyan-300"
                >
                  <Phone size={14} />
                  Call
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAction("Opening secure chat")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 font-semibold text-white transition hover:bg-white/20"
                >
                  <MessageCircle size={14} />
                  Message
                </button>
              </div>

              <Link
                to="/sharing"
                className="mt-4 inline-flex items-center gap-1 text-sm text-cyan-300"
              >
                Open sharing controls
                <ChevronRight size={14} />
              </Link>
            </article>
          </div>
        </section>

        <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-800">
          <p className="text-sm inline-flex items-center gap-2">
            <FileText size={14} />
            {notice}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
