// SPDX-License-Identifier: MIT
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "Tickable.h"
#include "WantedSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnWantedLevelChanged, int32, NewLevel);

/**
 * Tracks a player's wanted level within the session and drives HUD updates.
 * The subsystem decays the wanted level over time and exposes Blueprint events
 * so UI layers can react without having to poll gameplay code.
 */
UCLASS(BlueprintType)
class UWantedSubsystem : public UGameInstanceSubsystem, public FTickableGameObject
{
    GENERATED_BODY()

public:
    /** Fired whenever the wanted level changes. */
    UPROPERTY(BlueprintAssignable, Category = "Wanted")
    FOnWantedLevelChanged OnWantedChanged;

    /** Current wanted level (0-5). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Wanted")
    int32 WantedLevel = 0;

    /** Maximum number of wanted stars supported by the subsystem. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Wanted")
    int32 MaxWantedLevel = 5;

    /** Seconds required before a single star decays. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Wanted")
    float DecaySecondsPerStar = 60.0f;

    /** Increment the wanted level by the supplied star count. */
    UFUNCTION(BlueprintCallable, Category = "Wanted")
    void AddStars(int32 Stars);

    /** Clear the wanted level immediately. */
    UFUNCTION(BlueprintCallable, Category = "Wanted")
    void Clear();

    /** Manually set the wanted level. Value is clamped between 0 and MaxWantedLevel. */
    UFUNCTION(BlueprintCallable, Category = "Wanted")
    void SetWanted(int32 Level);

    /** Seconds remaining until the next wanted star decays. */
    UFUNCTION(BlueprintCallable, Category = "Wanted")
    float TimeToDecay() const;

    /** Approximate time in seconds until the wanted meter fully clears. */
    UFUNCTION(BlueprintCallable, Category = "Wanted")
    float TimeUntilClear() const;

    // FTickableGameObject interface
    virtual void Tick(float DeltaSeconds) override;
    virtual bool IsTickable() const override { return true; }
    virtual TStatId GetStatId() const override { RETURN_QUICK_DECLARE_CYCLE_STAT(UWantedSubsystem, STATGROUP_Tickables); }
    virtual UWorld* GetTickableGameObjectWorld() const override { return GetWorld(); }

    virtual bool ShouldCreateSubsystem(UObject* Outer) const override { return true; }

private:
    void ResetDecayTimer();

    /** Game time (in seconds) when the next decay should happen. */
    float NextDecayAt = 0.0f;
};
