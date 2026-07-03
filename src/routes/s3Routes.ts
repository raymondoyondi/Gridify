import express, { Request, Response } from "express";
import { s3Service } from "../services/s3Service";

const router = express.Router();

/**
 * S3 Routes for handling file operations
 */

/**
 * POST /api/s3/upload
 * Upload a file to S3
 */
router.post("/upload", async (req: Request, res: Response) => {
  try {
    const { key, body, contentType = "application/octet-stream", metadata } = req.body;

    if (!key) {
      return res.status(400).json({ error: "Missing 's3 key' parameter" });
    }

    if (!body) {
      return res.status(400).json({ error: "Missing 'body' parameter" });
    }

    const result = await s3Service.uploadFile({
      key,
      body,
      contentType,
      metadata,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error in S3 upload route:", error);
    res.status(500).json({
      error: "Failed to upload file",
      message: error.message,
    });
  }
});

/**
 * GET /api/s3/download/:key
 * Download a file from S3
 */
router.get("/download/:key", async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: "Missing 'key' parameter" });
    }

    const buffer = await s3Service.downloadFile(key);

    res.setHeader("Content-Disposition", `attachment; filename="${key}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(buffer);
  } catch (error: any) {
    console.error("Error in S3 download route:", error);
    res.status(500).json({
      error: "Failed to download file",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/s3/delete/:key
 * Delete a file from S3
 */
router.delete("/delete/:key", async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: "Missing 'key' parameter" });
    }

    await s3Service.deleteFile(key);

    res.json({
      success: true,
      message: `File deleted: ${key}`,
    });
  } catch (error: any) {
    console.error("Error in S3 delete route:", error);
    res.status(500).json({
      error: "Failed to delete file",
      message: error.message,
    });
  }
});

/**
 * GET /api/s3/presigned-url/:key
 * Generate a presigned URL for temporary access
 */
router.get("/presigned-url/:key", async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { expiresIn = 3600 } = req.query;

    if (!key) {
      return res.status(400).json({ error: "Missing 'key' parameter" });
    }

    const url = await s3Service.getPresignedUrl(key, Number(expiresIn));

    res.json({
      success: true,
      url,
      expiresIn,
    });
  } catch (error: any) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({
      error: "Failed to generate presigned URL",
      message: error.message,
    });
  }
});

/**
 * GET /api/s3/list
 * List objects in S3 bucket
 */
router.get("/list", async (req: Request, res: Response) => {
  try {
    const { prefix = "" } = req.query;

    const result = await s3Service.listObjects(String(prefix));

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error listing S3 objects:", error);
    res.status(500).json({
      error: "Failed to list objects",
      message: error.message,
    });
  }
});

/**
 * POST /api/s3/upload-json
 * Upload a JSON object to S3
 */
router.post("/upload-json", async (req: Request, res: Response) => {
  try {
    const { key, data, metadata } = req.body;

    if (!key) {
      return res.status(400).json({ error: "Missing 'key' parameter" });
    }

    if (!data) {
      return res.status(400).json({ error: "Missing 'data' parameter" });
    }

    const result = await s3Service.uploadJson(key, data, metadata);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error uploading JSON to S3:", error);
    res.status(500).json({
      error: "Failed to upload JSON",
      message: error.message,
    });
  }
});

/**
 * GET /api/s3/download-json/:key
 * Download and parse a JSON object from S3
 */
router.get("/download-json/:key", async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: "Missing 'key' parameter" });
    }

    const data = await s3Service.downloadJson(key);

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error downloading JSON from S3:", error);
    res.status(500).json({
      error: "Failed to download JSON",
      message: error.message,
    });
  }
});

/**
 * GET /api/s3/exists/:key
 * Check if an object exists in S3
 */
router.get("/exists/:key", async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: "Missing 'key' parameter" });
    }

    const exists = await s3Service.objectExists(key);

    res.json({
      success: true,
      exists,
      key,
    });
  } catch (error: any) {
    console.error("Error checking object existence:", error);
    res.status(500).json({
      error: "Failed to check object existence",
      message: error.message,
    });
  }
});

export default router;
