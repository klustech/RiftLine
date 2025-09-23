terraform {
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

variable "region" {
  type        = string
  description = "AWS region for the stack"
  default     = "eu-west-1"
}

module "vpc" {
  source = "./modules/vpc"
  name   = "riftline"
}

module "eks" {
  source          = "./modules/eks"
  name            = "riftline"
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
}

module "rds" {
  source          = "./modules/rds"
  name            = "riftline"
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
}

output "notes" {
  description = "Guidance for replacing the placeholder infrastructure pieces"
  value       = "Swap the module stubs with real VPC/EKS/RDS implementations or reference community modules before deploying."
}
