import mongoose from "mongoose";

const doctorAppointmentSchema = new mongoose.Schema(
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
    visitDate: {
      type: Date,
      required: true,
      index: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  {
    timestamps: true,
  }
);

const DoctorAppointment =
  mongoose.models.DoctorAppointment ||
  mongoose.model("DoctorAppointment", doctorAppointmentSchema);

export default DoctorAppointment;
