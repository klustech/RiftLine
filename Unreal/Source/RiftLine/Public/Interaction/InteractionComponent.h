// SPDX-License-Identifier: MIT
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "InteractionComponent.generated.h"

UINTERFACE(BlueprintType)
class UInteractable : public UInterface
{
    GENERATED_BODY()
};

class IInteractable
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintNativeEvent, BlueprintCallable)
    TArray<FName> GetContextActions();

    UFUNCTION(BlueprintNativeEvent, BlueprintCallable)
    void PerformAction(FName ActionId, AActor* InstigatorActor);
};

USTRUCT(BlueprintType)
struct FInteractionHit
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    AActor* Actor = nullptr;

    UPROPERTY(BlueprintReadOnly)
    FVector ImpactPoint = FVector::ZeroVector;

    UPROPERTY(BlueprintReadOnly)
    TArray<FName> Actions;
};

UCLASS(ClassGroup = (Custom), meta = (BlueprintSpawnableComponent))
class UInteractionComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction")
    float TraceDistance = 250.f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction")
    TEnumAsByte<ECollisionChannel> Channel = ECC_Visibility;

    UFUNCTION(BlueprintCallable, Category = "Interaction")
    bool FindInteractable(FInteractionHit& OutHit) const;

    UFUNCTION(BlueprintCallable, Category = "Interaction")
    bool InvokeAction(FName ActionId);
};
