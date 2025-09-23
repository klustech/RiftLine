#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "RiftlineTypes.h"
#include "RiftlineHUD.generated.h"

class URiftlineHUDWidget;
class URiftlineInteractionComponent;
struct FRiftlineInteractionHit;

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

protected:
    UPROPERTY(EditDefaultsOnly, Category = "Riftline|HUD")
    TSubclassOf<URiftlineHUDWidget> HUDWidgetClass;

private:
    UPROPERTY(Transient)
    URiftlineHUDWidget* HUDWidget;

    TWeakObjectPtr<URiftlineInteractionComponent> InteractionComponent;

    UFUNCTION()
    void HandleWanted(const FRiftlineWantedState& State);

    UFUNCTION()
    void HandleCompliance(const FRiftlineComplianceState& State);

    UFUNCTION()
    void HandlePawnChanged(APawn* NewPawn);

    UFUNCTION()
    void HandleInteractionOptions(const FRiftlineInteractionHit& Hit);

    UFUNCTION()
    void HandleRadialEntrySelected(FName EntryId);
};
