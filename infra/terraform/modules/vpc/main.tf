variable "name" {
  description = "Project prefix applied to VPC resources"
  type        = string
}

variable "cidr" {
  description = "Primary CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Placeholder outputs so environments depending on this module can wire up
# downstream resources before the concrete implementation lands.
output "vpc_id" {
  description = "Identifier of the provisioned VPC"
  value       = "vpc-PLACEHOLDER"
}

output "private_subnets" {
  description = "Private subnet IDs for cluster workloads"
  value       = ["subnet-a", "subnet-b"]
}

output "public_subnets" {
  description = "Public subnet IDs for ingress"
  value       = ["subnet-c", "subnet-d"]
}
