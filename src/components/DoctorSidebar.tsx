import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import {
  CalendarDays,
  FileText,
  ShieldCheck,
  Stethoscope,
  UserCircle2,
  UsersRound,
} from "lucide-react";
import DoctorPatientSessionPanel from "./DoctorPatientSessionPanel";

type DoctorTab = "patients" | "prescriptions" | "appointments" | "profile";

interface DoctorSidebarProps {
  active: DoctorTab;
  doctorName?: string;
  doctorId?: string;
  onTabChange?: (tab: DoctorTab) => void;
}

interface Item {
  id: DoctorTab;
  label: string;
  icon: ReactNode;
}

const items: Item[] = [
  { id: "patients", label: "Patients", icon: <UsersRound size={17} /> },
  { id: "prescriptions", label: "Prescriptions", icon: <FileText size={17} /> },
  { id: "appointments", label: "Appointments", icon: <CalendarDays size={17} /> },
  { id: "profile", label: "Profile", icon: <UserCircle2 size={17} /> },
];

const DoctorSidebar = ({
  active,
  doctorName = "Doctor",
  doctorId = "DOC-XXXXXX",
  onTabChange,
}: DoctorSidebarProps) => {
  return (
    <aside className="w-72 shrink-0 bg-white/90 backdrop-blur border-r border-slate-200 p-6 flex flex-col justify-between shadow-[8px_0_30px_-25px_rgba(15,23,42,0.45)]">
      <div>
        <Link
          to="/doctor/dashboard"
          className="block rounded-2xl bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600 p-4 text-white shadow-md"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">MedVault</p>
          <p className="mt-1 text-xl font-bold">Doctor Console</p>
          <p className="mt-1 text-xs text-cyan-100">Clinical Operations Workspace</p>
        </Link>

        <nav className="mt-6 space-y-2">
          {items.map((item) => {
            const isActive = item.id === active;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange?.(item.id)}
                className={`group w-full flex items-center justify-between rounded-2xl px-3 py-2.5 transition ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="inline-flex items-center gap-3 text-sm font-semibold">
                  <span
                    className={`rounded-lg p-1.5 ${
                      isActive
                        ? "bg-white/15 text-white"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </span>
                <span className={`h-2 w-2 rounded-full ${isActive ? "bg-white" : "bg-transparent"}`} />
              </button>
            );
          })}
        </nav>

        <DoctorPatientSessionPanel />
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Logged In</p>
          <p className="mt-1 font-semibold text-slate-900">{doctorName}</p>
          <p className="text-sm text-slate-500">{doctorId}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck size={14} />
            Secure Access Active
          </p>
          <p className="mt-1 text-xs">Patient data access is audited continuously.</p>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-cyan-700">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <Stethoscope size={14} />
            Clinical Mode
          </p>
          <p className="mt-1 text-xs">Manage consultations, records, and follow-ups.</p>
        </div>
      </div>
    </aside>
  );
};

export default DoctorSidebar;
