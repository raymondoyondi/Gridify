terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment to use remote state
  # backend "s3" {
  #   bucket         = "gridify-terraform-state"
  #   key            = "gridify/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Gridify"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# VPC and Networking
resource "aws_vpc" "gridify" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "gridify-vpc"
  }
}

resource "aws_internet_gateway" "gridify" {
  vpc_id = aws_vpc.gridify.id

  tags = {
    Name = "gridify-igw"
  }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.gridify.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "gridify-public-${count.index + 1}"
  }
}

resource "aws_subnet" "private" {
  count              = 2
  vpc_id             = aws_vpc.gridify.id
  cidr_block         = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone  = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "gridify-private-${count.index + 1}"
  }
}

# RDS PostgreSQL Database
resource "aws_db_instance" "gridify" {
  identifier     = "gridify-db"
  engine         = "postgres"
  engine_version = "15.3"
  
  allocated_storage    = var.db_allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true
  
  db_name  = "gridify"
  username = "gridify"
  password = var.db_password
  
  instance_class = var.db_instance_class
  
  publicly_accessible            = false
  skip_final_snapshot            = var.skip_final_snapshot
  final_snapshot_identifier      = "gridify-db-snapshot-${timestamp()}"
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  db_subnet_group_name   = aws_db_subnet_group.gridify.name
  vpc_security_group_ids = [aws_security_group.db.id]
  
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"
  
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  
  tags = {
    Name = "gridify-postgres"
  }
}

resource "aws_db_subnet_group" "gridify" {
  name       = "gridify-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "gridify-db-subnet-group"
  }
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "gridify" {
  cluster_id           = "gridify-redis"
  engine               = "redis"
  node_type            = var.redis_node_type
  num_cache_nodes      = var.redis_num_nodes
  parameter_group_name = aws_elasticache_parameter_group.gridify.name
  engine_version       = "7.0"
  port                 = 6379
  
  subnet_group_name          = aws_elasticache_subnet_group.gridify.name
  security_group_ids         = [aws_security_group.redis.id]
  automatic_failover_enabled = true
  multi_az_enabled           = true
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  snapshot_retention_limit = 5
  snapshot_window          = "03:00-05:00"
  
  logs {
    cloudwatch_logs_enabled = true
    log_delivery_config {
      cloudwatch_logs_group_name = aws_cloudwatch_log_group.redis.name
      destination_type           = "cloudwatch-logs"
      log_format                 = "json"
    }
  }

  tags = {
    Name = "gridify-redis"
  }
}

resource "aws_elasticache_parameter_group" "gridify" {
  family = "redis7"
  name   = "gridify-redis-params"
}

resource "aws_elasticache_subnet_group" "gridify" {
  name       = "gridify-redis-subnet"
  subnet_ids = aws_subnet.private[*].id
}

# S3 Bucket for data storage
resource "aws_s3_bucket" "gridify_data" {
  bucket = "gridify-data-${var.aws_account_id}-${var.aws_region}"

  tags = {
    Name = "gridify-data-bucket"
  }
}

resource "aws_s3_bucket_versioning" "gridify_data" {
  bucket = aws_s3_bucket.gridify_data.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "gridify_data" {
  bucket = aws_s3_bucket.gridify_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "gridify_data" {
  bucket = aws_s3_bucket.gridify_data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudWatch Logs
resource "aws_cloudwatch_log_group" "app" {
  name              = "/gridify/app"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "redis" {
  name              = "/gridify/redis"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "database" {
  name              = "/gridify/database"
  retention_in_days = 7
}

# Security Groups
resource "aws_security_group" "db" {
  name_prefix = "gridify-db-"
  vpc_id      = aws_vpc.gridify.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "gridify-db-sg"
  }
}

resource "aws_security_group" "redis" {
  name_prefix = "gridify-redis-"
  vpc_id      = aws_vpc.gridify.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "gridify-redis-sg"
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# Outputs
output "rds_endpoint" {
  value       = aws_db_instance.gridify.endpoint
  description = "RDS database endpoint"
}

output "redis_endpoint" {
  value       = aws_elasticache_cluster.gridify.cache_nodes[0].address
  description = "Redis endpoint"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.gridify_data.id
  description = "S3 bucket name"
}

output "vpc_id" {
  value       = aws_vpc.gridify.id
  description = "VPC ID"
}
