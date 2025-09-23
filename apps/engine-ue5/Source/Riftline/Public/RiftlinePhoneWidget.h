#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "RiftlineTypes.h"
#include "RiftlinePhoneWidget.generated.h"

UCLASS(Abstract, Blueprintable)
class RIFTLINE_API URiftlinePhoneWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    URiftlinePhoneWidget(const FObjectInitializer& ObjectInitializer);

    void HandleSessionUpdated(const FRiftlineSessionProfile& Profile);
    void HandleWantedUpdated(const FRiftlineWantedState& State);
    void HandleComplianceUpdated(const FRiftlineComplianceState& Compliance);
    void HandleShardStatus(const FRiftlineShardStatus& Status);

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|Phone")
    void OnSessionUpdated(const FRiftlineSessionProfile& Profile);

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|Phone")
    void OnWantedChanged(const FRiftlineWantedState& State);

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|Phone")
    void OnComplianceChanged(const FRiftlineComplianceState& Compliance);

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|Phone")
    void OnShardStatusChanged(const FRiftlineShardStatus& Status);

protected:
    UPROPERTY(BlueprintReadOnly, Category = "Riftline|Phone")
    FRiftlineSessionProfile CachedSession;

    UPROPERTY(BlueprintReadOnly, Category = "Riftline|Phone")
    TArray<FRiftlineShardStatus> KnownShards;
};
