import express from "express";
import SharingSession from "../models/SharingSession.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

const calculateSharingStatus = (expiresOn) => {
  const expiry = new Date(expiresOn);
  const now = new Date();
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);

  if (daysLeft <= 0) return "expired";
  if (daysLeft <= 2) return "expiring";
  return "active";
};

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

    const status = calculateSharingStatus(expiresOn);
    const session = await SharingSession.create({
      user: req.user._id,
      doctor,
      doctorId,
      specialty,
      hospital,
      reports,
      sharedOn: new Date().toISOString().split("T")[0],
      expiresOn,
      purpose,
      status,
      revokedByUser: false,
      revokedAt: null,
    });

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
    return res.json(session);
  })
);

export default router;
