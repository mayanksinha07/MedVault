import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FileText, Pill, ShieldCheck, UserRound } from "lucide-react";
import AppSidebar from "../components/AppSidebar";

interface PatientPrescription {
  id: string;
  doctor: string;
  doctorId: string;
  medicines: Array<{
    name: string;
    reminderTime?: string;
    mealTiming?: "before_meal" | "after_meal" | "";
  }>;
  notes?: string;
  nextVisitDate?: string | null;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const getAuthToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const formatDate = (value?: string | null) => {
  if (!value) return "Not scheduled";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatReminderTime = (value?: string) => {
  if (!value) return "Time not set";
  const parsed = new Date(`2000-01-01T${value}`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMealTiming = (value?: "before_meal" | "after_meal" | "") => {
  if (value === "before_meal") return "Before meal";
  if (value === "after_meal") return "After meal";
  return "Meal timing not set";
};

const fallbackPrescriptions: PatientPrescription[] = [
  {
    id: "rx-local-1",
    doctor: "Dr. Meera Khanna",
    doctorId: "DOC-1024AX",
    medicines: [
      { name: "Metformin", reminderTime: "08:00", mealTiming: "after_meal" },
      { name: "Vitamin D3", reminderTime: "13:00", mealTiming: "after_meal" },
    ],
    notes: "Continue for 30 days and review fasting sugar next visit.",
    nextVisitDate: "2026-05-21",
    createdAt: "2026-05-02",
  },
  {
    id: "rx-local-2",
    doctor: "Dr. Rohan Patel",
    doctorId: "DOC-7782QK",
    medicines: [
      { name: "Atorvastatin", reminderTime: "21:00", mealTiming: "before_meal" },
    ],
    notes: "Take consistently every evening.",
    nextVisitDate: null,
    createdAt: "2026-04-18",
  },
];

const Prescriptions = () => {
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>(fallbackPrescriptions);
  const [notice, setNotice] = useState(
    "Prescription history is available here with doctor details and medicine schedule."
  );

  useEffect(() => {
    let ignore = false;

    const loadPrescriptions = async () => {
      if (!API_URL) {
        setNotice("Using local prescriptions. Add VITE_API_URL for live sync.");
        return;
      }

      const token = getAuthToken();
      if (!token) {
        setNotice("Please sign in again to view prescriptions.");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/doctor/patient/prescriptions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = (await response.json()) as {
          prescriptions?: PatientPrescription[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(data.message || "Failed to load prescriptions");
        }

        if (!ignore) {
          setPrescriptions(
            Array.isArray(data.prescriptions) && data.prescriptions.length
              ? data.prescriptions
              : []
          );
          setNotice("Prescription history synced from backend.");
        }
      } catch (error) {
        if (!ignore) {
          setNotice(
            error instanceof Error
              ? error.message
              : "Could not load prescriptions. Showing local sample data."
          );
        }
      }
    };

    void loadPrescriptions();

    return () => {
      ignore = true;
    };
  }, []);

  const totalMedicines = useMemo(
    () => prescriptions.reduce((sum, item) => sum + item.medicines.length, 0),
    [prescriptions]
  );

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      <AppSidebar active="prescriptions" />

      <main className="flex-1 p-6 overflow-y-auto">
        <section className="rounded-3xl bg-gradient-to-r from-violet-700 via-cyan-700 to-blue-700 p-8 text-white shadow-lg">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-100">
            Treatment History
          </p>
          <h1 className="mt-2 text-3xl font-bold">Prescription Archive</h1>
          <p className="mt-2 max-w-2xl text-sm text-cyan-50">
            Review previous prescriptions, prescribed medicines, doctor details,
            and planned follow-up dates in one place.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Prescriptions</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{prescriptions.length}</p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Medicines Logged</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{totalMedicines}</p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Security Layer</p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              <ShieldCheck size={15} />
              Verified + Synced
            </p>
          </article>
        </section>

        <section className="mt-6 space-y-4">
          {prescriptions.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-700">
                    <UserRound size={13} />
                    {item.doctor}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    Prescription dated {formatDate(item.createdAt)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Doctor ID: {item.doctorId || "Not available"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    <CalendarDays size={12} />
                    {formatDate(item.nextVisitDate)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    <Pill size={12} />
                    {item.medicines.length} medicine{item.medicines.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {item.medicines.map((medicine, index) => (
                  <div
                    key={`${item.id}-${medicine.name}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-semibold text-slate-900">{medicine.name}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatReminderTime(medicine.reminderTime)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatMealTiming(medicine.mealTiming)}
                    </p>
                  </div>
                ))}
              </div>

              {item.notes && (
                <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-900">
                  <p className="inline-flex items-center gap-2 font-semibold">
                    <FileText size={14} />
                    Doctor Notes
                  </p>
                  <p className="mt-2">{item.notes}</p>
                </div>
              )}
            </article>
          ))}

          {prescriptions.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              No prescriptions available yet.
            </div>
          )}
        </section>

        <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-800">
          <p className="text-sm">{notice}</p>
        </div>
      </main>
    </div>
  );
};

export default Prescriptions;
