import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CalendarDays,
  CircleAlert,
  Clock3,
  Download,
  Eye,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  Save,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import DoctorSidebar from "./components/DoctorSidebar";
import {
  useDoctorPatientSession,
  type DoctorSessionAppointment,
  type DoctorSessionPrescription,
  type DoctorSessionRecord,
} from "./doctor-session/DoctorPatientSessionContext";
import { resolveRecordFileUrl } from "./utils/recordFileUrl";

type DoctorTab = "patients" | "prescriptions" | "appointments" | "profile";

interface DoctorProfile {
  doctorId?: string;
  name?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  clinicName?: string;
  availability?: string;
}

interface PatientItem {
  patientId: string;
  patientMongoId?: string;
  name: string;
  email: string;
  phone: string;
  records?: Array<DoctorSessionRecord>;
}

interface MedicineFormItem {
  name: string;
  reminderTime: string;
  mealTiming: "before_meal" | "after_meal" | "";
}

interface PermissionItem {
  id: string;
  patient_id: string;
  status: "pending" | "approved" | "revoked";
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const DOCTOR_TOKEN_KEY = "doctor_token";

const getToken = () => localStorage.getItem(DOCTOR_TOKEN_KEY) || "";
const headers = () => ({ Authorization: `Bearer ${getToken()}` });
const blankMedicine = (): MedicineFormItem => ({ name: "", reminderTime: "", mealTiming: "" });

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Not available";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Not scheduled";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const mealTimingLabel = (value?: "before_meal" | "after_meal" | "") => {
  if (value === "before_meal") return "Before meal";
  if (value === "after_meal") return "After meal";
  return "Meal timing not set";
};

const DoctorDashboard = () => {
  const [activeTab, setActiveTab] = useState<DoctorTab>("patients");
  const [doctor, setDoctor] = useState<DoctorProfile>({});
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [notice, setNotice] = useState("Loading doctor portal...");
  const [busy, setBusy] = useState(false);
  const [requestPatientId, setRequestPatientId] = useState("");
  const [appointmentForm, setAppointmentForm] = useState({
    visitDate: "",
    notes: "",
  });
  const [prescriptionForm, setPrescriptionForm] = useState({
    medicines: [blankMedicine()],
    notes: "",
    nextVisitDate: "",
  });
  const [editingPrescriptionId, setEditingPrescriptionId] = useState("");
  const [profileForm, setProfileForm] = useState({
    phone: "",
    specialization: "",
    clinicName: "",
    availability: "",
  });
  const {
    activePatient,
    patientRecords,
    patientPrescriptions,
    patientAppointments,
    sessionStatus,
    sessionError,
    startSession,
    refreshSession,
    endSession,
  } = useDoctorPatientSession();

  const loadGeneralData = async (search = "") => {
    if (!API_URL) {
      setNotice("VITE_API_URL is missing.");
      return;
    }
    if (!getToken()) {
      window.location.assign("/doctor/auth");
      return;
    }
    try {
      const suffix = search ? `?search=${encodeURIComponent(search)}` : "";
      const [profileRes, patientsRes, accessRes] = await Promise.all([
        fetch(`${API_URL}/doctor/profile`, { headers: headers() }),
        fetch(`${API_URL}/doctor/patients${suffix}`, { headers: headers() }),
        fetch(`${API_URL}/doctor/access`, { headers: headers() }),
      ]);

      const profileData = (await profileRes.json()) as { doctor?: DoctorProfile; message?: string };
      if (!profileRes.ok) {
        throw new Error(profileData.message || "Could not load profile.");
      }
      const patientsData = patientsRes.ok
        ? ((await patientsRes.json()) as { patients: PatientItem[] })
        : { patients: [] };
      const accessData = accessRes.ok
        ? ((await accessRes.json()) as { permissions: PermissionItem[] })
        : { permissions: [] };

      const nextDoctor = profileData.doctor || {};
      setDoctor(nextDoctor);

      const doctorIdForShare = nextDoctor.doctorId || "";
      let linkedPatients: PatientItem[] = patientsData.patients || [];
      if (doctorIdForShare) {
        try {
          const byDoctorIdRes = await fetch(
            `${API_URL}/doctor/${encodeURIComponent(doctorIdForShare)}/patients`,
            { headers: headers() }
          );
          if (byDoctorIdRes.ok) {
            const byDoctorIdData = (await byDoctorIdRes.json()) as {
              patients?: PatientItem[];
            };
            if (Array.isArray(byDoctorIdData.patients) && byDoctorIdData.patients.length) {
              linkedPatients = byDoctorIdData.patients;
            }
          }
        } catch {
          // keep base list
        }
      }

      setPatients(linkedPatients);
      setPermissions(accessData.permissions || []);
      setProfileForm({
        phone: profileData.doctor?.phone || "",
        specialization: profileData.doctor?.specialization || "",
        clinicName: profileData.doctor?.clinicName || "",
        availability: profileData.doctor?.availability || "",
      });
      setNotice("Doctor portal synced.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Doctor sync failed.");
    }
  };

  useEffect(() => {
    void loadGeneralData();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadGeneralData(patientSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [patientSearch]);

  useEffect(() => {
    setAppointmentForm({ visitDate: "", notes: "" });
    setPrescriptionForm({ medicines: [blankMedicine()], notes: "", nextVisitDate: "" });
    setEditingPrescriptionId("");
    if (activePatient?.patientId) {
      setNotice(`Active session started for ${activePatient.name}.`);
    }
  }, [activePatient?.patientId]);

  useEffect(() => {
    if (sessionStatus === "error" && sessionError) {
      setNotice(sessionError);
    }
  }, [sessionError, sessionStatus]);

  const linkedCount = useMemo(
    () => permissions.filter((item) => item.status === "approved").length,
    [permissions]
  );

  const filteredPatients = useMemo(() => patients, [patients]);

  const requestAccess = async (event: FormEvent) => {
    event.preventDefault();
    if (!API_URL || !requestPatientId.trim()) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/doctor/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({ patientId: requestPatientId.trim() }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || "Request failed");
      setRequestPatientId("");
      setNotice(data.message || "Access request sent.");
      await loadGeneralData(patientSearch.trim());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const addAppointment = async (event: FormEvent) => {
    event.preventDefault();
    if (!API_URL || !activePatient?.patientId) {
      setNotice("Start a patient session before scheduling appointments.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/doctor/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({
          patientId: activePatient.patientId,
          visitDate: appointmentForm.visitDate,
          notes: appointmentForm.notes,
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || "Add appointment failed");
      setAppointmentForm({ visitDate: "", notes: "" });
      setNotice("Appointment synced to patient portal.");
      await Promise.all([loadGeneralData(patientSearch.trim()), refreshSession()]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Add appointment failed");
    } finally {
      setBusy(false);
    }
  };

  const addPrescription = async (event: FormEvent) => {
    event.preventDefault();
    if (!API_URL || !activePatient?.patientId) {
      setNotice("Start a patient session before saving prescriptions.");
      return;
    }

    const medicines = prescriptionForm.medicines
      .map((item) => ({
        name: item.name.trim(),
        reminderTime: item.reminderTime || "",
        mealTiming: item.mealTiming || "",
      }))
      .filter((item) => item.name);

    if (!medicines.length) {
      setNotice("Please add medicines.");
      return;
    }

    setBusy(true);
    try {
      const isEditing = Boolean(editingPrescriptionId);
      const response = await fetch(
        isEditing
          ? `${API_URL}/doctor/prescriptions/${editingPrescriptionId}`
          : `${API_URL}/doctor/add-prescription`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", ...headers() },
          body: JSON.stringify({
            patientId: activePatient.patientId,
            medicines,
            notes: prescriptionForm.notes,
            nextVisitDate: prescriptionForm.nextVisitDate || null,
          }),
        }
      );
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message || (isEditing ? "Update prescription failed" : "Add prescription failed"));
      }

      setPrescriptionForm({ medicines: [blankMedicine()], notes: "", nextVisitDate: "" });
      setEditingPrescriptionId("");
      setNotice(isEditing ? "Prescription updated." : "Prescription synced to patient portal.");
      await Promise.all([loadGeneralData(patientSearch.trim()), refreshSession()]);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : editingPrescriptionId
            ? "Update prescription failed"
            : "Add prescription failed"
      );
    } finally {
      setBusy(false);
    }
  };

  const startEditPrescription = (item: DoctorSessionPrescription) => {
    setEditingPrescriptionId(item.id);
    setPrescriptionForm({
      medicines: item.medicines.length
        ? item.medicines.map((medicine) => ({
            name: medicine.name || "",
            reminderTime: medicine.reminderTime || "",
            mealTiming: medicine.mealTiming || "",
          }))
        : [blankMedicine()],
      notes: item.notes || "",
      nextVisitDate: item.nextVisitDate ? String(item.nextVisitDate).slice(0, 10) : "",
    });
    setActiveTab("prescriptions");
    setNotice(`Editing prescription for ${activePatient?.name || item.patientId}.`);
  };

  const cancelEditPrescription = () => {
    setEditingPrescriptionId("");
    setPrescriptionForm({ medicines: [blankMedicine()], notes: "", nextVisitDate: "" });
    setNotice("Prescription edit cancelled.");
  };

  const addMedicineField = () => {
    setPrescriptionForm((current) => ({
      ...current,
      medicines: [...current.medicines, blankMedicine()],
    }));
  };

  const updateMedicineField = (
    index: number,
    field: "name" | "reminderTime" | "mealTiming",
    value: string
  ) => {
    setPrescriptionForm((current) => ({
      ...current,
      medicines: current.medicines.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeMedicineField = (index: number) => {
    setPrescriptionForm((current) => ({
      ...current,
      medicines:
        current.medicines.length === 1
          ? [blankMedicine()]
          : current.medicines.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const deletePrescription = async (id: string) => {
    if (!API_URL) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/doctor/prescriptions/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || "Delete prescription failed");
      if (editingPrescriptionId === id) {
        cancelEditPrescription();
      }
      setNotice(data.message || "Prescription deleted.");
      await Promise.all([loadGeneralData(patientSearch.trim()), refreshSession()]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Delete prescription failed");
    } finally {
      setBusy(false);
    }
  };

  const revokeAccess = async (id: string) => {
    if (!API_URL) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/doctor/access/${id}/revoke`, {
        method: "PATCH",
        headers: headers(),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || "Revoke failed");
      setNotice(data.message || "Access revoked");
      await loadGeneralData(patientSearch.trim());
      if (activePatient) {
        await refreshSession();
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Revoke failed");
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!API_URL) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/doctor/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify(profileForm),
      });
      const data = (await response.json()) as { doctor?: DoctorProfile; message?: string };
      if (!response.ok) throw new Error(data.message || "Profile update failed");
      setDoctor(data.doctor || doctor);
      setNotice("Profile updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Profile update failed");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(DOCTOR_TOKEN_KEY);
    localStorage.removeItem("doctor_profile");
    window.location.assign("/doctor/auth");
  };

  const openRecord = (fileUrl: string) => {
    if (!API_URL) return;
    const resolved = resolveRecordFileUrl(API_URL, fileUrl);
    if (!resolved) {
      setNotice("Could not resolve shared record URL.");
      return;
    }
    window.open(resolved, "_blank", "noopener,noreferrer");
  };

  const downloadRecord = async (fileUrl: string, fileName: string) => {
    if (!API_URL) return;
    const resolved = resolveRecordFileUrl(API_URL, fileUrl);
    if (!resolved) {
      setNotice("Could not resolve shared record URL.");
      return;
    }

    try {
      const response = await fetch(resolved, { headers: headers() });
      if (!response.ok) {
        throw new Error("Could not download shared record.");
      }
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName || "shared-record";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      setNotice(`Downloaded ${fileName}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not download shared record.");
    }
  };

  const handleStartPatientSession = async (patientId: string) => {
    await startSession(patientId);
  };

  const renderSessionBanner = () => {
    if (sessionStatus === "loading") {
      return (
        <section className="mt-6 rounded-3xl border border-cyan-100 bg-white p-6 shadow-sm">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">
            <LoaderCircle size={16} className="animate-spin" />
            Starting patient session...
          </p>
        </section>
      );
    }

    if (!activePatient) {
      return (
        <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-slate-600 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">No active patient session</p>
          <p className="mt-2 text-sm">
            Start a patient session from the sidebar or patient list. After that,
            prescriptions, appointments, reports, and patient details will stay in sync automatically.
          </p>
          {sessionError && (
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-rose-600">
              <CircleAlert size={15} />
              {sessionError}
            </p>
          )}
        </section>
      );
    }

    return (
      <section className="mt-6 rounded-3xl border border-cyan-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Active Patient Session
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{activePatient.name}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {activePatient.patientId} | {activePatient.email || "Email unavailable"} |{" "}
              {activePatient.phone || "Phone unavailable"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Age: {activePatient.age ?? "Unavailable"} | Records:{" "}
              {activePatient.recordCount ?? patientRecords.length} | Appointments:{" "}
              {activePatient.appointmentCount ?? patientAppointments.length}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("patients")}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Open Patient Workspace
            </button>
            <button
              type="button"
              onClick={() => {
                endSession();
                setActiveTab("patients");
                setNotice("Patient session ended. Start a new session safely.");
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white"
            >
              <Power size={14} />
              End Session
            </button>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      <DoctorSidebar
        active={activeTab}
        doctorName={doctor.name || "Doctor"}
        doctorId={doctor.doctorId || "DOC-XXXXXX"}
        onTabChange={setActiveTab}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <section className="rounded-3xl bg-gradient-to-r from-cyan-700 via-blue-700 to-indigo-700 p-8 text-white shadow-lg">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-100">Doctor Workspace</p>
          <h1 className="mt-2 text-3xl font-bold">Clinical Command Dashboard</h1>
          <p className="mt-2 text-sm text-cyan-50">
            Start one patient session and continue safely across prescriptions, appointments, reports, and profile workflows.
          </p>
        </section>

        {renderSessionBanner()}

        {activeTab === "patients" && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_2fr]">
            <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Request Access</h2>
              <form onSubmit={requestAccess} className="mt-4 space-y-3">
                <input
                  value={requestPatientId}
                  onChange={(event) => setRequestPatientId(event.target.value)}
                  required
                  placeholder="Patient ID"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                />
                <button
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white"
                >
                  <Plus size={16} />
                  Request
                </button>
              </form>
              <div className="mt-4 rounded-2xl bg-cyan-50 p-4 text-cyan-800">
                Approved links: <span className="font-bold">{linkedCount}</span>
              </div>

              {activePatient && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Patient Snapshot</p>
                  <p className="mt-2 font-semibold text-slate-900">{activePatient.name}</p>
                  <p className="text-sm text-slate-600">{activePatient.patientId}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Joined: {formatDate(activePatient.joinedAt)}
                  </p>
                  <p className="text-sm text-slate-500">
                    Records ready: {activePatient.recordCount ?? patientRecords.length}
                  </p>
                </div>
              )}
            </article>

            <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Search size={16} className="text-slate-400" />
                <input
                  value={patientSearch}
                  onChange={(event) => setPatientSearch(event.target.value)}
                  placeholder="Search patient"
                  className="ml-3 w-full bg-transparent text-sm outline-none"
                />
              </div>

              <div className="mt-4 space-y-3">
                {filteredPatients.map((patient) => {
                  const permission = permissions.find(
                    (p) =>
                      p.patient_id === (patient.patientMongoId || patient.patientId) ||
                      p.patient_id === patient.patientId
                  );
                  const isActive = activePatient?.patientId === patient.patientId;

                  return (
                    <div
                      key={patient.patientId}
                      className={`rounded-2xl border p-4 ${
                        isActive
                          ? "border-cyan-300 bg-cyan-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{patient.name}</p>
                          <p className="text-sm text-slate-600">
                            {patient.patientId} | {patient.email}
                          </p>
                          <p className="text-xs text-slate-500">
                            Shared records: {patient.records?.length || 0}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleStartPatientSession(patient.patientId)}
                            className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                              isActive
                                ? "bg-cyan-600 text-white"
                                : "bg-slate-900 text-white"
                            }`}
                          >
                            {isActive ? "Session Active" : "Start Session"}
                          </button>
                          {permission?.status === "approved" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => revokeAccess(permission.id)}
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
                            >
                              <Trash2 size={12} />
                              Revoke Access
                            </button>
                          )}
                        </div>
                      </div>

                      {isActive && patientRecords.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {patientRecords.slice(0, 4).map((record: DoctorSessionRecord) => (
                            <div
                              key={record._id}
                              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600"
                            >
                              <span className="max-w-[220px] truncate">{record.fileName}</span>
                              <button
                                type="button"
                                onClick={() => openRecord(record.fileUrl)}
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-slate-700"
                              >
                                <Eye size={12} />
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadRecord(record.fileUrl, record.fileName)}
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-slate-700"
                              >
                                <Download size={12} />
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {!filteredPatients.length && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No patients found for this filter.
                  </div>
                )}
              </div>
            </article>
          </section>
        )}

        {activeTab === "appointments" && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_2fr]">
            <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Add Appointment</h2>
              <p className="mt-2 text-sm text-slate-500">
                {activePatient
                  ? `Scheduling for ${activePatient.name} (${activePatient.patientId})`
                  : "Start a patient session to create appointments."}
              </p>
              <form onSubmit={addAppointment} className="mt-4 space-y-3">
                <input
                  disabled
                  value={activePatient?.patientId || ""}
                  placeholder="Patient ID from active session"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 outline-none"
                />
                <input
                  type="datetime-local"
                  required
                  disabled={!activePatient}
                  value={appointmentForm.visitDate}
                  onChange={(e) => setAppointmentForm((c) => ({ ...c, visitDate: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none disabled:bg-slate-100"
                />
                <textarea
                  rows={3}
                  disabled={!activePatient}
                  value={appointmentForm.notes}
                  onChange={(e) => setAppointmentForm((c) => ({ ...c, notes: e.target.value }))}
                  placeholder="Notes"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none disabled:bg-slate-100"
                />
                <button
                  disabled={busy || !activePatient}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white disabled:bg-cyan-300"
                >
                  <CalendarDays size={16} />
                  Add
                </button>
              </form>
            </article>
            <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Appointment List</h2>
              <div className="mt-4 space-y-3">
                {patientAppointments.map((item: DoctorSessionAppointment) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold">{activePatient?.name || "Patient"}</p>
                    <p className="text-sm text-slate-600">
                      {formatDateTime(item.visit_date)} | {item.status}
                    </p>
                    {item.notes && <p className="text-sm text-slate-600">{item.notes}</p>}
                  </div>
                ))}
                {!patientAppointments.length && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    {activePatient
                      ? "No appointments found for the active patient."
                      : "Start a patient session to view appointments."}
                  </div>
                )}
              </div>
            </article>
          </section>
        )}

        {activeTab === "prescriptions" && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_2fr]">
            <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                {editingPrescriptionId ? "Edit Prescription" : "Add Prescription"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {activePatient
                  ? `Writing medication plan for ${activePatient.name} (${activePatient.patientId})`
                  : "Start a patient session to add prescriptions."}
              </p>
              <form onSubmit={addPrescription} className="mt-4 space-y-3">
                <input
                  disabled
                  value={activePatient?.patientId || ""}
                  placeholder="Patient ID from active session"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 outline-none"
                />
                <div className="space-y-3">
                  {prescriptionForm.medicines.map((medicine, index) => (
                    <div key={`medicine-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="space-y-3">
                        <input
                          type="text"
                          autoComplete="off"
                          required
                          disabled={!activePatient}
                          value={medicine.name}
                          onChange={(e) => updateMedicineField(index, "name", e.target.value)}
                          placeholder={`Medicine ${index + 1}`}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none disabled:bg-slate-100"
                        />
                        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                          <div className="relative">
                            <Clock3 size={15} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
                            <input
                              type="time"
                              disabled={!activePatient}
                              value={medicine.reminderTime}
                              onChange={(e) => updateMedicineField(index, "reminderTime", e.target.value)}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 outline-none disabled:bg-slate-100"
                            />
                          </div>
                          <select
                            disabled={!activePatient}
                            value={medicine.mealTiming}
                            onChange={(e) => updateMedicineField(index, "mealTiming", e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none disabled:bg-slate-100"
                          >
                            <option value="">Meal timing</option>
                            <option value="before_meal">Before meal</option>
                            <option value="after_meal">After meal</option>
                          </select>
                          <button
                            type="button"
                            disabled={!activePatient}
                            onClick={() => removeMedicineField(index)}
                            className="inline-flex items-center justify-center rounded-2xl bg-rose-50 px-4 py-3 text-rose-700 disabled:opacity-40"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={!activePatient}
                    onClick={addMedicineField}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 disabled:opacity-40"
                  >
                    <Plus size={15} />
                    Add Medicine Reminder
                  </button>
                </div>
                <textarea
                  rows={3}
                  disabled={!activePatient}
                  value={prescriptionForm.notes}
                  onChange={(e) => setPrescriptionForm((c) => ({ ...c, notes: e.target.value }))}
                  placeholder="Instructions"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none disabled:bg-slate-100"
                />
                <input
                  type="date"
                  disabled={!activePatient}
                  value={prescriptionForm.nextVisitDate}
                  onChange={(e) => setPrescriptionForm((c) => ({ ...c, nextVisitDate: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none disabled:bg-slate-100"
                />
                <button
                  disabled={busy || !activePatient}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white disabled:bg-cyan-300"
                >
                  <FileText size={16} />
                  {editingPrescriptionId ? "Update" : "Save"}
                </button>
                {editingPrescriptionId && (
                  <button
                    type="button"
                    onClick={cancelEditPrescription}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700"
                  >
                    Cancel Edit
                  </button>
                )}
              </form>
            </article>
            <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Prescription Log</h2>
              <div className="mt-4 space-y-3">
                {patientPrescriptions.map((item: DoctorSessionPrescription) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold">Patient: {activePatient?.name || item.patientId}</p>
                    <div className="mt-2 space-y-2">
                      {item.medicines.map((medicine, index) => (
                        <div key={`${item.id}-${medicine.name}-${index}`} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                          <p className="font-medium text-slate-900">{medicine.name}</p>
                          <p className="text-xs text-slate-500">
                            {medicine.reminderTime || "Time not set"} | {mealTimingLabel(medicine.mealTiming)}
                          </p>
                        </div>
                      ))}
                    </div>
                    {item.notes && <p className="mt-3 text-sm text-slate-600">{item.notes}</p>}
                    {item.nextVisitDate && (
                      <p className="text-sm text-slate-500">
                        Next visit: {formatDate(item.nextVisitDate)}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEditPrescription(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => deletePrescription(item.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {!patientPrescriptions.length && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    {activePatient
                      ? "No prescriptions found for the active patient."
                      : "Start a patient session to view or add prescriptions."}
                  </div>
                )}
              </div>
            </article>
          </section>
        )}

        {activeTab === "profile" && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
            <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Doctor Profile</h2>
              <form onSubmit={saveProfile} className="mt-4 space-y-3">
                <input value={profileForm.phone} onChange={(e) => setProfileForm((c) => ({ ...c, phone: e.target.value }))} placeholder="Phone" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
                <input value={profileForm.specialization} onChange={(e) => setProfileForm((c) => ({ ...c, specialization: e.target.value }))} placeholder="Specialization" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
                <input value={profileForm.clinicName} onChange={(e) => setProfileForm((c) => ({ ...c, clinicName: e.target.value }))} placeholder="Clinic" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
                <input value={profileForm.availability} onChange={(e) => setProfileForm((c) => ({ ...c, availability: e.target.value }))} placeholder="Availability" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
                <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white">
                  <Save size={16} />
                  Save
                </button>
              </form>
            </article>
            <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Session Profile Snapshot</h2>
              {activePatient ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase text-slate-500">Patient</p>
                    <p className="font-semibold">{activePatient.name}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase text-slate-500">Patient ID</p>
                    <p className="font-semibold">{activePatient.patientId}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase text-slate-500">Email</p>
                    <p className="font-semibold">{activePatient.email || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase text-slate-500">Phone</p>
                    <p className="font-semibold">{activePatient.phone || "-"}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Start a patient session to see the current patient profile snapshot here.
                </div>
              )}
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
                <p className="inline-flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck size={14} />
                  Secure Session Active
                </p>
              </div>
              <button onClick={logout} className="mt-4 w-full rounded-2xl bg-rose-600 px-4 py-3 font-semibold text-white">
                Logout
              </button>
            </article>
          </section>
        )}

        <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800">
          {notice}
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;
