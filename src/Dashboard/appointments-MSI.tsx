import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  CalendarDays,
  CheckSquare,
  Clock3,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  UserRound,
} from "lucide-react";
import AppSidebar from "../components/AppSidebar";

interface Appointment {
  _id?: string;
  doctor: string;
  doctorId: string;
  date: string;
  time: string;
  notes?: string;
  isDoctorAppointment?: boolean;
  doctorAppointmentId?: number;
}

interface DoctorAppointmentResponse {
  id: number;
  doctor: string;
  doctorId: string;
  visitDate: string;
  notes?: string;
  status?: string;
}

type AppointmentStatus = "today" | "upcoming" | "past";
type FilterStatus = "all" | AppointmentStatus;

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const LOCAL_STORAGE_APPOINTMENTS_KEY = "medvault_local_appointments";
const getAuthToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

const sampleAppointments: Appointment[] = [
  {
    _id: "sample-1",
    doctor: "Dr. Neha Sharma",
    doctorId: "DOC-1001",
    date: "2026-04-14",
    time: "11:30",
    notes: "Cardiology follow-up",
  },
  {
    _id: "sample-2",
    doctor: "Dr. Aditi Menon",
    doctorId: "DOC-1002",
    date: "2026-04-18",
    time: "16:15",
    notes: "Endocrinology review",
  },
  {
    _id: "sample-3",
    doctor: "Dr. Rohan Patel",
    doctorId: "DOC-1003",
    date: "2026-04-09",
    time: "09:45",
    notes: "Orthopedic checkup",
  },
];

const loadLocalAppointments = (): Appointment[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_APPOINTMENTS_KEY);
    if (!raw) {
      return sampleAppointments;
    }
    const parsed = JSON.parse(raw) as Appointment[];
    return Array.isArray(parsed) ? parsed : sampleAppointments;
  } catch {
    return sampleAppointments;
  }
};

const saveLocalAppointments = (items: Appointment[]) => {
  localStorage.setItem(LOCAL_STORAGE_APPOINTMENTS_KEY, JSON.stringify(items));
};

const getTodayDateString = () => {
  return new Date().toISOString().split("T")[0];
};

const toTimestamp = (date: string, time: string) => {
  const raw = `${date}T${time && time.length <= 5 ? time : "00:00"}`;
  const fromDateTime = Date.parse(raw);
  if (!Number.isNaN(fromDateTime)) {
    return fromDateTime;
  }

  const fromDateOnly = Date.parse(date);
  if (!Number.isNaN(fromDateOnly)) {
    return fromDateOnly;
  }

  return 0;
};

const mapDoctorAppointment = (item: DoctorAppointmentResponse): Appointment => {
  const parsed = new Date(item.visitDate);
  const date = Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().split("T")[0];
  const time = Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

  return {
    _id: `doctor-${item.id}`,
    doctor: item.doctor || "Doctor",
    doctorId: item.doctorId || "",
    date,
    time,
    notes: item.notes || "",
    isDoctorAppointment: true,
    doctorAppointmentId: item.id,
  };
};

const getAppointmentStatus = (appointment: Appointment): AppointmentStatus => {
  const today = getTodayDateString();

  if (appointment.date === today) {
    return "today";
  }

  if (appointment.date > today) {
    return "upcoming";
  }

  return "past";
};

const formatDate = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (time: string) => {
  if (!time) {
    return "Time not set";
  }

  if (/am|pm/i.test(time)) {
    return time;
  }

  if (/^\d{2}:\d{2}$/.test(time)) {
    const parsed = new Date(`2000-01-01T${time}`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      });
    }
  }

  return time;
};

const statusStyles: Record<AppointmentStatus, string> = {
  today: "bg-cyan-100 text-cyan-700",
  upcoming: "bg-emerald-100 text-emerald-700",
  past: "bg-slate-200 text-slate-700",
};

const Appointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [form, setForm] = useState<Appointment>({
    doctor: "",
    doctorId: "",
    date: "",
    time: "",
    notes: "",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("Syncing appointments...");

  useEffect(() => {
    let ignore = false;

    const loadAppointments = async () => {
      if (!API_URL) {
        if (!ignore) {
          setAppointments(loadLocalAppointments());
          setLoading(false);
          setNotice("Using local appointments. Add VITE_API_URL for live sync.");
        }
        return;
      }

      try {
        const headers = {
          ...getAuthHeaders(),
        };
        const [patientResponse, doctorResponse] = await Promise.all([
          fetch(`${API_URL}/appointments`, { headers }),
          fetch(`${API_URL}/doctor/patient/appointments`, { headers }),
        ]);
        if (!patientResponse.ok) {
          throw new Error("Failed to load appointments");
        }

        const patientData = (await patientResponse.json()) as Appointment[];
        const doctorData = doctorResponse.ok
          ? ((await doctorResponse.json()) as {
              appointments?: DoctorAppointmentResponse[];
            })
          : { appointments: [] };
        const merged = [
          ...(Array.isArray(patientData) ? patientData : []),
          ...((doctorData.appointments || []).map(mapDoctorAppointment) as Appointment[]),
        ];
        if (!ignore) {
          setAppointments(merged);
          setNotice("Appointments synced with your backend.");
        }
      } catch {
        if (!ignore) {
          setAppointments(loadLocalAppointments());
          setNotice("Backend unavailable. Showing local appointments for now.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadAppointments();

    return () => {
      ignore = true;
    };
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    const localAppointment: Appointment = {
      _id: `local-${Date.now()}`,
      doctor: form.doctor,
      doctorId: form.doctorId,
      date: form.date,
      time: form.time,
      notes: form.notes,
    };

    if (!API_URL) {
      setAppointments((current) => {
        const next = [localAppointment, ...current];
        saveLocalAppointments(next);
        return next;
      });
      setNotice("Appointment saved locally.");
      setForm({ doctor: "", doctorId: "", date: "", time: "", notes: "" });
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Failed to create appointment");
      }

      const newAppointment = (await response.json()) as Appointment;
      setAppointments((current) => [newAppointment, ...current]);
      setNotice("Appointment added successfully.");
      setForm({ doctor: "", doctorId: "", date: "", time: "", notes: "" });
    } catch {
      setAppointments((current) => {
        const next = [localAppointment, ...current];
        saveLocalAppointments(next);
        return next;
      });
      setNotice("Could not reach API. Appointment saved locally.");
      setForm({ doctor: "", doctorId: "", date: "", time: "", notes: "" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      setNotice("Select at least one appointment to delete.");
      return;
    }

    setDeleting(true);
    const selectedSet = new Set(selectedIds);

    if (!API_URL) {
      setAppointments((current) => {
        const next = current.filter((item) => !selectedSet.has(item._id || ""));
        saveLocalAppointments(next);
        return next;
      });
      setSelectedIds([]);
      setNotice("Selected appointments deleted.");
      setDeleting(false);
      return;
    }

    const localIds = selectedIds.filter((id) => id.startsWith("local-"));
    const doctorIds = selectedIds.filter((id) => id.startsWith("doctor-"));
    const patientRemoteIds = selectedIds.filter(
      (id) => !id.startsWith("local-") && !id.startsWith("doctor-")
    );

    const patientDeleteResults = await Promise.allSettled(
      patientRemoteIds.map((id) =>
        fetch(`${API_URL}/appointments/${id}`, {
          method: "DELETE",
          headers: {
            ...getAuthHeaders(),
          },
        })
      )
    );

    const doctorDeleteResults = await Promise.allSettled(
      doctorIds.map((id) =>
        fetch(
          `${API_URL}/doctor/patient/appointments/${id.replace("doctor-", "")}`,
          {
            method: "DELETE",
            headers: {
              ...getAuthHeaders(),
            },
          }
        )
      )
    );

    const failedRemote =
      patientDeleteResults.filter(
        (result) => result.status === "rejected" || (result.value && !result.value.ok)
      ).length +
      doctorDeleteResults.filter(
        (result) => result.status === "rejected" || (result.value && !result.value.ok)
      ).length;

    const removableIds = new Set([
      ...localIds,
      ...patientRemoteIds.filter((_id, index) => {
        const result = patientDeleteResults[index];
        return result?.status === "fulfilled" && result.value.ok;
      }),
      ...doctorIds.filter((_id, index) => {
        const result = doctorDeleteResults[index];
        return result?.status === "fulfilled" && result.value.ok;
      }),
    ]);

    setAppointments((current) => {
      const next = current.filter((item) => !removableIds.has(item._id || ""));
      const stillLocal = next.filter((item) => (item._id || "").startsWith("local-"));
      saveLocalAppointments(stillLocal);
      return next;
    });

    setSelectedIds([]);
    setNotice(
      failedRemote === 0
        ? "Selected appointments deleted."
        : `${failedRemote} appointment(s) could not be deleted.`
    );
    setDeleting(false);
  };

  const filteredAppointments = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return appointments
      .filter((appointment) => {
        const matchesSearch =
          appointment.doctor.toLowerCase().includes(query) ||
          (appointment.notes || "").toLowerCase().includes(query);

        const status = getAppointmentStatus(appointment);
        const matchesFilter = filterStatus === "all" || status === filterStatus;

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => toTimestamp(a.date, a.time) - toTimestamp(b.date, b.time));
  }, [appointments, filterStatus, searchText]);

  const todayCount = useMemo(
    () => appointments.filter((appointment) => getAppointmentStatus(appointment) === "today").length,
    [appointments]
  );

  const upcomingCount = useMemo(
    () => appointments.filter((appointment) => getAppointmentStatus(appointment) === "upcoming").length,
    [appointments]
  );

  const pastCount = useMemo(
    () => appointments.filter((appointment) => getAppointmentStatus(appointment) === "past").length,
    [appointments]
  );

  const nextAppointment = useMemo(() => {
    const candidates = appointments
      .filter((appointment) => getAppointmentStatus(appointment) !== "past")
      .sort((a, b) => toTimestamp(a.date, a.time) - toTimestamp(b.date, b.time));

    return candidates[0];
  }, [appointments]);

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      <AppSidebar active="appointments" />

      <main className="flex-1 p-6 overflow-y-auto">
        <section className="rounded-3xl bg-gradient-to-r from-cyan-700 via-blue-700 to-indigo-700 p-8 text-white shadow-lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-100">
                Care Scheduler
              </p>
              <h1 className="mt-2 text-3xl font-bold">Appointments Hub</h1>
              <p className="mt-2 max-w-2xl text-sm text-cyan-50">
                Book new consultations, track upcoming visits, and keep your care
                schedule organized in one place.
              </p>
            </div>

            <div className="rounded-2xl bg-white px-4 py-3 text-indigo-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                Next Appointment
              </p>
              <p className="mt-1 text-sm font-bold">
                {nextAppointment
                  ? `${nextAppointment.doctor} | ${formatDate(nextAppointment.date)} ${formatTime(nextAppointment.time)}`
                  : "No upcoming appointments"}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Today</p>
            <p className="mt-2 text-3xl font-bold text-cyan-700">{todayCount}</p>
          </article>
          <article className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Upcoming</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{upcomingCount}</p>
          </article>
          <article className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="mt-2 text-3xl font-bold text-slate-700">{pastCount}</p>
          </article>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
          <article className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Add Appointment</h2>
            <p className="mt-1 text-sm text-slate-500">
              Schedule your next doctor consultation.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={16} />
                <input
                  type="text"
                  name="doctor"
                  placeholder="Doctor name"
                  value={form.doctor}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none transition focus:border-cyan-400 focus:bg-white"
                  required
                />
              </div>

              <div className="relative">
                <Stethoscope className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={16} />
                <input
                  type="text"
                  name="doctorId"
                  placeholder="Doctor ID"
                  value={form.doctorId}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none transition focus:border-cyan-400 focus:bg-white"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={16} />
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none transition focus:border-cyan-400 focus:bg-white"
                    required
                  />
                </div>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={16} />
                  <input
                    type="time"
                    name="time"
                    value={form.time}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none transition focus:border-cyan-400 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <textarea
                name="notes"
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
              />

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300"
              >
                <Plus size={16} />
                {submitting ? "Saving..." : "Add Appointment"}
              </button>
            </form>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-bold text-slate-900">Your Schedule</h2>

              <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 md:w-80">
                <Search size={16} className="text-slate-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search doctor or notes"
                  className="ml-3 w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(["all", "today", "upcoming", "past"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    filterStatus === status
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <button
                type="button"
                disabled={deleting || selectedIds.length === 0}
                onClick={handleDeleteSelected}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
              >
                <Trash2 size={14} />
                {deleting ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {loading && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Loading appointments...
                </div>
              )}

              {!loading && filteredAppointments.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  No appointments match your search.
                </div>
              )}

              {!loading &&
                filteredAppointments.map((appointment) => {
                  const status = getAppointmentStatus(appointment);

                  return (
                    <div
                      key={appointment._id || `${appointment.doctor}-${appointment.date}-${appointment.time}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-900">
                            {appointment.doctor}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-600">
                            <Stethoscope size={14} />
                            ID: {appointment.doctorId || "Not set"} | Consultation
                          </p>
                          {appointment.isDoctorAppointment && (
                            <p className="mt-2 inline-flex rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                              Added by doctor
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {appointment._id && (
                            <button
                              type="button"
                              onClick={() => toggleSelect(appointment._id as string)}
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
                                selectedIds.includes(appointment._id)
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
                              }`}
                            >
                              <CheckSquare size={12} />
                              {selectedIds.includes(appointment._id) ? "Selected" : "Select"}
                            </button>
                          )}

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}
                          >
                            {status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 border border-slate-200">
                          <CalendarDays size={12} />
                          {formatDate(appointment.date)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 border border-slate-200">
                          <Clock3 size={12} />
                          {formatTime(appointment.time)}
                        </span>
                      </div>

                      {appointment.notes && (
                        <p className="mt-3 text-sm text-slate-600">{appointment.notes}</p>
                      )}
                    </div>
                  );
                })}
            </div>
          </article>
        </section>

        <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-800">
          <p className="text-sm">{notice}</p>
        </div>
      </main>
    </div>
  );
};

export default Appointments;
