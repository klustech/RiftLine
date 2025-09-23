#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Engine/EngineTypes.h"
#include "RiftlineInteractionComponent.generated.h"

class APawn;

USTRUCT(BlueprintType)
struct FRiftlineInteractionOption
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Riftline|Interaction")
    FName Id;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Riftline|Interaction")
    FText Label;
};

USTRUCT(BlueprintType)
struct FRiftlineInteractionHit
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Riftline|Interaction")
    AActor* Actor = nullptr;

    UPROPERTY(BlueprintReadOnly, Category = "Riftline|Interaction")
    FVector ImpactPoint = FVector::ZeroVector;

    UPROPERTY(BlueprintReadOnly, Category = "Riftline|Interaction")
    TArray<FRiftlineInteractionOption> Options;
};

UINTERFACE(BlueprintType)
class URiftlineInteractable : public UInterface
{
    GENERATED_BODY()
};

class IRiftlineInteractable
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Riftline|Interaction")
    void GetInteractionOptions(UPARAM(ref) TArray<FRiftlineInteractionOption>& Options, APawn* RequestingPawn) const;

    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Riftline|Interaction")
    void PerformInteraction(FName OptionId, APawn* RequestingPawn);
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FRiftlineInteractionOptionsDelegate, const FRiftlineInteractionHit&, Hit);

UCLASS(ClassGroup = (Riftline), meta = (BlueprintSpawnableComponent))
class RIFTLINE_API URiftlineInteractionComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    URiftlineInteractionComponent();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Riftline|Interaction")
    float TraceDistance;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Riftline|Interaction")
    TEnumAsByte<ECollisionChannel> TraceChannel;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Riftline|Interaction")
    bool bAutoInvokeSingleOption;

    UPROPERTY(BlueprintAssignable, Category = "Riftline|Interaction")
    FRiftlineInteractionOptionsDelegate OnInteractionOptions;

    UFUNCTION(BlueprintCallable, Category = "Riftline|Interaction")
    bool FindInteraction(FRiftlineInteractionHit& OutHit) const;

    UFUNCTION(BlueprintCallable, Category = "Riftline|Interaction")
    bool InvokeInteraction(FName OptionId);

    UFUNCTION(BlueprintCallable, Category = "Riftline|Interaction")
    bool TryInteract();

private:
    TWeakObjectPtr<AActor> LastActor;
    TArray<FRiftlineInteractionOption> LastOptions;

    APawn* ResolvePawnOwner() const;
    bool GatherOptions(AActor* TargetActor, APawn* InstigatorPawn, TArray<FRiftlineInteractionOption>& OutOptions) const;
};
