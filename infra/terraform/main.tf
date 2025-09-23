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
  type    = string
  default = "eu-west-1"
}

module "vpc" {
  source = "./modules/vpc"
  name   = "riftline"
}

module "eks" {
  source = "./modules/eks"
  name   = "riftline"
  vpc_id = module.vpc.note
}

module "rds" {
  source = "./modules/rds"
  name   = "riftline"
  vpc_id = module.vpc.note
}
