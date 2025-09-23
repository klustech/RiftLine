variable "name" {
  type        = string
  default     = "riftline"
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_ids" {
  type    = list(string)
  default = []
}

variable "engine_version" {
  type    = string
  default = "15.4"
}

variable "instance_class" {
  type    = string
  default = "db.t4g.medium"
}

variable "allocated_storage" {
  type    = number
  default = 100
}

variable "username" {
  type = string
}

variable "password" {
  type      = string
  sensitive = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
