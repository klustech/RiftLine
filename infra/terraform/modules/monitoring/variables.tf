variable "name" {
  type    = string
  default = "riftline"
}

variable "retention_days" {
  type    = number
  default = 14
}

variable "latency_threshold" {
  type    = number
  default = 0.35
}

variable "load_balancer_name" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
