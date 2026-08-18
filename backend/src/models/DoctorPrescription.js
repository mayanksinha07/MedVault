import mongoose from "mongoose";

const medicineEntrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    reminderTime: {
      type: String,
      default: "",
      trim: true,
    },
    mealTiming: {
      type: String,
      enum: ["before_meal", "after_meal", ""],
      default: "",
    },
  },
  {
    _id: false,
  }
);

const doctorPrescriptionSchema = new mongoose.Schema(
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
    medicines: {
      type: [medicineEntrySchema],
      default: [],
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    nextVisitDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const DoctorPrescription =
  mongoose.models.DoctorPrescription ||
  mongoose.model("DoctorPrescription", doctorPrescriptionSchema);

export default DoctorPrescription;
