import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

/**
 * S3 Service for managing file operations in AWS S3
 * Handles uploads, downloads, deletions, and presigned URLs
 */

interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

interface UploadOptions {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

interface UploadResult {
  bucket: string;
  key: string;
  url: string;
  etag?: string;
}

interface ListObjectsResult {
  objects: Array<{
    key: string;
    size: number;
    lastModified: Date;
  }>;
  continuationToken?: string;
}

class S3Service {
  private client: S3Client | null = null;
  private bucket: string;

  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET || "";
    this.initializeClient();
  }

  /**
   * Initialize S3 client with credentials from environment variables
   */
  private initializeClient(): void {
    const config: S3Config = {
      region: process.env.AWS_REGION || "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      bucket: process.env.AWS_S3_BUCKET || "",
    };

    // Validate configuration
    if (!config.accessKeyId || config.accessKeyId === "YOUR_AWS_ACCESS_KEY") {
      console.warn("AWS_ACCESS_KEY_ID is not configured or uses placeholder value.");
      return;
    }

    if (!config.secretAccessKey || config.secretAccessKey === "YOUR_AWS_SECRET_KEY") {
      console.warn("AWS_SECRET_ACCESS_KEY is not configured or uses placeholder value.");
      return;
    }

    if (!config.bucket || config.bucket === "your-gridify-bucket") {
      console.warn("AWS_S3_BUCKET is not configured or uses placeholder value.");
      return;
    }

    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    console.log(`S3 Service initialized with bucket: ${config.bucket} in region: ${config.region}`);
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(options: UploadOptions): Promise<UploadResult> {
    if (!this.client) {
      throw new Error("S3 client is not initialized. Check your AWS credentials.");
    }

    const { key, body, contentType = "application/octet-stream", metadata = {} } = options;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
      });

      const response = await this.client.send(command);

      return {
        bucket: this.bucket,
        key,
        url: `s3://${this.bucket}/${key}`,
        etag: response.ETag,
      };
    } catch (error) {
      console.error(`Error uploading file to S3: ${key}`, error);
      throw new Error(`Failed to upload file: ${key}`);
    }
  }

  /**
   * Download a file from S3
   */
  async downloadFile(key: string): Promise<Buffer> {
    if (!this.client) {
      throw new Error("S3 client is not initialized. Check your AWS credentials.");
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      const chunks: Uint8Array[] = [];

      if (response.Body instanceof ReadableStream) {
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
      } else if (response.Body) {
        chunks.push(await response.Body.transformToByteArray());
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error(`Error downloading file from S3: ${key}`, error);
      throw new Error(`Failed to download file: ${key}`);
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    if (!this.client) {
      throw new Error("S3 client is not initialized. Check your AWS credentials.");
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      console.log(`File deleted from S3: ${key}`);
    } catch (error) {
      console.error(`Error deleting file from S3: ${key}`, error);
      throw new Error(`Failed to delete file: ${key}`);
    }
  }

  /**
   * Generate a presigned URL for temporary access
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.client) {
      throw new Error("S3 client is not initialized. Check your AWS credentials.");
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error(`Error generating presigned URL for: ${key}`, error);
      throw new Error(`Failed to generate presigned URL: ${key}`);
    }
  }

  /**
   * List objects in S3 bucket with optional prefix
   */
  async listObjects(
    prefix: string = "",
    continuationToken?: string
  ): Promise<ListObjectsResult> {
    if (!this.client) {
      throw new Error("S3 client is not initialized. Check your AWS credentials.");
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await this.client.send(command);

      return {
        objects: (response.Contents || []).map((obj) => ({
          key: obj.Key || "",
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date(),
        })),
        continuationToken: response.NextContinuationToken,
      };
    } catch (error) {
      console.error(`Error listing objects in S3 with prefix: ${prefix}`, error);
      throw new Error(`Failed to list objects: ${prefix}`);
    }
  }

  /**
   * Check if an object exists in S3
   */
  async objectExists(key: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NotFound") {
        return false;
      }
      console.error(`Error checking object existence in S3: ${key}`, error);
      throw new Error(`Failed to check object existence: ${key}`);
    }
  }

  /**
   * Upload a JSON object directly to S3
   */
  async uploadJson(key: string, data: any, metadata?: Record<string, string>): Promise<UploadResult> {
    const jsonBody = JSON.stringify(data, null, 2);
    return this.uploadFile({
      key,
      body: jsonBody,
      contentType: "application/json",
      metadata,
    });
  }

  /**
   * Download and parse a JSON object from S3
   */
  async downloadJson(key: string): Promise<any> {
    const buffer = await this.downloadFile(key);
    const jsonString = buffer.toString("utf-8");
    return JSON.parse(jsonString);
  }
}

// Export singleton instance
export const s3Service = new S3Service();
export default S3Service;
