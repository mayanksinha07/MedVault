import mongoose from "mongoose";

const sharingSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    doctor: {
      type: String,
      required: true,
      trim: true,
    },
    doctorId: {
      type: String,
      default: "",
      trim: true,
    },
    specialty: {
      type: String,
      default: "",
      trim: true,
    },
    hospital: {
      type: String,
      required: true,
      trim: true,
    },
    reports: {
      type: [String],
      default: [],
    },
    sharedOn: {
      type: String,
      required: true,
      trim: true,
    },
    expiresOn: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "expiring", "expired"],
      default: "active",
    },
    revokedByUser: {
      type: Boolean,
      default: false,
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

const SharingSession = mongoose.model("SharingSession", sharingSessionSchema);

export default SharingSession;
