import { useState } from "react";
import { LoaderCircle, Play, Power, UserRound } from "lucide-react";
import { useDoctorPatientSession } from "../doctor-session/DoctorPatientSessionContext";

const formatAge = (value?: number | null) =>
  value === null || value === undefined ? "Age unavailable" : `${value} years`;

const DoctorPatientSessionPanel = () => {
  const [patientIdInput, setPatientIdInput] = useState("");
  const {
    activePatient,
    patientRecords,
    sessionStatus,
    sessionError,
    startSession,
    endSession,
  } = useDoctorPatientSession();

  const handleStart = async () => {
    await startSession(patientIdInput);
  };

  const handleEnd = () => {
    setPatientIdInput("");
    endSession();
  };

  return (
    <div className="mt-6 rounded-3xl border border-cyan-100 bg-cyan-50/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Active Patient Session
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Start once, then work across the doctor console without re-entering IDs.
          </p>
        </div>
        {activePatient && (
          <button
            type="button"
            onClick={handleEnd}
            className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
          >
            <Power size={13} />
            End Session
          </button>
        )}
      </div>

      {!activePatient && (
        <div className="mt-4 space-y-3">
          <input
            value={patientIdInput}
            onChange={(event) => setPatientIdInput(event.target.value)}
            placeholder="Enter Patient ID"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={sessionStatus === "loading"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white disabled:bg-cyan-300"
          >
            {sessionStatus === "loading" ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={15} />}
            {sessionStatus === "loading" ? "Starting Session..." : "Start Patient Session"}
          </button>
          {sessionStatus === "idle" && (
            <p className="text-xs text-slate-500">No active patient selected.</p>
          )}
          {sessionError && (
            <p className="text-xs font-medium text-rose-600">{sessionError}</p>
          )}
        </div>
      )}

      {activePatient && (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl bg-white p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              <UserRound size={15} className="text-cyan-600" />
              {activePatient.name}
            </p>
            <p className="mt-2 font-mono text-sm font-semibold text-slate-800">
              {activePatient.patientId}
            </p>
            <p className="mt-1 text-xs text-slate-500">{formatAge(activePatient.age)}</p>
            <p className="mt-1 text-xs text-slate-500">{activePatient.email || "Email unavailable"}</p>
            <p className="mt-1 text-xs text-slate-500">{activePatient.phone || "Phone unavailable"}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Records</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {activePatient.recordCount ?? patientRecords.length}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Appointments</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {activePatient.appointmentCount ?? 0}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPatientSessionPanel;
