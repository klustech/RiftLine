// SPDX-License-Identifier: MIT
#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "PhoneWidget.generated.h"

USTRUCT(BlueprintType)
struct FWalletView
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString Address;

    UPROPERTY(BlueprintReadOnly)
    int32 SoftCurrency = 0;

    UPROPERTY(BlueprintReadOnly)
    int32 WantedMinutes = 0;

    UPROPERTY(BlueprintReadOnly)
    int32 ShardId = 0;
};

UCLASS(BlueprintType)
class UPhoneWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintImplementableEvent)
    void OnMissionsUpdated(const TArray<FText>& Missions);

    UFUNCTION(BlueprintImplementableEvent)
    void OnWalletUpdated(const FWalletView& Wallet);

    UFUNCTION(BlueprintImplementableEvent)
    void OnShardStatus(int32 ShardId, const FText& ShardName, int32 Population);
};
