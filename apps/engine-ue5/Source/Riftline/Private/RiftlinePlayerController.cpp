#include "RiftlinePlayerController.h"
#include "Blueprint/WidgetBlueprintLibrary.h"
#include "RiftlineGameInstance.h"
#include "RiftlinePhoneWidget.h"

ARiftlinePlayerController::ARiftlinePlayerController()
{
    bShowMouseCursor = true;
    bEnableClickEvents = true;
    bEnableTouchEvents = true;
    bPhoneVisible = false;
    PhoneWidget = nullptr;
}

void ARiftlinePlayerController::BeginPlay()
{
    Super::BeginPlay();

    if (!PhoneWidgetClass)
    {
        PhoneWidgetClass = URiftlinePhoneWidget::StaticClass();
    }

    if (PhoneWidgetClass)
    {
        PhoneWidget = CreateWidget<URiftlinePhoneWidget>(this, PhoneWidgetClass);
        if (PhoneWidget)
        {
            PhoneWidget->AddToViewport(10);
            PhoneWidget->SetVisibility(ESlateVisibility::Collapsed);

            if (URiftlineGameInstance* GI = GetWorld() ? GetWorld()->GetGameInstance<URiftlineGameInstance>() : nullptr)
            {
                GI->RegisterPhoneWidget(PhoneWidget);
            }
        }
    }

    UpdateInputMode();
}

void ARiftlinePlayerController::SetupInputComponent()
{
    Super::SetupInputComponent();
    InputComponent->BindAction(TEXT("TogglePhone"), IE_Pressed, this, &ARiftlinePlayerController::TogglePhone);
    InputComponent->BindAction(TEXT("Map"), IE_Pressed, this, &ARiftlinePlayerController::OpenMap);
}

void ARiftlinePlayerController::TogglePhone()
{
    bPhoneVisible = !bPhoneVisible;
    if (PhoneWidget)
    {
        PhoneWidget->SetVisibility(bPhoneVisible ? ESlateVisibility::Visible : ESlateVisibility::Collapsed);
    }
    UpdateInputMode();
}

void ARiftlinePlayerController::OpenMap()
{
    if (URiftlineGameInstance* GI = GetWorld() ? GetWorld()->GetGameInstance<URiftlineGameInstance>() : nullptr)
    {
        TMap<FString, FString> Properties;
        Properties.Add(TEXT("source"), TEXT("phone"));
        GI->PushTelemetryEvent(TEXT("open_map"), Properties);
    }
}

void ARiftlinePlayerController::UpdateInputMode()
{
    if (bPhoneVisible)
    {
        FInputModeGameAndUI Mode;
        Mode.SetHideCursorDuringCapture(false);
        Mode.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);
        SetInputMode(Mode);
        SetShowMouseCursor(true);
    }
    else
    {
        FInputModeGameOnly Mode;
        SetInputMode(Mode);
        SetShowMouseCursor(false);
    }
}
