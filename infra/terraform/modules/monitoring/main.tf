resource "aws_cloudwatch_log_group" "app" {
  name              = "/aws/riftline/${var.name}"
  retention_in_days = var.retention_days
  tags              = var.tags
}

resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${var.name}-api-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = var.latency_threshold
  treat_missing_data  = "notBreaching"
  alarm_description   = "Average latency for API gateway"
  dimensions = {
    LoadBalancer = var.load_balancer_name
  }
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.app.name
}
