import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import {
  BrainCircuit,
  CalendarCheck2,
  FolderHeart,
  LayoutDashboard,
  ShieldCheck,
  Share2,
  Stethoscope,
  UserCircle2,
} from "lucide-react";

type SidebarTab =
  | "dashboard"
  | "appointments"
  | "records"
  | "sharing"
  | "health_summary"
  | "profile";

interface AppSidebarProps {
  active: SidebarTab;
  patientName?: string;
}

interface SidebarItem {
  id: SidebarTab;
  label: string;
  to: string;
  icon: ReactNode;
}

const sidebarItems: SidebarItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    to: "/dashboard",
    icon: <LayoutDashboard size={17} />,
  },
  {
    id: "appointments",
    label: "Appointments",
    to: "/appointments",
    icon: <CalendarCheck2 size={17} />,
  },
  {
    id: "records",
    label: "Medical Records",
    to: "/medical_records",
    icon: <FolderHeart size={17} />,
  },
  {
    id: "sharing",
    label: "Sharing",
    to: "/sharing",
    icon: <Share2 size={17} />,
  },
  {
    id: "health_summary",
    label: "Health Summary",
    to: "/health_summary",
    icon: <BrainCircuit size={17} />,
  },
  {
    id: "profile",
    label: "My Profile",
    to: "/profile",
    icon: <UserCircle2 size={17} />,
  },
];

const AppSidebar = ({ active, patientName = "John Carter" }: AppSidebarProps) => {
  return (
    <aside className="w-72 shrink-0 bg-white/90 backdrop-blur border-r border-slate-200 p-6 flex flex-col justify-between shadow-[8px_0_30px_-25px_rgba(15,23,42,0.45)]">
      <div>
        <div className="rounded-2xl bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600 p-4 text-white shadow-md">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">
            MedVault
          </p>
          <p className="mt-1 text-xl font-bold">Patient Console</p>
          <p className="mt-1 text-xs text-cyan-100">
            Secure Health Operations
          </p>
        </div>

        <nav className="mt-6 space-y-2">
          {sidebarItems.map((item) => {
            const isActive = item.id === active;
            return (
              <Link
                key={item.id}
                to={item.to}
                className={`group flex items-center justify-between rounded-2xl px-3 py-2.5 transition ${
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
                <span
                  className={`h-2 w-2 rounded-full ${
                    isActive ? "bg-white" : "bg-transparent"
                  }`}
                />
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Logged In
          </p>
          <p className="mt-1 font-semibold text-slate-900">{patientName}</p>
          <p className="text-sm text-slate-500">Patient</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck size={14} />
            Encrypted Session Active
          </p>
          <p className="mt-1 text-xs">All data is protected and monitored.</p>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-cyan-700">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <Stethoscope size={14} />
            AI Care Assistant Ready
          </p>
          <p className="mt-1 text-xs">Ask personalized health questions anytime.</p>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
