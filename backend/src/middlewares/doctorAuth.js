import jwt from "jsonwebtoken";
import Doctor from "../models/Doctor.js";

const doctorAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: token missing" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const decoded = jwt.verify(token, secret);
    if (decoded.role !== "doctor") {
      return res.status(403).json({ message: "Forbidden: doctor role required" });
    }

    const doctor = await Doctor.findById(decoded.sub).select("-password");
    if (!doctor) {
      return res.status(401).json({ message: "Unauthorized: doctor not found" });
    }
    req.doctor = doctor;

    req.auth = decoded;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Unauthorized: invalid token" });
  }
};

export default doctorAuth;
