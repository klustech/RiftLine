#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "RiftlineTypes.h"
#include "RiftlineHUD.generated.h"

UCLASS()
class RIFTLINE_API ARiftlineHUD : public AHUD
{
    GENERATED_BODY()

public:
    virtual void BeginPlay() override;

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|HUD")
    void OnWantedLevelUpdated(const FRiftlineWantedState& State);

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|HUD")
    void OnComplianceUpdated(const FRiftlineComplianceState& State);

private:
    UFUNCTION()
    void HandleWanted(const FRiftlineWantedState& State);

    UFUNCTION()
    void HandleCompliance(const FRiftlineComplianceState& State);
};
