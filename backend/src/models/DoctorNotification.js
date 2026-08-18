import mongoose from "mongoose";

const doctorNotificationSchema = new mongoose.Schema(
  {
    targetRole: {
      type: String,
      enum: ["doctor", "patient"],
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const DoctorNotification =
  mongoose.models.DoctorNotification ||
  mongoose.model("DoctorNotification", doctorNotificationSchema);

export default DoctorNotification;
