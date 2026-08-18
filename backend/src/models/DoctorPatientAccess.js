import mongoose from "mongoose";

const doctorPatientAccessSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "revoked"],
      default: "pending",
      index: true,
    },
    requestedBy: {
      type: String,
      enum: ["doctor", "patient"],
      required: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

doctorPatientAccessSchema.index({ doctor: 1, patient: 1 }, { unique: true });

const DoctorPatientAccess =
  mongoose.models.DoctorPatientAccess ||
  mongoose.model("DoctorPatientAccess", doctorPatientAccessSchema);

export default DoctorPatientAccess;
