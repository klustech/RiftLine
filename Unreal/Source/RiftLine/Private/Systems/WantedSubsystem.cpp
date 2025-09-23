// SPDX-License-Identifier: MIT

#include "Systems/WantedSubsystem.h"

#include "Engine/World.h"

void UWantedSubsystem::AddStars(int32 Stars)
{
    if (Stars <= 0)
    {
        return;
    }
    SetWanted(WantedLevel + Stars);
}

void UWantedSubsystem::Clear()
{
    SetWanted(0);
}

void UWantedSubsystem::SetWanted(int32 Level)
{
    const int32 ClampedLevel = FMath::Clamp(Level, 0, MaxWantedLevel);
    if (WantedLevel == ClampedLevel)
    {
        ResetDecayTimer();
        return;
    }

    WantedLevel = ClampedLevel;
    OnWantedChanged.Broadcast(WantedLevel);
    ResetDecayTimer();
}

float UWantedSubsystem::TimeToDecay() const
{
    if (WantedLevel <= 0)
    {
        return 0.0f;
    }

    if (const UWorld* World = GetWorld())
    {
        const float SecondsRemaining = NextDecayAt - World->GetTimeSeconds();
        return FMath::Max(0.0f, SecondsRemaining);
    }

    return 0.0f;
}

float UWantedSubsystem::TimeUntilClear() const
{
    if (WantedLevel <= 0)
    {
        return 0.0f;
    }

    const float TimeForCurrentStar = TimeToDecay();
    const int32 RemainingStars = FMath::Max(WantedLevel - 1, 0);
    return TimeForCurrentStar + (RemainingStars * DecaySecondsPerStar);
}

void UWantedSubsystem::Tick(float DeltaSeconds)
{
    if (WantedLevel <= 0)
    {
        return;
    }

    if (const UWorld* World = GetWorld())
    {
        const float Now = World->GetTimeSeconds();
        if (Now >= NextDecayAt && WantedLevel > 0)
        {
            WantedLevel = FMath::Max(WantedLevel - 1, 0);
            OnWantedChanged.Broadcast(WantedLevel);

            if (WantedLevel > 0)
            {
                NextDecayAt = Now + DecaySecondsPerStar;
            }
            else
            {
                NextDecayAt = 0.0f;
            }
        }
    }
}

void UWantedSubsystem::ResetDecayTimer()
{
    if (WantedLevel <= 0)
    {
        NextDecayAt = 0.0f;
        return;
    }

    if (const UWorld* World = GetWorld())
    {
        NextDecayAt = World->GetTimeSeconds() + DecaySecondsPerStar;
    }
    else
    {
        NextDecayAt = 0.0f;
    }
}
