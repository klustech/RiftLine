// SPDX-License-Identifier: MIT
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "ShardStreamingSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnShardStreamingStateChanged, FName, State);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnShardStreamingOverlayChanged, bool, bVisible);

/**
 * Simple state machine to coordinate shard streaming overlays across Blueprints.
 * Gameplay code can drive the transfer lifecycle while UI listens for the
 * broadcasted state transitions.
 */
UCLASS(BlueprintType)
class UShardStreamingSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    /** Event fired whenever the streaming state changes. */
    UPROPERTY(BlueprintAssignable, Category = "Streaming")
    FOnShardStreamingStateChanged OnStateChanged;

    /** Event fired when the overlay visibility toggles. */
    UPROPERTY(BlueprintAssignable, Category = "Streaming")
    FOnShardStreamingOverlayChanged OnOverlayVisibilityChanged;

    /** Human friendly state for UMG bindings (Pending/Streaming/Committed/Finalized/Failed). */
    UPROPERTY(BlueprintReadOnly, Category = "Streaming")
    FName CurrentState = FName(TEXT("Finalized"));

    /** Whether the streaming overlay should be visible. */
    UPROPERTY(BlueprintReadOnly, Category = "Streaming")
    bool bOverlayVisible = false;

    UFUNCTION(BlueprintCallable, Category = "Streaming")
    void BeginTransfer() { SetState(FName(TEXT("Pending"))); ShowOverlay(); }

    UFUNCTION(BlueprintCallable, Category = "Streaming")
    void BeginStreaming() { SetState(FName(TEXT("Streaming"))); }

    UFUNCTION(BlueprintCallable, Category = "Streaming")
    void Commit() { SetState(FName(TEXT("Committed"))); }

    UFUNCTION(BlueprintCallable, Category = "Streaming")
    void Finalize() { SetState(FName(TEXT("Finalized"))); HideOverlay(); }

    UFUNCTION(BlueprintCallable, Category = "Streaming")
    void Fail() { SetState(FName(TEXT("Failed"))); ShowOverlay(); }

    UFUNCTION(BlueprintCallable, Category = "Streaming")
    void SetState(FName NewState)
    {
        if (CurrentState != NewState)
        {
            CurrentState = NewState;
            OnStateChanged.Broadcast(CurrentState);
        }
    }

    UFUNCTION(BlueprintCallable, Category = "Streaming")
    void ShowOverlay()
    {
        if (!bOverlayVisible)
        {
            bOverlayVisible = true;
            OnOverlayVisibilityChanged.Broadcast(true);
        }
    }

    UFUNCTION(BlueprintCallable, Category = "Streaming")
    void HideOverlay()
    {
        if (bOverlayVisible)
        {
            bOverlayVisible = false;
            OnOverlayVisibilityChanged.Broadcast(false);
        }
    }
};
