import express from "express";

import authMiddleware from "../middlewares/auth.js";
import doctorAuth from "../middlewares/doctorAuth.js";
import generateToken from "../utils/generateToken.js";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import MedicalRecord from "../models/MedicalRecord.js";
import SharingSession from "../models/SharingSession.js";
import Appointment from "../models/Appointment.js";
import DoctorPatientAccess from "../models/DoctorPatientAccess.js";
import DoctorPrescription from "../models/DoctorPrescription.js";
import DoctorAppointment from "../models/DoctorAppointment.js";
import DoctorNotification from "../models/DoctorNotification.js";

const router = express.Router();

const resolvePatientByIdentifier = async (
  identifier,
  select = "_id patientId name email phone createdAt"
) => {
  const normalized = String(identifier || "").trim();
  if (!normalized) {
    return null;
  }

  return (
    (await User.findOne({ patientId: normalized }).select(select)) ||
    (await User.findById(normalized).select(select))
  );
};

const sanitizeDoctor = (doctor) => ({
  id: String(doctor._id),
  doctorId: doctor.doctorId || doctor.doctorUid,
  name: doctor.name,
  email: doctor.email,
  phone: doctor.phone,
  specialization: doctor.specialization,
  clinicName: doctor.clinicName,
  licenseNumber: doctor.licenseNumber,
  availability: doctor.availability || "",
  patients: Array.isArray(doctor.patients) ? doctor.patients : [],
});

const ensureMongoDoctorIdentifiers = async (doctor) => {
  let shouldSave = false;
  if (!doctor.doctorId) {
    let generated = "";
    for (let i = 0; i < 12; i += 1) {
      const candidate = `DOC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      // eslint-disable-next-line no-await-in-loop
      const existing = await Doctor.findOne({ doctorId: candidate }).select("_id");
      if (!existing || String(existing._id) === String(doctor._id)) {
        generated = candidate;
        break;
      }
    }
    doctor.doctorId = generated || `DOC-${Date.now().toString().slice(-6)}`;
    shouldSave = true;
  }
  if (!doctor.doctorUid) {
    doctor.doctorUid = doctor.doctorId;
    shouldSave = true;
  }
  if (!Array.isArray(doctor.patients)) {
    doctor.patients = [];
    shouldSave = true;
  }
  if (shouldSave) {
    await doctor.save({ validateBeforeSave: false });
  }
  return doctor;
};

const createNotification = async ({
  targetRole,
  doctorId = null,
  patientId = null,
  type,
  title,
  message,
}) =>
  DoctorNotification.create({
    targetRole,
    doctor: doctorId,
    patient: patientId,
    type,
    title,
    message,
  });

const hasApprovedDoctorAccess = async (doctorId, patientId) =>
  DoctorPatientAccess.findOne({
    doctor: doctorId,
    patient: patientId,
    status: "approved",
  });

const ensureApprovedDoctorAccess = async (doctor, patient) => {
  const existingAccess = await hasApprovedDoctorAccess(doctor._id, patient._id);
  if (existingAccess) {
    return existingAccess;
  }

  const canonicalDoctorId = doctor.doctorId || doctor.doctorUid;
  const patientPublicId = patient.patientId || "";

  const [sharingSession] = await Promise.all([
    SharingSession.findOne({
      user: patient._id,
      doctorId: canonicalDoctorId,
      revokedByUser: { $ne: true },
      status: { $in: ["active", "expiring"] },
    }).select("_id"),
  ]);

  const sharedWithDoctor =
    canonicalDoctorId &&
    Array.isArray(patient.sharedWith) &&
    patient.sharedWith.includes(canonicalDoctorId);
  const doctorHasPatient =
    patientPublicId &&
    Array.isArray(doctor.patients) &&
    doctor.patients.includes(patientPublicId);

  if (!sharingSession && !sharedWithDoctor && !doctorHasPatient) {
    return null;
  }

  return DoctorPatientAccess.findOneAndUpdate(
    { doctor: doctor._id, patient: patient._id },
    {
      $set: {
        status: "approved",
        requestedBy: "patient",
        approvedAt: new Date(),
        revokedAt: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const normalizeMedicineEntries = (medicines = []) =>
  (Array.isArray(medicines) ? medicines : [])
    .map((item) => {
      if (typeof item === "string") {
        return {
          name: item.trim(),
          reminderTime: "",
          mealTiming: "",
        };
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      return {
        name: String(item.name || "").trim(),
        reminderTime: String(item.reminderTime || "").trim(),
        mealTiming:
          item.mealTiming === "before_meal" || item.mealTiming === "after_meal"
            ? item.mealTiming
            : "",
      };
    })
    .filter((item) => item && item.name);

const toPrescriptionPayload = (item) => ({
  id: String(item._id),
  patientId: String(item.patient),
  medicines: normalizeMedicineEntries(item.medicines),
  notes: item.notes || "",
  nextVisitDate: item.nextVisitDate,
  createdAt: item.createdAt,
});

const toDoctorAppointmentPayload = (item) => ({
  id: String(item._id),
  patient_id: String(item.patient),
  visit_date: item.visitDate,
  notes: item.notes || "",
  status: item.status,
  created_at: item.createdAt,
});

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) {
    return null;
  }

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

const toPermissionPayload = async (accessDoc) => {
  await accessDoc.populate("doctor", "doctorId doctorUid");
  return {
    id: String(accessDoc._id),
    patient_id: String(accessDoc.patient),
    status: accessDoc.status,
    requested_by: accessDoc.requestedBy,
    created_at: accessDoc.createdAt,
    approved_at: accessDoc.approvedAt,
    revoked_at: accessDoc.revokedAt,
    doctor_uid: accessDoc.doctor?.doctorId || accessDoc.doctor?.doctorUid || "",
  };
};

router.post("/signup", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      specialization,
      clinicName,
      licenseNumber,
      password,
    } = req.body;

    if (
      !name ||
      !email ||
      !phone ||
      !specialization ||
      !clinicName ||
      !licenseNumber ||
      !password
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await Doctor.findOne({
      $or: [{ email: String(email).toLowerCase() }, { licenseNumber }],
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Doctor with this email/license already exists" });
    }

    const doctor = await Doctor.create({
      name,
      email: String(email).toLowerCase(),
      phone,
      specialization,
      clinicName,
      licenseNumber,
      password,
    });

    await ensureMongoDoctorIdentifiers(doctor);
    const token = generateToken(doctor._id, "doctor");
    return res.status(201).json({
      token,
      doctor: sanitizeDoctor(doctor),
      message: "Doctor account created successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const doctor = await Doctor.findOne({ email: String(email).toLowerCase() }).select(
      "+password"
    );
    if (!doctor) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const matches = await doctor.comparePassword(password);
    if (!matches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await ensureMongoDoctorIdentifiers(doctor);
    const token = generateToken(doctor._id, "doctor");
    return res.json({
      token,
      doctor: sanitizeDoctor(doctor),
      message: "Doctor login successful",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Login failed" });
  }
});

router.get("/profile", doctorAuth, async (req, res) => {
  await ensureMongoDoctorIdentifiers(req.doctor);
  return res.json({ doctor: sanitizeDoctor(req.doctor) });
});

router.put("/profile", doctorAuth, async (req, res) => {
  try {
    const { specialization, clinicName, availability, phone } = req.body;
    req.doctor.specialization = specialization ?? req.doctor.specialization;
    req.doctor.clinicName = clinicName ?? req.doctor.clinicName;
    req.doctor.availability = availability ?? req.doctor.availability;
    req.doctor.phone = phone ?? req.doctor.phone;
    await req.doctor.save();
    return res.json({ doctor: sanitizeDoctor(req.doctor) });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Update failed" });
  }
});

router.post("/request-access", doctorAuth, async (req, res) => {
  try {
    const { patientId } = req.body;
    if (!patientId) {
      return res.status(400).json({ message: "patientId is required" });
    }

    const patient = await resolvePatientByIdentifier(patientId, "_id patientId name email");
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const access = await DoctorPatientAccess.findOneAndUpdate(
      { doctor: req.doctor._id, patient: patient._id },
      {
        $set: {
          status: "pending",
          requestedBy: "doctor",
          approvedAt: null,
          revokedAt: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await createNotification({
      targetRole: "patient",
      doctorId: req.doctor._id,
      patientId: patient._id,
      type: "doctor_request_access",
      title: "Doctor access request",
      message: `${req.doctor.name} (${req.doctor.doctorId}) requested access to your records.`,
    });

    return res.status(201).json({
      request: {
        id: String(access._id),
        status: access.status,
        requested_by: access.requestedBy,
        created_at: access.createdAt,
      },
      message: "Access request sent to patient",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Request failed" });
  }
});

router.post("/grant-access", authMiddleware, async (req, res) => {
  try {
    const { doctorId } = req.body;
    if (!doctorId) {
      return res.status(400).json({ message: "doctorId is required" });
    }

    const doctor = await Doctor.findOne({
      $or: [{ doctorId }, { doctorUid: doctorId }],
    }).select("_id name doctorId doctorUid patients");
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const access = await DoctorPatientAccess.findOneAndUpdate(
      { doctor: doctor._id, patient: req.user._id },
      {
        $set: {
          status: "approved",
          requestedBy: "patient",
          approvedAt: new Date(),
          revokedAt: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { sharedWith: doctor.doctorId || doctor.doctorUid } }
    );
    await Doctor.updateOne(
      { _id: doctor._id },
      { $addToSet: { patients: req.user.patientId } }
    );

    await createNotification({
      targetRole: "doctor",
      doctorId: doctor._id,
      patientId: req.user._id,
      type: "patient_granted_access",
      title: "Access approved",
      message: `${req.user.name} approved your record access request.`,
    });

    return res.status(201).json({
      access: {
        id: String(access._id),
        status: access.status,
        approved_at: access.approvedAt,
      },
      message: `Access granted to ${doctor.name}`,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Grant failed" });
  }
});

router.get("/requests/pending", authMiddleware, async (req, res) => {
  try {
    const requests = await DoctorPatientAccess.find({
      patient: req.user._id,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .populate("doctor", "doctorId doctorUid name specialization clinicName");

    return res.json({
      requests: requests.map((request) => ({
        id: String(request._id),
        status: request.status,
        requestedBy: request.requestedBy,
        requestedAt: request.createdAt,
        doctor: {
          id: String(request.doctor?._id || ""),
          doctorId: request.doctor?.doctorId || request.doctor?.doctorUid || "",
          name: request.doctor?.name || "Doctor",
          specialization: request.doctor?.specialization || "",
          clinicName: request.doctor?.clinicName || "",
        },
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load pending requests" });
  }
});

router.post("/requests/:id/respond", authMiddleware, async (req, res) => {
  try {
    const { action } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "action must be approve or reject" });
    }

    const request = await DoctorPatientAccess.findOne({
      _id: req.params.id,
      patient: req.user._id,
    }).populate("doctor", "doctorId doctorUid name patients");
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = action === "approve" ? "approved" : "revoked";
    request.approvedAt = action === "approve" ? new Date() : request.approvedAt;
    request.revokedAt = action === "reject" ? new Date() : null;
    await request.save();

    const doctorCanonicalId = request.doctor?.doctorId || request.doctor?.doctorUid;
    if (action === "approve" && doctorCanonicalId) {
      await User.updateOne(
        { _id: req.user._id },
        { $addToSet: { sharedWith: doctorCanonicalId } }
      );
      await Doctor.updateOne(
        { _id: request.doctor._id },
        { $addToSet: { patients: req.user.patientId } }
      );
    }

    await createNotification({
      targetRole: "doctor",
      doctorId: request.doctor?._id,
      patientId: req.user._id,
      type: action === "approve" ? "patient_granted_access" : "patient_rejected_access",
      title: action === "approve" ? "Access approved" : "Access rejected",
      message:
        action === "approve"
          ? `${req.user.name} approved your access request.`
          : `${req.user.name} rejected your access request.`,
    });

    return res.json({
      request: {
        id: String(request._id),
        status: request.status,
        approved_at: request.approvedAt,
        revoked_at: request.revokedAt,
      },
      message: action === "approve" ? "Access approved" : "Access rejected",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Action failed" });
  }
});

router.get("/patients", doctorAuth, async (req, res) => {
  try {
    const search = String(req.query.search || "").trim().toLowerCase();
    const accessRows = await DoctorPatientAccess.find({
      doctor: req.doctor._id,
      status: "approved",
    }).sort({ approvedAt: -1, createdAt: -1 });

    const patientIds = accessRows.map((row) => row.patient);
    if (!patientIds.length) {
      return res.json({ patients: [] });
    }

    const patients = await User.find({ _id: { $in: patientIds } }).select(
      "_id patientId name email phone"
    );

    const byId = new Map(patients.map((p) => [String(p._id), p]));
    const merged = accessRows
      .map((row) => {
        const patient = byId.get(String(row.patient));
        if (!patient) {
          return null;
        }
        return {
          patientId: patient.patientId || String(patient._id),
          patientMongoId: String(patient._id),
          name: patient.name,
          email: patient.email,
          phone: patient.phone,
          accessStatus: row.status,
          approvedAt: row.approvedAt,
        };
      })
      .filter(Boolean);

    const filtered = search
      ? merged.filter((item) => {
          const text =
            `${item.patientId} ${item.name} ${item.email} ${item.phone}`.toLowerCase();
          return text.includes(search);
        })
      : merged;

    return res.json({ patients: filtered });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load patients" });
  }
});

router.get("/patients/:patientId/profile", doctorAuth, async (req, res) => {
  try {
    await ensureMongoDoctorIdentifiers(req.doctor);
    const patient = await resolvePatientByIdentifier(
      req.params.patientId,
      "_id patientId name email phone createdAt dateOfBirth sharedWith"
    );
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const access = await ensureApprovedDoctorAccess(req.doctor, patient);
    if (!access) {
      return res.status(403).json({ message: "Access not approved for this patient" });
    }

    const appointmentCount = await Appointment.countDocuments({ user: patient._id });
    const recordCount = await MedicalRecord.countDocuments({ user: patient._id });

    return res.json({
      patient: {
        patientId: patient.patientId || String(patient._id),
        patientMongoId: String(patient._id),
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        joinedAt: patient.createdAt,
        age: calculateAge(patient.dateOfBirth),
        appointmentCount,
        recordCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load profile" });
  }
});

router.get("/patients/:patientId/session", doctorAuth, async (req, res) => {
  try {
    await ensureMongoDoctorIdentifiers(req.doctor);
    const patient = await resolvePatientByIdentifier(
      req.params.patientId,
      "_id patientId name email phone createdAt dateOfBirth sharedWith"
    );
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const access = await ensureApprovedDoctorAccess(req.doctor, patient);
    if (!access) {
      return res.status(403).json({ message: "Access not approved for this patient" });
    }

    const [records, prescriptions, appointments, appointmentCount, recordCount] =
      await Promise.all([
        MedicalRecord.find({ user: patient._id }).sort({ createdAt: -1 }),
        DoctorPrescription.find({
          doctor: req.doctor._id,
          patient: patient._id,
        }).sort({ createdAt: -1 }),
        DoctorAppointment.find({
          doctor: req.doctor._id,
          patient: patient._id,
        }).sort({ visitDate: 1 }),
        Appointment.countDocuments({ user: patient._id }),
        MedicalRecord.countDocuments({ user: patient._id }),
      ]);

    return res.json({
      patient: {
        patientId: patient.patientId || String(patient._id),
        patientMongoId: String(patient._id),
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        joinedAt: patient.createdAt,
        age: calculateAge(patient.dateOfBirth),
        appointmentCount,
        recordCount,
      },
      records,
      prescriptions: prescriptions.map(toPrescriptionPayload),
      appointments: appointments.map(toDoctorAppointmentPayload),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load active patient session" });
  }
});

router.get("/patients/:patientId/records", doctorAuth, async (req, res) => {
  try {
    await ensureMongoDoctorIdentifiers(req.doctor);
    const patient = await resolvePatientByIdentifier(req.params.patientId, "_id patientId sharedWith");
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const access = await ensureApprovedDoctorAccess(req.doctor, patient);
    if (!access) {
      return res.status(403).json({ message: "Access not approved for this patient" });
    }

    const records = await MedicalRecord.find({ user: patient._id }).sort({ createdAt: -1 });
    const prescriptions = await DoctorPrescription.find({
      doctor: req.doctor._id,
      patient: patient._id,
    }).sort({ createdAt: -1 });

    return res.json({
      records,
      prescriptions: prescriptions.map(toPrescriptionPayload),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load records" });
  }
});

router.post("/add-prescription", doctorAuth, async (req, res) => {
  try {
    await ensureMongoDoctorIdentifiers(req.doctor);
    const { patientId, medicines, notes = "", nextVisitDate = null } = req.body;
    const normalizedMedicines = normalizeMedicineEntries(medicines);
    if (!patientId || normalizedMedicines.length === 0) {
      return res.status(400).json({ message: "patientId and medicines[] are required" });
    }

    const patient = await resolvePatientByIdentifier(patientId, "_id patientId sharedWith");
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const access = await ensureApprovedDoctorAccess(req.doctor, patient);
    if (!access) {
      return res.status(403).json({ message: "Access not approved for this patient" });
    }

    const prescription = await DoctorPrescription.create({
      doctor: req.doctor._id,
      patient: patient._id,
      medicines: normalizedMedicines,
      notes,
      nextVisitDate: nextVisitDate || null,
    });

    if (nextVisitDate) {
      await DoctorAppointment.create({
        doctor: req.doctor._id,
        patient: patient._id,
        visitDate: new Date(nextVisitDate),
        notes: "Follow-up from prescription",
        status: "scheduled",
      });
    }

    await createNotification({
      targetRole: "patient",
      doctorId: req.doctor._id,
      patientId: patient._id,
      type: "prescription_added",
      title: "New prescription added",
      message: `${req.doctor.name} added a new prescription for you.`,
    });

    if (nextVisitDate) {
      await createNotification({
        targetRole: "patient",
        doctorId: req.doctor._id,
        patientId: patient._id,
        type: "next_visit_scheduled",
        title: "Next visit scheduled",
        message: `${req.doctor.name} scheduled your next visit for ${new Date(
          nextVisitDate
        ).toLocaleDateString("en-IN")}.`,
      });
    }

    return res.status(201).json({
      prescription: toPrescriptionPayload(prescription),
      message: "Prescription saved",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to save prescription" });
  }
});

router.get("/prescriptions", doctorAuth, async (req, res) => {
  try {
    const patientId = String(req.query.patientId || "").trim();
    const filter = { doctor: req.doctor._id };
    if (patientId) {
      const patient = await resolvePatientByIdentifier(patientId, "_id");
      if (!patient) {
        return res.json({ prescriptions: [] });
      }
      filter.patient = patient._id;
    }

    const prescriptions = await DoctorPrescription.find(filter).sort({ createdAt: -1 });
    return res.json({
      prescriptions: prescriptions.map(toPrescriptionPayload),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load prescriptions" });
  }
});

router.patch("/prescriptions/:id", doctorAuth, async (req, res) => {
  try {
    await ensureMongoDoctorIdentifiers(req.doctor);
    const { medicines, notes = "", nextVisitDate = null } = req.body;
    const normalizedMedicines = normalizeMedicineEntries(medicines);
    if (normalizedMedicines.length === 0) {
      return res.status(400).json({ message: "medicines[] is required" });
    }

    const prescription = await DoctorPrescription.findOne({
      _id: req.params.id,
      doctor: req.doctor._id,
    });
    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    const patient = await User.findById(prescription.patient).select("_id patientId sharedWith");
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const access = await ensureApprovedDoctorAccess(req.doctor, patient);
    if (!access) {
      return res.status(403).json({ message: "Access not approved for this patient" });
    }

    prescription.medicines = normalizedMedicines;
    prescription.notes = notes;
    prescription.nextVisitDate = nextVisitDate || null;
    await prescription.save();

    await createNotification({
      targetRole: "patient",
      doctorId: req.doctor._id,
      patientId: prescription.patient,
      type: "prescription_updated",
      title: "Prescription updated",
      message: `${req.doctor.name} updated your prescription.`,
    });

    return res.json({
      prescription: toPrescriptionPayload(prescription),
      message: "Prescription updated",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update prescription" });
  }
});

router.delete("/prescriptions/:id", doctorAuth, async (req, res) => {
  try {
    const prescription = await DoctorPrescription.findOneAndDelete({
      _id: req.params.id,
      doctor: req.doctor._id,
    });
    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    await createNotification({
      targetRole: "patient",
      doctorId: req.doctor._id,
      patientId: prescription.patient,
      type: "prescription_deleted",
      title: "Prescription removed",
      message: `${req.doctor.name} removed a prescription.`,
    });

    return res.json({ message: "Prescription deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to delete prescription" });
  }
});

router.post("/appointments", doctorAuth, async (req, res) => {
  try {
    await ensureMongoDoctorIdentifiers(req.doctor);
    const { patientId, visitDate, notes = "" } = req.body;
    if (!patientId || !visitDate) {
      return res.status(400).json({ message: "patientId and visitDate are required" });
    }

    const patient = await resolvePatientByIdentifier(patientId, "_id patientId sharedWith");
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const access = await ensureApprovedDoctorAccess(req.doctor, patient);
    if (!access) {
      return res.status(403).json({ message: "Access not approved for this patient" });
    }

    const appointment = await DoctorAppointment.create({
      doctor: req.doctor._id,
      patient: patient._id,
      visitDate: new Date(visitDate),
      notes,
      status: "scheduled",
    });

    await createNotification({
      targetRole: "patient",
      doctorId: req.doctor._id,
      patientId: patient._id,
      type: "next_visit_scheduled",
      title: "Next visit scheduled",
      message: `${req.doctor.name} scheduled a visit for ${new Date(
        visitDate
      ).toLocaleDateString("en-IN")}.`,
    });

    return res.status(201).json({
      appointment: {
        id: String(appointment._id),
        patient_id: String(appointment.patient),
        visit_date: appointment.visitDate,
        notes: appointment.notes || "",
        status: appointment.status,
        created_at: appointment.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to schedule appointment" });
  }
});

router.get("/appointments", doctorAuth, async (req, res) => {
  try {
    const filter = { doctor: req.doctor._id };
    const patientId = String(req.query.patientId || "").trim();
    if (patientId) {
      const patient = await resolvePatientByIdentifier(patientId, "_id");
      if (!patient) {
        return res.json({ appointments: [] });
      }
      filter.patient = patient._id;
    }

    const appointments = await DoctorAppointment.find(filter).sort({ visitDate: 1 });
    return res.json({
      appointments: appointments.map(toDoctorAppointmentPayload),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load appointments" });
  }
});

router.get("/access", doctorAuth, async (req, res) => {
  try {
    const permissions = await DoctorPatientAccess.find({ doctor: req.doctor._id })
      .sort({ createdAt: -1 })
      .populate("doctor", "doctorId doctorUid");

    return res.json({
      permissions: await Promise.all(permissions.map((item) => toPermissionPayload(item))),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load access permissions" });
  }
});

router.patch("/access/:id/revoke", doctorAuth, async (req, res) => {
  try {
    const access = await DoctorPatientAccess.findOne({
      _id: req.params.id,
      doctor: req.doctor._id,
    });
    if (!access) {
      return res.status(404).json({ message: "Access permission not found" });
    }

    access.status = "revoked";
    access.revokedAt = new Date();
    await access.save();

    await createNotification({
      targetRole: "patient",
      doctorId: req.doctor._id,
      patientId: access.patient,
      type: "access_revoked",
      title: "Doctor access revoked",
      message: `${req.doctor.name} revoked active access.`,
    });

    return res.json({
      permission: {
        id: String(access._id),
        patient_id: String(access.patient),
        status: access.status,
        revoked_at: access.revokedAt,
      },
      message: "Access revoked successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Revoke failed" });
  }
});

router.get("/notifications", doctorAuth, async (req, res) => {
  try {
    const notifications = await DoctorNotification.find({
      targetRole: "doctor",
      doctor: req.doctor._id,
    })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      notifications: notifications.map((item) => ({
        id: String(item._id),
        type: item.type,
        title: item.title,
        message: item.message,
        is_read: item.isRead,
        created_at: item.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load notifications" });
  }
});

router.get("/patient/appointments", authMiddleware, async (req, res) => {
  try {
    const appointments = await DoctorAppointment.find({
      patient: req.user._id,
      status: { $ne: "cancelled" },
    })
      .sort({ visitDate: 1 })
      .populate("doctor", "name doctorId doctorUid");

    return res.json({
      appointments: appointments.map((item) => ({
        id: String(item._id),
        doctor: item.doctor?.name || "Doctor",
        doctorId: item.doctor?.doctorId || item.doctor?.doctorUid || "",
        visitDate: item.visitDate,
        notes: item.notes || "",
        status: item.status,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to load doctor appointments",
    });
  }
});

router.delete("/patient/appointments/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await DoctorAppointment.findOneAndDelete({
      _id: req.params.id,
      patient: req.user._id,
    });
    if (!deleted) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    return res.json({ message: "Doctor appointment deleted" });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to delete doctor appointment",
    });
  }
});

router.get("/patient/prescriptions", authMiddleware, async (req, res) => {
  try {
    const prescriptions = await DoctorPrescription.find({ patient: req.user._id })
      .sort({ createdAt: -1 })
      .populate("doctor", "name doctorId doctorUid");

    return res.json({
      prescriptions: prescriptions.map((item) => ({
        ...toPrescriptionPayload(item),
        doctor: item.doctor?.name || "Doctor",
        doctorId: item.doctor?.doctorId || item.doctor?.doctorUid || "",
      })),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to load patient prescriptions",
    });
  }
});

router.get("/notifications/patient", authMiddleware, async (req, res) => {
  try {
    const notifications = await DoctorNotification.find({
      targetRole: "patient",
      patient: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      notifications: notifications.map((item) => ({
        id: String(item._id),
        type: item.type,
        title: item.title,
        message: item.message,
        is_read: item.isRead,
        created_at: item.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to load notifications",
    });
  }
});

router.get("/:doctorId/patients", doctorAuth, async (req, res) => {
  try {
    const doctorIdParam = String(req.params.doctorId || "").trim();
    if (!doctorIdParam) {
      return res.status(400).json({ message: "doctorId is required" });
    }

    const doctorCanonicalId = req.doctor.doctorId || req.doctor.doctorUid;
    if (doctorCanonicalId !== doctorIdParam) {
      return res.status(403).json({ message: "Access denied for this doctorId" });
    }

    const accessRows = await DoctorPatientAccess.find({
      doctor: req.doctor._id,
      status: "approved",
    }).sort({ approvedAt: -1, createdAt: -1 });

    const patientIds = accessRows.map((row) => row.patient);
    if (!patientIds.length) {
      return res.json({ doctorId: doctorCanonicalId, patients: [] });
    }

    const patients = await User.find({ _id: { $in: patientIds } }).select(
      "_id patientId name email phone"
    );
    const records = await MedicalRecord.find({
      user: { $in: patients.map((item) => item._id) },
    }).sort({ createdAt: -1 });
    const sharingSessions = await SharingSession.find({
      user: { $in: patients.map((item) => item._id) },
      doctorId: doctorCanonicalId,
      revokedByUser: { $ne: true },
    }).select("user reports");

    const recordsByUserId = new Map();
    records.forEach((record) => {
      const key = String(record.user);
      const list = recordsByUserId.get(key) || [];
      list.push(record);
      recordsByUserId.set(key, list);
    });

    const reportFiltersByUserId = new Map();
    sharingSessions.forEach((session) => {
      const key = String(session.user);
      const current = reportFiltersByUserId.get(key) || new Set();
      (session.reports || []).forEach((name) => current.add(String(name).toLowerCase()));
      reportFiltersByUserId.set(key, current);
    });

    return res.json({
      doctorId: doctorCanonicalId,
      patients: patients.map((patient) => ({
        patientId: patient.patientId || String(patient._id),
        patientMongoId: String(patient._id),
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        records: (() => {
          const allRecords = recordsByUserId.get(String(patient._id)) || [];
          const reportFilter = reportFiltersByUserId.get(String(patient._id));
          if (!reportFilter || reportFilter.size === 0) {
            return allRecords;
          }
          return allRecords.filter((record) => {
            const title = String(record.title || "").toLowerCase();
            const fileName = String(record.fileName || "").toLowerCase();
            return reportFilter.has(title) || reportFilter.has(fileName);
          });
        })(),
      })),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Failed to load doctor patients" });
  }
});

export default router;
