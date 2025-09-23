#include "RiftlinePawn.h"
#include "Components/CapsuleComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/FloatingPawnMovement.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

ARiftlinePawn::ARiftlinePawn()
{
    PrimaryActorTick.bCanEverTick = false;

    Capsule = CreateDefaultSubobject<UCapsuleComponent>(TEXT("Capsule"));
    Capsule->InitCapsuleSize(42.f, 96.f);
    Capsule->SetCollisionProfileName(TEXT("Pawn"));
    RootComponent = Capsule;

    Movement = CreateDefaultSubobject<UFloatingPawnMovement>(TEXT("Movement"));
    Movement->Acceleration = 4096.f;
    Movement->MaxSpeed = 1200.f;
    Movement->Deceleration = 2048.f;

    SpringArm = CreateDefaultSubobject<USpringArmComponent>(TEXT("SpringArm"));
    SpringArm->SetupAttachment(RootComponent);
    SpringArm->TargetArmLength = 300.f;
    SpringArm->bUsePawnControlRotation = true;

    Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
    Camera->SetupAttachment(SpringArm, USpringArmComponent::SocketName);
    Camera->bUsePawnControlRotation = false;
}

void ARiftlinePawn::BeginPlay()
{
    Super::BeginPlay();
    MovementInput = FVector::ZeroVector;
    LookInput = FVector2D::ZeroVector;
}

void ARiftlinePawn::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    PlayerInputComponent->BindAxis(TEXT("MoveForward"), this, &ARiftlinePawn::MoveForward);
    PlayerInputComponent->BindAxis(TEXT("MoveRight"), this, &ARiftlinePawn::MoveRight);
    PlayerInputComponent->BindAxis(TEXT("LookYaw"), this, &ARiftlinePawn::LookYaw);
    PlayerInputComponent->BindAxis(TEXT("LookPitch"), this, &ARiftlinePawn::LookPitch);
    PlayerInputComponent->BindAction(TEXT("Interact"), IE_Pressed, this, &ARiftlinePawn::OnInteract);
}

void ARiftlinePawn::MoveForward(float Value)
{
    if (Movement && !FMath::IsNearlyZero(Value))
    {
        AddMovementInput(GetActorForwardVector(), Value);
    }
}

void ARiftlinePawn::MoveRight(float Value)
{
    if (Movement && !FMath::IsNearlyZero(Value))
    {
        AddMovementInput(GetActorRightVector(), Value);
    }
}

void ARiftlinePawn::LookYaw(float Value)
{
    if (Controller && !FMath::IsNearlyZero(Value))
    {
        AddControllerYawInput(Value);
    }
}

void ARiftlinePawn::LookPitch(float Value)
{
    if (Controller && !FMath::IsNearlyZero(Value))
    {
        AddControllerPitchInput(Value);
    }
}

void ARiftlinePawn::OnInteract()
{
    if (APlayerController* PC = Cast<APlayerController>(Controller))
    {
        PC->InputKey(FKey(TEXT("Virtual_Click")), IE_Pressed, 1.0f, false);
    }
}
