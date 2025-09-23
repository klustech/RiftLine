#include "RiftlinePlayerController.h"

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

            PhoneWidget->NotifyPhoneVisible(false);
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
    SetPhoneVisibility(!bPhoneVisible, TEXT("toggle"));
}

void ARiftlinePlayerController::OpenMap()
{
    SetPhoneVisibility(true, TEXT("map_key"));

    if (PhoneWidget)
    {
        PhoneWidget->SetActiveTab(ERiftlinePhoneTab::Map);
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

void ARiftlinePlayerController::SetPhoneVisibility(bool bVisible, const FString& SourceTag)
{
    if (bPhoneVisible == bVisible)
    {
        if (PhoneWidget)
        {
            PhoneWidget->SetVisibility(bVisible ? ESlateVisibility::SelfHitTestInvisible : ESlateVisibility::Collapsed);
        }
        return;
    }

    bPhoneVisible = bVisible;

    if (PhoneWidget)
    {
        PhoneWidget->SetVisibility(bPhoneVisible ? ESlateVisibility::SelfHitTestInvisible : ESlateVisibility::Collapsed);
        PhoneWidget->NotifyPhoneVisible(bPhoneVisible);
    }

    UpdateInputMode();

    if (URiftlineGameInstance* GI = GetWorld() ? GetWorld()->GetGameInstance<URiftlineGameInstance>() : nullptr)
    {
        TMap<FString, FString> Properties;
        if (!SourceTag.IsEmpty())
        {
            Properties.Add(TEXT("source"), SourceTag);
        }
        GI->PushTelemetryEvent(bPhoneVisible ? TEXT("ui.phone.open") : TEXT("ui.phone.close"), Properties);
    }
}
