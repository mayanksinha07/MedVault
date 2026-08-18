import express from "express";
import Appointment from "../models/Appointment.js";
import MedicalRecord from "../models/MedicalRecord.js";
import SharingSession from "../models/SharingSession.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

const getTodayDateString = () => new Date().toISOString().split("T")[0];

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const today = getTodayDateString();

    const [appointments, totalRecords, activeSharing] = await Promise.all([
      Appointment.find({ user: userId }).sort({ date: 1, time: 1 }).limit(20),
      MedicalRecord.countDocuments({ user: userId }),
      SharingSession.countDocuments({
        user: userId,
        status: { $in: ["active", "expiring"] },
      }),
    ]);

    const todayAppointments = appointments.filter(
      (item) => item.date === today
    ).length;
    const upcomingAppointments = appointments.filter(
      (item) => item.date > today
    ).length;

    const recentAppointments = appointments.slice(0, 5).map((item) => ({
      id: item._id,
      doctor: item.doctor,
      specialty: "Consultation",
      date: item.date,
      time: item.time,
      mode: "In-person",
      status:
        item.date === today
          ? "today"
          : item.date > today
          ? "upcoming"
          : "completed",
    }));

    const healthScore = Math.max(
      65,
      Math.min(96, 78 + Math.floor((upcomingAppointments + totalRecords) / 3))
    );

    return res.json({
      vitals: {
        heartRate: 72,
        temperature: 98.4,
        bloodPressure: "118 / 76",
      },
      metrics: {
        todayAppointments,
        upcomingAppointments,
        totalRecords,
        activeSharing,
        healthScore,
      },
      recentAppointments,
      alerts: [
        "Stay hydrated to maintain stable blood pressure.",
        "Schedule a follow-up if symptoms continue for more than 3 days.",
      ],
    });
  })
);

export default router;
