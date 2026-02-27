import express, { type Express } from "express";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

const LOCAL_UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

function useLocalUploads(): boolean {
  return !process.env.PRIVATE_OBJECT_DIR;
}

/**
 * Register object storage routes for file uploads.
 *
 * When PRIVATE_OBJECT_DIR is not set (e.g. local dev), uploads use local disk
 * instead of Replit Object Storage so logo upload works without cloud config.
 *
 * Presigned URL flow:
 * 1. POST /api/uploads/request-url - Get upload URL (and objectPath for DB)
 * 2. Client uploads file directly to that URL (PUT)
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = useLocalUploads() ? null : new ObjectStorageService();

  /**
   * Request a presigned URL (or local upload URL) for file upload.
   *
   * Request body (JSON):
   * { "name": "filename.jpg", "size": 12345, "contentType": "image/jpeg" }
   *
   * Response:
   * { "uploadURL": "...", "objectPath": "...", "metadata": {...} }
   */
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      if (useLocalUploads()) {
        const id = randomUUID();
        const uploadURL = `/api/uploads/put/${id}`;
        const objectPath = `/api/uploads/serve/${id}`;
        res.json({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        });
        return;
      }

      const uploadURL = await objectStorageService!.getObjectEntityUploadURL();
      const objectPath = objectStorageService!.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Local fallback: accept PUT with raw body and save to disk.
   * Used when PRIVATE_OBJECT_DIR is not set (e.g. local dev).
   */
  app.put(
    "/api/uploads/put/:id",
    express.raw({ type: () => true, limit: "5mb" }),
    (req: express.Request, res: express.Response) => {
      if (!useLocalUploads()) {
        return res.status(404).json({ error: "Not found" });
      }
      const id = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
        return res.status(400).json({ error: "Invalid upload id" });
      }
      const body = req.body as Buffer | undefined;
      if (!body || !Buffer.isBuffer(body)) {
        return res.status(400).json({ error: "Missing file body" });
      }
      try {
        fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
        const filePath = path.join(LOCAL_UPLOADS_DIR, id);
        fs.writeFileSync(filePath, body);
        res.status(200).end();
      } catch (err) {
        console.error("Error saving local upload:", err);
        res.status(500).json({ error: "Failed to save upload" });
      }
    }
  );

  /**
   * Local fallback: serve uploaded file from disk.
   * Used when logoUrl is /api/uploads/serve/:id (local uploads).
   */
  app.get("/api/uploads/serve/:id", (req, res) => {
    if (!useLocalUploads()) {
      return res.status(404).json({ error: "Not found" });
    }
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const filePath = path.join(LOCAL_UPLOADS_DIR, id);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Object not found" });
    }
    res.setHeader("Content-Type", "image/png");
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error serving local upload:", err);
        if (!res.headersSent) res.status(500).json({ error: "Failed to serve file" });
      }
    });
  });

  /**
   * Serve uploaded objects from object storage.
   * GET /objects/uploads/:objectId (only when object storage is configured).
   */
  app.get("/objects/uploads/:objectId", async (req, res) => {
    if (!objectStorageService) {
      return res.status(404).json({ error: "Object not found" });
    }
    try {
      const objectPath = `/objects/uploads/${req.params.objectId}`;
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

