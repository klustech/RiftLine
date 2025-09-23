terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

locals {
  tags = {
    Project = "Riftline"
    Environment = "dev"
  }
}

module "network" {
  source          = "../../modules/network"
  name            = "riftline-dev"
  cidr            = "10.30.0.0/16"
  public_subnets  = ["10.30.0.0/20", "10.30.16.0/20"]
  private_subnets = ["10.30.32.0/20", "10.30.48.0/20"]
  azs             = var.availability_zones
  tags            = local.tags
}

module "eks" {
  source           = "../../modules/eks"
  name             = "riftline-dev"
  subnet_ids       = module.network.private_subnet_ids
  desired_capacity = 2
  min_capacity     = 1
  max_capacity     = 3
  tags             = local.tags
}

module "database" {
  source              = "../../modules/database"
  name                = "riftline-dev"
  subnet_ids          = module.network.private_subnet_ids
  username            = var.db_username
  password            = var.db_password
  security_group_ids  = []
  allocated_storage   = 50
  instance_class      = "db.t4g.small"
  tags                = local.tags
}

module "redis" {
  source              = "../../modules/redis"
  name                = "riftline-dev"
  subnet_ids          = module.network.private_subnet_ids
  security_group_ids  = []
  tags                = local.tags
}

module "monitoring" {
  source              = "../../modules/monitoring"
  name                = "riftline-dev"
  load_balancer_name  = var.load_balancer_name
  tags                = local.tags
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "database_endpoint" {
  value = module.database.endpoint
}

output "redis_endpoint" {
  value = module.redis.redis_endpoint
}
