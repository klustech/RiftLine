variable "name" {
  type        = string
  description = "Name prefix"
  default     = "riftline"
}

variable "cidr" {
  type        = string
  description = "CIDR for VPC"
  default     = "10.20.0.0/16"
}

variable "public_subnets" {
  type        = list(string)
  description = "Public subnet CIDRs"
}

variable "private_subnets" {
  type        = list(string)
  description = "Private subnet CIDRs"
}

variable "azs" {
  type        = list(string)
  description = "Availability zones"
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply"
  default     = {}
}
