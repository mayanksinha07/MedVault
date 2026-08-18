import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";

export interface DoctorSessionRecord {
  _id: string;
  fileName: string;
  category: string;
  fileUrl: string;
  createdAt?: string;
}

export interface DoctorSessionPrescription {
  id: string;
  patientId: string;
  medicines: Array<{
    name: string;
    reminderTime?: string;
    mealTiming?: "before_meal" | "after_meal" | "";
  }>;
  notes: string;
  nextVisitDate: string | null;
  createdAt?: string;
}

export interface DoctorSessionAppointment {
  id: string;
  patient_id: string;
  visit_date: string;
  notes: string;
  status: string;
  created_at?: string;
}

export interface DoctorSessionPatient {
  patientId: string;
  patientMongoId: string;
  name: string;
  email: string;
  phone: string;
  joinedAt?: string;
  age?: number | null;
  appointmentCount?: number;
  recordCount?: number;
}

interface DoctorPatientSessionPayload {
  patient: DoctorSessionPatient;
  records: DoctorSessionRecord[];
  prescriptions: DoctorSessionPrescription[];
  appointments: DoctorSessionAppointment[];
}

interface DoctorPatientSessionContextValue {
  activePatient: DoctorSessionPatient | null;
  patientRecords: DoctorSessionRecord[];
  patientPrescriptions: DoctorSessionPrescription[];
  patientAppointments: DoctorSessionAppointment[];
  sessionStatus: "idle" | "loading" | "active" | "error";
  sessionError: string;
  startSession: (patientId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  endSession: () => void;
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const DOCTOR_TOKEN_KEY = "doctor_token";

const DoctorPatientSessionContext = createContext<DoctorPatientSessionContextValue | null>(
  null
);

const getToken = () => localStorage.getItem(DOCTOR_TOKEN_KEY) || "";

export const DoctorPatientSessionProvider = ({ children }: PropsWithChildren) => {
  const [activePatient, setActivePatient] = useState<DoctorSessionPatient | null>(null);
  const [patientRecords, setPatientRecords] = useState<DoctorSessionRecord[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<DoctorSessionPrescription[]>([]);
  const [patientAppointments, setPatientAppointments] = useState<DoctorSessionAppointment[]>([]);
  const [sessionStatus, setSessionStatus] = useState<"idle" | "loading" | "active" | "error">("idle");
  const [sessionError, setSessionError] = useState("");

  const applyPayload = (payload: DoctorPatientSessionPayload) => {
    setActivePatient(payload.patient);
    setPatientRecords(Array.isArray(payload.records) ? payload.records : []);
    setPatientPrescriptions(Array.isArray(payload.prescriptions) ? payload.prescriptions : []);
    setPatientAppointments(Array.isArray(payload.appointments) ? payload.appointments : []);
    setSessionStatus("active");
    setSessionError("");
  };

  const startSession = async (patientId: string) => {
    const normalizedPatientId = String(patientId || "").trim();
    if (!normalizedPatientId) {
      setSessionStatus("error");
      setSessionError("Enter a valid Patient ID to start a session.");
      return;
    }

    if (!API_URL) {
      setSessionStatus("error");
      setSessionError("VITE_API_URL is missing.");
      return;
    }

    const token = getToken();
    if (!token) {
      setSessionStatus("error");
      setSessionError("Doctor session expired. Please sign in again.");
      return;
    }

    setSessionStatus("loading");
    setSessionError("");

    try {
      const response = await fetch(
        `${API_URL}/doctor/patients/${encodeURIComponent(normalizedPatientId)}/session`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = (await response.json()) as DoctorPatientSessionPayload & {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(data.message || "Could not start patient session.");
      }

      applyPayload(data);
    } catch (error) {
      setActivePatient(null);
      setPatientRecords([]);
      setPatientPrescriptions([]);
      setPatientAppointments([]);
      setSessionStatus("error");
      setSessionError(
        error instanceof Error ? error.message : "Could not start patient session."
      );
    }
  };

  const refreshSession = async () => {
    if (!activePatient?.patientId) {
      return;
    }
    await startSession(activePatient.patientId);
  };

  const endSession = () => {
    setActivePatient(null);
    setPatientRecords([]);
    setPatientPrescriptions([]);
    setPatientAppointments([]);
    setSessionStatus("idle");
    setSessionError("");
  };

  return (
    <DoctorPatientSessionContext.Provider
      value={{
        activePatient,
        patientRecords,
        patientPrescriptions,
        patientAppointments,
        sessionStatus,
        sessionError,
        startSession,
        refreshSession,
        endSession,
      }}
    >
      {children}
    </DoctorPatientSessionContext.Provider>
  );
};

export const useDoctorPatientSession = () => {
  const context = useContext(DoctorPatientSessionContext);
  if (!context) {
    throw new Error("useDoctorPatientSession must be used within DoctorPatientSessionProvider");
  }
  return context;
};
