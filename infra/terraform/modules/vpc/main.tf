variable "name" {}
variable "cidr" {
  default = "10.0.0.0/16"
}

output "note" {
  value = "Create VPC, subnets, and gateways here"
}
