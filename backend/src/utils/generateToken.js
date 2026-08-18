import jwt from "jsonwebtoken";

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign({ sub: userId }, secret, {
    expiresIn: "7d",
  });
};

export default generateToken;
