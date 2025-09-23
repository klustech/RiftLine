variable "name" {
  type    = string
  default = "riftline"
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_ids" {
  type    = list(string)
  default = []
}

variable "node_type" {
  type    = string
  default = "cache.t4g.medium"
}

variable "tags" {
  type    = map(string)
  default = {}
}
