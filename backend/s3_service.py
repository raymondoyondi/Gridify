"""
AWS S3 Service for Python backend integration.
Handles file uploads, downloads, deletions, and presigned URL generation.
"""

import boto3
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from botocore.exceptions import ClientError
from dotenv import load_dotenv
import os

load_dotenv()

logger = logging.getLogger(__name__)


class S3Service:
    """
    Service class for managing AWS S3 operations.
    Provides methods for uploading, downloading, and managing files in S3.
    """

    def __init__(
        self,
        region_name: str = None,
        aws_access_key_id: str = None,
        aws_secret_access_key: str = None,
        bucket_name: str = None,
    ):
        """
        Initialize S3 service with AWS credentials.

        Args:
            region_name: AWS region (defaults to env var AWS_REGION)
            aws_access_key_id: AWS access key (defaults to env var AWS_ACCESS_KEY_ID)
            aws_secret_access_key: AWS secret key (defaults to env var AWS_SECRET_ACCESS_KEY)
            bucket_name: S3 bucket name (defaults to env var AWS_S3_BUCKET)
        """
        self.region_name = region_name or os.getenv("AWS_REGION", "us-east-1")
        self.aws_access_key_id = aws_access_key_id or os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_access_key = aws_secret_access_key or os.getenv("AWS_SECRET_ACCESS_KEY")
        self.bucket_name = bucket_name or os.getenv("AWS_S3_BUCKET")

        # Validate configuration
        if not self.aws_access_key_id or self.aws_access_key_id == "YOUR_AWS_ACCESS_KEY":
            logger.warning("AWS_ACCESS_KEY_ID is not configured or uses placeholder value.")
            self.s3_client = None
            return

        if not self.aws_secret_access_key or self.aws_secret_access_key == "YOUR_AWS_SECRET_KEY":
            logger.warning("AWS_SECRET_ACCESS_KEY is not configured or uses placeholder value.")
            self.s3_client = None
            return

        if not self.bucket_name or self.bucket_name == "your-gridify-bucket":
            logger.warning("AWS_S3_BUCKET is not configured or uses placeholder value.")
            self.s3_client = None
            return

        try:
            self.s3_client = boto3.client(
                "s3",
                region_name=self.region_name,
                aws_access_key_id=self.aws_access_key_id,
                aws_secret_access_key=self.aws_secret_access_key,
            )
            logger.info(f"S3 Service initialized with bucket: {self.bucket_name} in region: {self.region_name}")
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            self.s3_client = None

    def upload_file(
        self,
        file_path: str,
        s3_key: str,
        metadata: Optional[Dict[str, str]] = None,
        content_type: str = "application/octet-stream",
    ) -> Dict[str, Any]:
        """
        Upload a file to S3.

        Args:
            file_path: Local file path
            s3_key: S3 object key
            metadata: Optional metadata dictionary
            content_type: MIME type of the file

        Returns:
            Dictionary with upload details

        Raises:
            Exception: If upload fails
        """
        if not self.s3_client:
            raise Exception("S3 client is not initialized. Check your AWS credentials.")

        try:
            extra_args = {"ContentType": content_type}
            if metadata:
                extra_args["Metadata"] = metadata

            self.s3_client.upload_file(file_path, self.bucket_name, s3_key, ExtraArgs=extra_args)
            logger.info(f"File uploaded to S3: s3://{self.bucket_name}/{s3_key}")

            return {
                "bucket": self.bucket_name,
                "key": s3_key,
                "url": f"s3://{self.bucket_name}/{s3_key}",
                "file_path": file_path,
            }
        except ClientError as e:
            logger.error(f"Error uploading file to S3: {e}")
            raise Exception(f"Failed to upload file: {s3_key}")

    def upload_data(
        self,
        data: bytes,
        s3_key: str,
        metadata: Optional[Dict[str, str]] = None,
        content_type: str = "application/octet-stream",
    ) -> Dict[str, Any]:
        """
        Upload binary data directly to S3.

        Args:
            data: Binary data to upload
            s3_key: S3 object key
            metadata: Optional metadata dictionary
            content_type: MIME type

        Returns:
            Dictionary with upload details
        """
        if not self.s3_client:
            raise Exception("S3 client is not initialized. Check your AWS credentials.")

        try:
            extra_args = {"ContentType": content_type}
            if metadata:
                extra_args["Metadata"] = metadata

            self.s3_client.put_object(
                Bucket=self.bucket_name, Key=s3_key, Body=data, **extra_args
            )
            logger.info(f"Data uploaded to S3: s3://{self.bucket_name}/{s3_key}")

            return {
                "bucket": self.bucket_name,
                "key": s3_key,
                "url": f"s3://{self.bucket_name}/{s3_key}",
                "size": len(data),
            }
        except ClientError as e:
            logger.error(f"Error uploading data to S3: {e}")
            raise Exception(f"Failed to upload data: {s3_key}")

    def download_file(self, s3_key: str, file_path: str) -> Dict[str, Any]:
        """
        Download a file from S3.

        Args:
            s3_key: S3 object key
            file_path: Local file path to save to

        Returns:
            Dictionary with download details
        """
        if not self.s3_client:
            raise Exception("S3 client is not initialized. Check your AWS credentials.")

        try:
            self.s3_client.download_file(self.bucket_name, s3_key, file_path)
            logger.info(f"File downloaded from S3: {file_path}")

            return {
                "bucket": self.bucket_name,
                "key": s3_key,
                "file_path": file_path,
            }
        except ClientError as e:
            logger.error(f"Error downloading file from S3: {e}")
            raise Exception(f"Failed to download file: {s3_key}")

    def download_data(self, s3_key: str) -> bytes:
        """
        Download data from S3 as bytes.

        Args:
            s3_key: S3 object key

        Returns:
            Binary data
        """
        if not self.s3_client:
            raise Exception("S3 client is not initialized. Check your AWS credentials.")

        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            data = response["Body"].read()
            logger.info(f"Data downloaded from S3: {s3_key}")
            return data
        except ClientError as e:
            logger.error(f"Error downloading data from S3: {e}")
            raise Exception(f"Failed to download data: {s3_key}")

    def delete_file(self, s3_key: str) -> Dict[str, Any]:
        """
        Delete a file from S3.

        Args:
            s3_key: S3 object key

        Returns:
            Dictionary with deletion details
        """
        if not self.s3_client:
            raise Exception("S3 client is not initialized. Check your AWS credentials.")

        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"File deleted from S3: {s3_key}")

            return {
                "bucket": self.bucket_name,
                "key": s3_key,
                "status": "deleted",
            }
        except ClientError as e:
            logger.error(f"Error deleting file from S3: {e}")
            raise Exception(f"Failed to delete file: {s3_key}")

    def get_presigned_url(self, s3_key: str, expiration: int = 3600) -> str:
        """
        Generate a presigned URL for temporary access.

        Args:
            s3_key: S3 object key
            expiration: URL expiration time in seconds (default: 1 hour)

        Returns:
            Presigned URL string
        """
        if not self.s3_client:
            raise Exception("S3 client is not initialized. Check your AWS credentials.")

        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": s3_key},
                ExpiresIn=expiration,
            )
            logger.info(f"Presigned URL generated for: {s3_key}")
            return url
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            raise Exception(f"Failed to generate presigned URL: {s3_key}")

    def list_objects(self, prefix: str = "", max_keys: int = 1000) -> Dict[str, Any]:
        """
        List objects in S3 bucket with optional prefix.

        Args:
            prefix: Optional prefix to filter objects
            max_keys: Maximum number of keys to return

        Returns:
            Dictionary with list of objects
        """
        if not self.s3_client:
            raise Exception("S3 client is not initialized. Check your AWS credentials.")

        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name, Prefix=prefix, MaxKeys=max_keys
            )

            objects = []
            if "Contents" in response:
                objects = [
                    {
                        "key": obj["Key"],
                        "size": obj["Size"],
                        "last_modified": obj["LastModified"].isoformat(),
                    }
                    for obj in response["Contents"]
                ]

            return {
                "bucket": self.bucket_name,
                "prefix": prefix,
                "objects": objects,
                "count": len(objects),
                "is_truncated": response.get("IsTruncated", False),
            }
        except ClientError as e:
            logger.error(f"Error listing objects in S3: {e}")
            raise Exception(f"Failed to list objects with prefix: {prefix}")

    def object_exists(self, s3_key: str) -> bool:
        """
        Check if an object exists in S3.

        Args:
            s3_key: S3 object key

        Returns:
            True if object exists, False otherwise
        """
        if not self.s3_client:
            return False

        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            logger.error(f"Error checking object existence: {e}")
            raise Exception(f"Failed to check object existence: {s3_key}")

    def upload_json(
        self, s3_key: str, data: dict, metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Upload a JSON object directly to S3.

        Args:
            s3_key: S3 object key
            data: Dictionary to upload as JSON
            metadata: Optional metadata

        Returns:
            Dictionary with upload details
        """
        json_data = json.dumps(data, indent=2, default=str).encode("utf-8")
        return self.upload_data(json_data, s3_key, metadata, "application/json")

    def download_json(self, s3_key: str) -> dict:
        """
        Download and parse a JSON object from S3.

        Args:
            s3_key: S3 object key

        Returns:
            Parsed JSON as dictionary
        """
        data = self.download_data(s3_key)
        return json.loads(data.decode("utf-8"))


# Create singleton instance
_s3_service = None


def get_s3_service() -> S3Service:
    """
    Get or create the S3 service singleton instance.

    Returns:
        S3Service instance
    """
    global _s3_service
    if _s3_service is None:
        _s3_service = S3Service()
    return _s3_service
