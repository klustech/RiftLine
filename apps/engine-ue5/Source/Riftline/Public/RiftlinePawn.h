#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "RiftlinePawn.generated.h"

class UCapsuleComponent;
class UCameraComponent;
class USpringArmComponent;
class UFloatingPawnMovement;

UCLASS()
class RIFTLINE_API ARiftlinePawn : public APawn
{
    GENERATED_BODY()

public:
    ARiftlinePawn();

    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
    virtual void BeginPlay() override;

private:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Riftline|Components", meta = (AllowPrivateAccess = "true"))
    UCapsuleComponent* Capsule;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Riftline|Components", meta = (AllowPrivateAccess = "true"))
    USpringArmComponent* SpringArm;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Riftline|Components", meta = (AllowPrivateAccess = "true"))
    UCameraComponent* Camera;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Riftline|Components", meta = (AllowPrivateAccess = "true"))
    UFloatingPawnMovement* Movement;

    FVector MovementInput;
    FVector2D LookInput;

    void MoveForward(float Value);
    void MoveRight(float Value);
    void LookYaw(float Value);
    void LookPitch(float Value);
    void OnInteract();
};
