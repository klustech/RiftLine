#include "RiftlineUIScalingRule.h"

URiftlineUIScalingRule::URiftlineUIScalingRule()
{
    MinScale = 0.75f;
    MaxScale = 1.35f;
}

float URiftlineUIScalingRule::GetDPIScaleBasedOnSize(FIntPoint Size) const
{
    const float Shorter = static_cast<float>(FMath::Min(Size.X, Size.Y));
    const float Longer = static_cast<float>(FMath::Max(Size.X, Size.Y));
    const float Aspect = Longer / FMath::Max(Shorter, 1.0f);

    float BaseScale = Shorter / 1280.f;
    if (Aspect > 2.0f)
    {
        BaseScale *= 1.1f;
    }
    if (Aspect < 1.5f)
    {
        BaseScale *= 0.95f;
    }

    return FMath::Clamp(BaseScale, MinScale, MaxScale);
}
