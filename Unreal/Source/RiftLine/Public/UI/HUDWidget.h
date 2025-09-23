// SPDX-License-Identifier: MIT
#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "HUDWidget.generated.h"

/**
 * Base HUD widget that exposes Blueprint events for wanted and streaming updates.
 * Concrete UMG blueprints can implement the events to drive visuals without
 * needing to subclass in C++ again.
 */
UCLASS(Abstract, Blueprintable)
class UHUDWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintImplementableEvent, Category = "HUD")
    void OnWantedLevelChanged(int32 NewLevel);

    UFUNCTION(BlueprintImplementableEvent, Category = "HUD")
    void OnWantedTimerUpdated(float SecondsUntilDecay, float SecondsUntilClear);

    UFUNCTION(BlueprintImplementableEvent, Category = "HUD")
    void OnStreamingStateChanged(FName NewState);

    UFUNCTION(BlueprintImplementableEvent, Category = "HUD")
    void OnStreamingOverlayToggled(bool bVisible);
};
