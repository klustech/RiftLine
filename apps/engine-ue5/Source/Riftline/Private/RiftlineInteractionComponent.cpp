#include "RiftlineInteractionComponent.h"

#include "GameFramework/Pawn.h"
#include "Engine/World.h"
#include "Engine/EngineTypes.h"

URiftlineInteractionComponent::URiftlineInteractionComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
    TraceDistance = 250.f;
    TraceChannel = ECC_Visibility;
    bAutoInvokeSingleOption = true;
}

APawn* URiftlineInteractionComponent::ResolvePawnOwner() const
{
    return Cast<APawn>(GetOwner());
}

bool URiftlineInteractionComponent::GatherOptions(
    AActor* TargetActor,
    APawn* InstigatorPawn,
    TArray<FRiftlineInteractionOption>& OutOptions
) const
{
    if (!TargetActor || !TargetActor->GetClass()->ImplementsInterface(URiftlineInteractable::StaticClass()))
    {
        return false;
    }

    TArray<FRiftlineInteractionOption> Options;
    IRiftlineInteractable::Execute_GetInteractionOptions(TargetActor, Options, InstigatorPawn);
    Options.RemoveAll([](const FRiftlineInteractionOption& Option) { return Option.Id.IsNone(); });

    if (Options.Num() == 0)
    {
        return false;
    }

    OutOptions = MoveTemp(Options);
    return true;
}

bool URiftlineInteractionComponent::FindInteraction(FRiftlineInteractionHit& OutHit) const
{
    APawn* PawnOwner = ResolvePawnOwner();
    if (!PawnOwner)
    {
        return false;
    }

    FVector ViewLocation;
    FRotator ViewRotation;
    PawnOwner->GetActorEyesViewPoint(ViewLocation, ViewRotation);

    const FVector End = ViewLocation + (ViewRotation.Vector() * TraceDistance);
    FHitResult HitResult;
    FCollisionQueryParams QueryParams(SCENE_QUERY_STAT(RiftlineInteraction), true, PawnOwner);
    QueryParams.AddIgnoredActor(PawnOwner);

    if (!GetWorld() || !GetWorld()->LineTraceSingleByChannel(HitResult, ViewLocation, End, TraceChannel, QueryParams))
    {
        return false;
    }

    TArray<FRiftlineInteractionOption> Options;
    if (!GatherOptions(HitResult.GetActor(), PawnOwner, Options))
    {
        return false;
    }

    OutHit.Actor = HitResult.GetActor();
    OutHit.ImpactPoint = HitResult.ImpactPoint;
    OutHit.Options = Options;

    LastActor = OutHit.Actor;
    LastOptions = OutHit.Options;
    return true;
}

bool URiftlineInteractionComponent::InvokeInteraction(FName OptionId)
{
    APawn* PawnOwner = ResolvePawnOwner();
    if (!PawnOwner)
    {
        return false;
    }

    AActor* TargetActor = LastActor.Get();
    if (!TargetActor)
    {
        FRiftlineInteractionHit Hit;
        if (!FindInteraction(Hit))
        {
            return false;
        }
        TargetActor = Hit.Actor;
    }

    if (!TargetActor || !TargetActor->GetClass()->ImplementsInterface(URiftlineInteractable::StaticClass()))
    {
        return false;
    }

    IRiftlineInteractable::Execute_PerformInteraction(TargetActor, OptionId, PawnOwner);
    return true;
}

bool URiftlineInteractionComponent::TryInteract()
{
    FRiftlineInteractionHit Hit;
    if (!FindInteraction(Hit))
    {
        return false;
    }

    if (bAutoInvokeSingleOption && Hit.Options.Num() == 1)
    {
        return InvokeInteraction(Hit.Options[0].Id);
    }

    OnInteractionOptions.Broadcast(Hit);
    return true;
}
