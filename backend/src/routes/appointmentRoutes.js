import express from "express";
import Appointment from "../models/Appointment.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const appointments = await Appointment.find({ user: req.user._id }).sort({
      date: 1,
      time: 1,
    });

    return res.json(appointments);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      doctor,
      doctorId = "",
      date,
      time,
      notes = "",
      status = "scheduled",
    } = req.body;

    if (!doctor || !doctorId || !date || !time) {
      res.status(400);
      throw new Error("doctor, doctorId, date and time are required");
    }

    const appointment = await Appointment.create({
      user: req.user._id,
      doctor,
      doctorId,
      date,
      time,
      notes,
      status,
    });

    return res.status(201).json(appointment);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!appointment) {
      res.status(404);
      throw new Error("Appointment not found");
    }

    const { doctor, doctorId, date, time, notes, status } = req.body;
    if (doctor !== undefined) appointment.doctor = doctor;
    if (doctorId !== undefined) appointment.doctorId = doctorId;
    if (date !== undefined) appointment.date = date;
    if (time !== undefined) appointment.time = time;
    if (notes !== undefined) appointment.notes = notes;
    if (status !== undefined) appointment.status = status;

    await appointment.save();
    return res.json(appointment);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const deleted = await Appointment.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!deleted) {
      res.status(404);
      throw new Error("Appointment not found");
    }

    return res.json({ message: "Appointment deleted" });
  })
);

export default router;
