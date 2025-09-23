variable "region" {
  type    = string
  default = "us-west-2"
}

variable "availability_zones" {
  type    = list(string)
  default = ["us-west-2a", "us-west-2b"]
}

variable "db_username" {
  type    = string
  default = "riftline"
}

variable "db_password" {
  type      = string
  sensitive = true
  default   = "supersecurepassword"
}

variable "load_balancer_name" {
  type = string
  default = "arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/riftline/123"
}
