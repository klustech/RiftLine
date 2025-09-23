// SPDX-License-Identifier: MIT
#include "Interaction/InteractionComponent.h"

#include "Engine/World.h"
#include "GameFramework/Actor.h"
#include "GameFramework/Pawn.h"

bool UInteractionComponent::FindInteractable(FInteractionHit& OutHit) const
{
    const APawn* Pawn = Cast<APawn>(GetOwner());
    if (!Pawn)
    {
        return false;
    }

    FVector Start;
    FRotator Rot;
    Pawn->GetActorEyesViewPoint(Start, Rot);
    const FVector End = Start + Rot.Vector() * TraceDistance;

    FHitResult HitResult;
    FCollisionQueryParams Params(NAME_None, false, GetOwner());
    const bool bHit = GetWorld()->LineTraceSingleByChannel(HitResult, Start, End, Channel, Params);
    if (!bHit)
    {
        return false;
    }

    AActor* const HitActor = HitResult.GetActor();
    if (!HitActor || !HitActor->GetClass()->ImplementsInterface(UInteractable::StaticClass()))
    {
        return false;
    }

    OutHit.Actor = HitActor;
    OutHit.ImpactPoint = HitResult.ImpactPoint;
    TArray<FName> Actions;
    IInteractable::Execute_GetContextActions(HitActor, Actions);
    OutHit.Actions = Actions;
    return true;
}

bool UInteractionComponent::InvokeAction(FName ActionId)
{
    FInteractionHit Hit;
    if (!FindInteractable(Hit) || !Hit.Actor)
    {
        return false;
    }

    IInteractable::Execute_PerformAction(Hit.Actor, ActionId, GetOwner());
    return true;
}
