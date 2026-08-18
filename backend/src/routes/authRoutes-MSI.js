import express from "express";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import asyncHandler from "../utils/asyncHandler.js";
import authMiddleware from "../middlewares/auth.js";

const router = express.Router();

const sanitizeUser = (user) => ({
  id: user._id,
  patientId: user.patientId,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  sharedWith: Array.isArray(user.sharedWith) ? user.sharedWith : [],
});

const buildPatientIdCandidates = (email = "") => {
  const local = String(email).split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = (local || "pt").slice(0, 5).toUpperCase();
  return Array.from({ length: 12 }, (_, index) => {
    const randomPart =
      index < 10
        ? Math.random().toString(36).slice(2, 5).toUpperCase()
        : Date.now().toString().slice(-3);
    return `${base}-${randomPart}`;
  });
};

const generateUniquePatientId = async (email, currentUserId = null) => {
  for (const candidate of buildPatientIdCandidates(email)) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await User.findOne({ patientId: candidate }).select("_id");
    if (!existing || String(existing._id) === String(currentUserId)) {
      return candidate;
    }
  }

  return `PT-${Date.now().toString().slice(-4)}`;
};

const createUserAccount = async (payload) => {
  const { name, email, password, phone = "", avatar = "" } = payload;

  if (!name || !email || !password) {
    const error = new Error("name, email and password are required");
    error.status = 400;
    throw error;
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const error = new Error("Email is already in use");
    error.status = 409;
    throw error;
  }

  const patientId = await generateUniquePatientId(email);

  const user = await User.create({
    name,
    email,
    password,
    phone,
    avatar,
    patientId,
  });

  const token = generateToken(user._id);
  return {
    token,
    user,
  };
};

const ensurePatientId = async (user) => {
  if (user.patientId) {
    return user;
  }
  user.patientId = await generateUniquePatientId(user.email, user._id);
  await user.save({ validateBeforeSave: false });
  return user;
};

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { token, user } = await createUserAccount(req.body);
    return res.status(201).json({
      token,
      user: sanitizeUser(user),
      message: "Account created successfully",
    });
  })
);

router.post(
  "/auth/signup",
  asyncHandler(async (req, res) => {
    const { token, user } = await createUserAccount(req.body);
    return res.status(201).json({
      token,
      user: sanitizeUser(user),
      message: "Account created successfully",
    });
  })
);

router.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400);
      throw new Error("email and password are required");
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!user) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    const matches = await user.comparePassword(password);
    if (!matches) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    await ensurePatientId(user);
    const token = generateToken(user._id);
    return res.json({
      token,
      user: sanitizeUser(user),
      message: "Login successful",
    });
  })
);

router.get(
  "/auth/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await ensurePatientId(req.user);
    return res.json({
      user: sanitizeUser(req.user),
    });
  })
);

export default router;
