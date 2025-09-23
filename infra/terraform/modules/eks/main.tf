variable "name" {
  description = "Cluster name prefix"
  type        = string
}

variable "vpc_id" {
  description = "VPC that will host the EKS cluster"
  type        = string
}

variable "private_subnets" {
  description = "Subnet IDs where worker nodes should run"
  type        = list(string)
}

output "cluster_name" {
  description = "Name of the EKS control plane"
  value       = "eks-PLACEHOLDER"
}
