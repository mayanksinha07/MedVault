import express from "express";
import SharingSession from "../models/SharingSession.js";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import MedicalRecord from "../models/MedicalRecord.js";
import DoctorPatientAccess from "../models/DoctorPatientAccess.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

const resolvePatient = async (identifier) => {
  const normalized = String(identifier || "").trim();
  if (!normalized) {
    return null;
  }

  return (
    (await User.findOne({ patientId: normalized }).select(
      "_id patientId name email phone sharedWith"
    )) ||
    (await User.findById(normalized).select(
      "_id patientId name email phone sharedWith"
    ))
  );
};

const normalizeReports = (records) =>
  records
    .map((item) => String(item || "").trim())
    .filter(Boolean);

const calculateSharingStatus = (expiresOn) => {
  const expiry = new Date(expiresOn);
  const now = new Date();
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);

  if (daysLeft <= 0) return "expired";
  if (daysLeft <= 2) return "expiring";
  return "active";
};

const sanitizeDoctor = (doctor) => ({
  id: doctor._id,
  doctorId: doctor.doctorId || doctor.doctorUid,
  name: doctor.name,
  email: doctor.email,
  phone: doctor.phone,
  specialization: doctor.specialization,
  clinicName: doctor.clinicName,
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const cutoff = new Date(Date.now() - 30000);
    const sessions = await SharingSession.find({
      user: req.user._id,
      $or: [
        { revokedByUser: { $ne: true } },
        { revokedAt: null },
        { revokedAt: { $gte: cutoff } },
      ],
    }).sort({ createdAt: -1 });
    return res.json(sessions);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      doctor,
      doctorId = "",
      specialty = "",
      hospital,
      reports = [],
      expiresOn,
      purpose = "",
    } = req.body;

    if (!doctor || !doctorId || !hospital || !expiresOn) {
      res.status(400);
      throw new Error("doctor, doctorId, hospital and expiresOn are required");
    }

    let doctorName = doctor;
    let doctorSpecialty = specialty;
    let doctorHospital = hospital;
    let canonicalDoctorId = doctorId;

    const mongoDoctor = await Doctor.findOne({
      $or: [{ doctorId }, { doctorUid: doctorId }],
    }).select("doctorId doctorUid name specialization clinicName");
    if (mongoDoctor) {
      canonicalDoctorId = mongoDoctor.doctorId || mongoDoctor.doctorUid || doctorId;
      doctorName = mongoDoctor.name || doctorName;
      doctorSpecialty = mongoDoctor.specialization || doctorSpecialty;
      doctorHospital = mongoDoctor.clinicName || doctorHospital;
    }

    if (!mongoDoctor) {
      res.status(404);
      throw new Error("Doctor ID not found");
    }

    const status = calculateSharingStatus(expiresOn);
    const session = await SharingSession.create({
      user: req.user._id,
      doctor: doctorName,
      doctorId: canonicalDoctorId,
      specialty: doctorSpecialty,
      hospital: doctorHospital,
      reports,
      sharedOn: new Date().toISOString().split("T")[0],
      expiresOn,
      purpose,
      status,
      revokedByUser: false,
      revokedAt: null,
    });

    await DoctorPatientAccess.findOneAndUpdate(
      { doctor: mongoDoctor._id, patient: req.user._id },
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

    await Promise.all([
      User.updateOne(
        { _id: req.user._id },
        { $addToSet: { sharedWith: canonicalDoctorId } }
      ),
      Doctor.updateOne(
        { _id: mongoDoctor._id },
        { $addToSet: { patients: req.user.patientId } }
      ),
    ]);

    return res.status(201).json(session);
  })
);

router.patch(
  "/:id/revoke",
  asyncHandler(async (req, res) => {
    const session = await SharingSession.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!session) {
      res.status(404);
      throw new Error("Sharing session not found");
    }

    session.status = "expired";
    session.revokedByUser = true;
    session.revokedAt = new Date();
    await session.save();

    if (session.doctorId) {
      const doctor = await Doctor.findOne({
        $or: [{ doctorId: session.doctorId }, { doctorUid: session.doctorId }],
      }).select("_id");
      if (doctor) {
        await DoctorPatientAccess.updateOne(
          { doctor: doctor._id, patient: req.user._id },
          { $set: { status: "revoked", revokedAt: new Date() } }
        );
      }
    }

    return res.json(session);
  })
);

router.post(
  "/share-record",
  asyncHandler(async (req, res) => {
    const { patientId, doctorId, reports = [], expiresOn, purpose = "" } = req.body;
    if (!patientId || !doctorId) {
      res.status(400);
      throw new Error("patientId and doctorId are required");
    }

    const patient = await resolvePatient(patientId);
    if (!patient) {
      res.status(404);
      throw new Error("Invalid patientId");
    }

    if (String(req.user._id) !== String(patient._id)) {
      res.status(403);
      throw new Error("You can only share records for your own patient account");
    }

    let doctor = await Doctor.findOne({
      $or: [{ doctorId }, { doctorUid: doctorId }],
    }).select("_id doctorId doctorUid name email phone specialization clinicName patients");

    let canonicalDoctorId = doctor?.doctorId || doctor?.doctorUid || doctorId;
    if (!doctor) {
      res.status(404);
      throw new Error("Invalid doctorId");
    }

    const normalizedReports = normalizeReports(reports);
    const sharedReports =
      normalizedReports.length > 0
        ? normalizedReports
        : (
            await MedicalRecord.find({ user: patient._id })
              .sort({ createdAt: -1 })
              .select("title fileName")
          ).map((record) => record.title || record.fileName).filter(Boolean);
    const expiry =
      expiresOn || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const status = calculateSharingStatus(expiry);

    const alreadyShared = (patient.sharedWith || []).includes(canonicalDoctorId);
    if (alreadyShared) {
      const existingSession = await SharingSession.findOne({
        user: patient._id,
        doctorId: canonicalDoctorId,
        revokedByUser: { $ne: true },
      }).sort({ createdAt: -1 });

      if (!existingSession) {
        await SharingSession.create({
          user: patient._id,
          doctor: doctor?.name || "Doctor",
          doctorId: canonicalDoctorId,
          specialty: doctor?.specialization || "",
          hospital: doctor?.clinicName || "Shared via doctor ID",
          reports: sharedReports,
          sharedOn: new Date().toISOString().split("T")[0],
          expiresOn: expiry,
          purpose,
          status,
          revokedByUser: false,
          revokedAt: null,
        });
      }

      if (doctor) {
        await Doctor.updateOne(
          { _id: doctor._id },
          { $addToSet: { patients: patient.patientId } }
        );
      }
      await DoctorPatientAccess.findOneAndUpdate(
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
      return res.json({
        message: "Records are already shared with this doctor",
        patientId: patient.patientId,
        doctorId: canonicalDoctorId,
      });
    }

    await User.updateOne(
      { _id: patient._id },
      { $addToSet: { sharedWith: canonicalDoctorId } }
    );

    if (doctor) {
      await Doctor.updateOne(
        { _id: doctor._id },
        { $addToSet: { patients: patient.patientId } }
      );
    }

    await DoctorPatientAccess.findOneAndUpdate(
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

    await SharingSession.create({
      user: patient._id,
      doctor: doctor?.name || "Doctor",
      doctorId: canonicalDoctorId,
      specialty: doctor?.specialization || "",
      hospital: doctor?.clinicName || "Shared via doctor ID",
      reports: sharedReports,
      sharedOn: new Date().toISOString().split("T")[0],
      expiresOn: expiry,
      purpose,
      status,
      revokedByUser: false,
      revokedAt: null,
    });

    return res.status(201).json({
      message: "Record sharing linked successfully",
      patientId: patient.patientId,
      doctorId: canonicalDoctorId,
      doctor: sanitizeDoctor(doctor),
    });
  })
);

router.get(
  "/patient/:patientId/doctors",
  asyncHandler(async (req, res) => {
    const { patientId } = req.params;
    const patient = await User.findOne({ patientId }).select(
      "_id patientId name email sharedWith"
    );

    if (!patient) {
      res.status(404);
      throw new Error("Patient not found");
    }

    if (String(req.user._id) !== String(patient._id)) {
      res.status(403);
      throw new Error("Access denied for this patientId");
    }

    const doctorIds = Array.isArray(patient.sharedWith) ? patient.sharedWith : [];
    if (!doctorIds.length) {
      return res.json({
        patientId,
        doctors: [],
      });
    }

    const doctors = await Doctor.find({
      $or: [{ doctorId: { $in: doctorIds } }, { doctorUid: { $in: doctorIds } }],
    }).select("_id doctorId doctorUid name email phone specialization clinicName");

    return res.json({
      patientId,
      doctors: doctors.map(sanitizeDoctor),
    });
  })
);

router.get(
  "/doctor/:doctorId/patients",
  asyncHandler(async (req, res) => {
    const { doctorId } = req.params;
    const doctor = await Doctor.findOne({
      $or: [{ doctorId }, { doctorUid: doctorId }],
    }).select("_id doctorId doctorUid name patients");

    if (!doctor) {
      res.status(404);
      throw new Error("Doctor not found");
    }

    const accessRows = await DoctorPatientAccess.find({
      doctor: doctor._id,
      status: "approved",
    }).select("patient");

    const patientIds = accessRows.map((item) => item.patient);
    if (!patientIds.length) {
      return res.json({
        doctorId: doctor.doctorId || doctor.doctorUid,
        patients: [],
      });
    }

    const patients = await User.find({ _id: { $in: patientIds } }).select(
      "_id patientId name email phone sharedWith"
    );

    const records = await MedicalRecord.find({
      user: { $in: patients.map((item) => item._id) },
    }).sort({ createdAt: -1 });

    const recordsByUserId = new Map();
    records.forEach((record) => {
      const key = String(record.user);
      const list = recordsByUserId.get(key) || [];
      list.push(record);
      recordsByUserId.set(key, list);
    });

    return res.json({
      doctorId: doctor.doctorId || doctor.doctorUid,
      patients: patients.map((patient) => ({
        patientId: patient.patientId,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        records: recordsByUserId.get(String(patient._id)) || [],
      })),
    });
  })
);

router.post(
  "/revoke-share",
  asyncHandler(async (req, res) => {
    const { patientId, doctorId } = req.body;
    if (!patientId || !doctorId) {
      res.status(400);
      throw new Error("patientId and doctorId are required");
    }

    const patient = await User.findOne({ patientId }).select("_id sharedWith");
    if (!patient) {
      res.status(404);
      throw new Error("Patient not found");
    }

    if (String(req.user._id) !== String(patient._id)) {
      res.status(403);
      throw new Error("Access denied for this patientId");
    }

    const doctor = await Doctor.findOne({
      $or: [{ doctorId }, { doctorUid: doctorId }],
    }).select("_id doctorId doctorUid");
    if (!doctor) {
      res.status(404);
      throw new Error("Doctor not found");
    }

    const canonicalDoctorId = doctor.doctorId || doctor.doctorUid;
    await Promise.all([
      User.updateOne(
        { _id: patient._id },
        { $pull: { sharedWith: canonicalDoctorId } }
      ),
      Doctor.updateOne(
        { _id: doctor._id },
        { $pull: { patients: patientId } }
      ),
      DoctorPatientAccess.updateOne(
        { doctor: doctor._id, patient: patient._id },
        { $set: { status: "revoked", revokedAt: new Date() } }
      ),
    ]);

    return res.json({
      message: "Access revoked successfully",
      patientId,
      doctorId: canonicalDoctorId,
    });
  })
);

export default router;
