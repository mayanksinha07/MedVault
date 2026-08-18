import express from "express";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import asyncHandler from "../utils/asyncHandler.js";
import authMiddleware from "../middlewares/auth.js";

const router = express.Router();

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
});

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

  const user = await User.create({
    name,
    email,
    password,
    phone,
    avatar,
  });

  const token = generateToken(user._id);
  return {
    token,
    user,
  };
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
    return res.json({
      user: sanitizeUser(req.user),
    });
  })
);

export default router;
