variable "name" {
  description = "Identifier prefix for the database instance"
  type        = string
}

variable "vpc_id" {
  description = "VPC that exposes the database"
  type        = string
}

variable "private_subnets" {
  description = "Subnet IDs used by the database subnet group"
  type        = list(string)
}

output "rds_endpoint" {
  description = "Connection endpoint for application services"
  value       = "rds://placeholder"
}
