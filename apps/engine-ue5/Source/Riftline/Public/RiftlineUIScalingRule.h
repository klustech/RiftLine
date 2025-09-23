#pragma once

#include "CoreMinimal.h"
#include "Engine/UserInterfaceSettings.h"
#include "RiftlineUIScalingRule.generated.h"

UCLASS()
class RIFTLINE_API URiftlineUIScalingRule : public UDPIScaleRule
{
    GENERATED_BODY()

public:
    URiftlineUIScalingRule();

    virtual float GetDPIScaleBasedOnSize(FIntPoint Size) const override;

private:
    float MinScale;
    float MaxScale;
};
