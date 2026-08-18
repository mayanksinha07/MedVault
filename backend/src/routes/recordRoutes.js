import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import MedicalRecord from "../models/MedicalRecord.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/x-pdf",
  "application/octet-stream",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const allowedExtensions = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".doc",
  ".docx",
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (
      allowedMimeTypes.has(file.mimetype) ||
      allowedExtensions.has(extension)
    ) {
      return cb(null, true);
    }
    return cb(new Error("Unsupported file type"));
  },
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const records = await MedicalRecord.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    return res.json(records);
  })
);

router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const grouped = await MedicalRecord.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: "$category",
          files: { $sum: 1 },
          totalSize: { $sum: "$size" },
          lastUpdated: { $max: "$createdAt" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const categories = grouped.map((item) => ({
      title: item._id || "Other Reports",
      files: item.files,
      sizeMb: Number((item.totalSize / (1024 * 1024)).toFixed(2)),
      lastUpdated: item.lastUpdated,
    }));

    return res.json(categories);
  })
);

router.post(
  "/upload",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400);
      throw new Error("No file uploaded");
    }

    const { title = req.file.originalname, category = "Other Reports", notes = "" } =
      req.body;

    const record = await MedicalRecord.create({
      user: req.user._id,
      title,
      category,
      notes,
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    return res.status(201).json(record);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const record = await MedicalRecord.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!record) {
      res.status(404);
      throw new Error("Record not found");
    }

    const fileName = record.fileUrl.replace("/uploads/", "");
    const filePath = path.join(uploadDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await record.deleteOne();
    return res.json({ message: "Record deleted" });
  })
);

export default router;
