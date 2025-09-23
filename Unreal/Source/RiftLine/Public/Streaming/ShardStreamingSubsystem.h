// SPDX-License-Identifier: MIT
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "ShardStreamingSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnShardStreamingStateChanged, FName, State);

UCLASS(BlueprintType)
class UShardStreamingSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintAssignable)
    FOnShardStreamingStateChanged OnStateChanged;

    UFUNCTION(BlueprintCallable)
    void SetState(FName NewState)
    {
        OnStateChanged.Broadcast(NewState);
    }

    UFUNCTION(BlueprintCallable)
    void ShowOverlay() {}

    UFUNCTION(BlueprintCallable)
    void HideOverlay() {}
};
