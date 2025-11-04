import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

// Configure multer for memory storage (Cloudinary upload)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept images and PDFs only
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  } else {
    cb(
      new Error("Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed!")
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = (fileBuffer, folder = "restaurant-uploads") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Upload single file
router.post("/single", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      "restaurant-documents"
    );

    res.json({
      message: "File uploaded successfully",
      fileUrl: result.secure_url,
      publicId: result.public_id,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Upload multiple files
router.post("/multiple", upload.array("documents", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadPromises = req.files.map((file) =>
      uploadToCloudinary(file.buffer, "restaurant-documents")
    );

    const results = await Promise.all(uploadPromises);

    const fileUrls = results.map((result, index) => ({
      fileUrl: result.secure_url,
      publicId: result.public_id,
      originalName: req.files[index].originalname,
      size: req.files[index].size,
    }));

    res.json({
      message: "Files uploaded successfully",
      files: fileUrls,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Upload menu item image
router.post("/menu-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      "restaurant-menu-images"
    );

    res.json({
      message: "Image uploaded successfully",
      imageUrl: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Delete file from Cloudinary
router.delete("/:publicId", async (req, res) => {
  try {
    const publicId = req.params.publicId.replace(/-/g, "/"); // Convert back to path format

    await cloudinary.uploader.destroy(publicId);
    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
