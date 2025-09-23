terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
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

variable "project" {
  type        = string
  description = "Project prefix applied to shared resources"
  default     = "riftline"
}

variable "environment" {
  type        = string
  description = "Deployment environment tag"
  default     = "dev"
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  tags = {
    Project     = var.project
    Environment = var.environment
  }

  services = {
    api = {
      cpu           = 512
      memory        = 1024
      port_mappings = [{ container_port = 8080, protocol = "tcp" }]
      environment = [
        { name = "RDS_ENDPOINT", value = module.rds.db_instance_endpoint },
        { name = "REDIS_ENDPOINT", value = module.redis.primary_endpoint_address },
        { name = "REGION", value = var.region }
      ]
    }
    nakama = {
      cpu           = 1024
      memory        = 2048
      port_mappings = [
        { container_port = 7350, protocol = "tcp" },
        { container_port = 7351, protocol = "tcp" }
      ]
      environment = [
        { name = "NAKAMA_DATABASE_ENDPOINT", value = module.rds.db_instance_endpoint },
        { name = "REDIS_ENDPOINT", value = module.redis.primary_endpoint_address }
      ]
    }
    bundler = {
      cpu           = 256
      memory        = 512
      port_mappings = [{ container_port = 4337, protocol = "tcp" }]
      environment   = [{ name = "PORT", value = "4337" }]
    }
    paymaster = {
      cpu           = 256
      memory        = 512
      port_mappings = [{ container_port = 3001, protocol = "tcp" }]
      environment   = [{ name = "PORT", value = "3001" }]
    }
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"

  name = "${var.project}-${var.environment}"
  cidr = "10.0.0.0/16"

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  public_subnets  = ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }

  tags = local.tags
}

resource "aws_security_group" "ecs" {
  name        = "${var.project}-ecs"
  description = "Container tasks"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "Internal service traffic"
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    cidr_blocks     = [module.vpc.vpc_cidr_block]
    ipv6_cidr_blocks = []
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}

resource "aws_security_group" "rds" {
  name        = "${var.project}-rds"
  description = "Postgres security group"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description      = "Postgres from ECS"
    from_port        = 5432
    to_port          = 5432
    protocol         = "tcp"
    security_groups  = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}

resource "aws_security_group" "redis" {
  name        = "${var.project}-redis"
  description = "Redis access from ECS"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description      = "Redis from ECS"
    from_port        = 6379
    to_port          = 6379
    protocol         = "tcp"
    security_groups  = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}

resource "random_password" "db_master" {
  length  = 20
  special = false
}

module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.5.4"

  identifier = "${var.project}-db"
  engine     = "postgres"
  engine_version = "16.2"
  family         = "postgres16"

  instance_class            = "db.t4g.small"
  allocated_storage         = 20
  max_allocated_storage     = 100
  db_name                   = "riftline"
  username                  = "riftline_admin"
  password                  = random_password.db_master.result
  port                      = 5432
  multi_az                  = false
  publicly_accessible       = false
  storage_encrypted         = true
  skip_final_snapshot       = true
  backup_retention_period   = 7

  vpc_security_group_ids = [aws_security_group.rds.id]
  subnet_ids             = module.vpc.private_subnets

  tags = local.tags
}

module "redis" {
  source  = "terraform-aws-modules/elasticache/aws"
  version = "5.6.0"

  name                      = "${var.project}-redis"
  engine                    = "redis"
  engine_version            = "7.0"
  node_type                 = "cache.t3.small"
  number_cache_clusters     = 1
  apply_immediately         = true
  automatic_failover_enabled = false

  subnet_ids         = module.vpc.private_subnets
  vpc_id             = module.vpc.vpc_id
  security_group_ids = [aws_security_group.redis.id]

  tags = local.tags
}

resource "aws_ecr_repository" "services" {
  for_each = local.services

  name                 = "${var.project}-${each.key}"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = local.tags
}

resource "aws_iam_role" "ecs_task_execution" {
  name               = "${var.project}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_execution_assume.json
  tags               = local.tags
}

data "aws_iam_policy_document" "ecs_task_execution_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name               = "${var.project}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_execution_assume.json
  tags               = local.tags
}

resource "aws_ecs_cluster" "main" {
  name = "${var.project}-cluster"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = local.tags
}

resource "aws_cloudwatch_log_group" "service" {
  for_each          = local.services
  name              = "/ecs/${var.project}-${each.key}"
  retention_in_days = 30
  tags              = local.tags
}

resource "aws_ecs_task_definition" "service" {
  for_each                 = local.services
  family                   = "${var.project}-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${aws_ecr_repository.services[each.key].repository_url}:latest"
      essential = true
      portMappings = [
        for mapping in each.value.port_mappings : {
          containerPort = mapping.container_port
          hostPort      = mapping.container_port
          protocol      = mapping.protocol
        }
      ]
      environment = [
        for env in lookup(each.value, "environment", []) : {
          name  = env.name
          value = env.value
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.service[each.key].name
          awslogs-region        = var.region
          awslogs-stream-prefix = each.key
        }
      }
    }
  ])

  tags = local.tags
}

resource "aws_ecs_service" "service" {
  for_each            = local.services
  name                = "${var.project}-${each.key}"
  cluster             = aws_ecs_cluster.main.id
  task_definition     = aws_ecs_task_definition.service[each.key].arn
  desired_count       = 1
  launch_type         = "FARGATE"
  propagate_tags      = "SERVICE"
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  tags = local.tags
}
