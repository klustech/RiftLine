variable "name" {
  type        = string
  description = "Cluster name prefix"
  default     = "riftline"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnets for the cluster"
}

variable "desired_capacity" {
  type        = number
  default     = 2
}

variable "min_capacity" {
  type        = number
  default     = 1
}

variable "max_capacity" {
  type        = number
  default     = 4
}

variable "tags" {
  type        = map(string)
  default     = {}
}
