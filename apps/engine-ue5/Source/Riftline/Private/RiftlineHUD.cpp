#include "RiftlineHUD.h"

#include "Blueprint/UserWidget.h"
#include "GameFramework/PlayerController.h"
#include "RiftlineGameInstance.h"
#include "RiftlineHUDWidget.h"
#include "RiftlineInteractionComponent.h"
#include "RiftlineRadialMenuWidget.h"

void ARiftlineHUD::BeginPlay()
{
    Super::BeginPlay();

    if (!HUDWidgetClass)
    {
        HUDWidgetClass = URiftlineHUDWidget::StaticClass();
    }

    if (HUDWidgetClass && GetWorld())
    {
        HUDWidget = CreateWidget<URiftlineHUDWidget>(GetWorld(), HUDWidgetClass);
        if (HUDWidget)
        {
            HUDWidget->AddToViewport(0);
            HUDWidget->SetVisibility(ESlateVisibility::SelfHitTestInvisible);
            if (URiftlineRadialMenuWidget* Radial = HUDWidget->GetRadialMenu())
            {
                Radial->OnEntrySelected.AddDynamic(this, &ARiftlineHUD::HandleRadialEntrySelected);
            }
        }
    }

    if (URiftlineGameInstance* GI = GetWorld() ? GetWorld()->GetGameInstance<URiftlineGameInstance>() : nullptr)
    {
        GI->OnWantedStateChanged.AddDynamic(this, &ARiftlineHUD::HandleWanted);
        GI->OnComplianceChanged.AddDynamic(this, &ARiftlineHUD::HandleCompliance);
        HandleWanted(GI->GetSessionProfile().Wanted);
        HandleCompliance(GI->GetSessionProfile().Compliance);
    }

    if (APlayerController* PC = GetOwningPlayerController())
    {
        PC->GetOnNewPawnNotifier().AddUObject(this, &ARiftlineHUD::HandlePawnChanged);
        HandlePawnChanged(PC->GetPawn());
    }
}

void ARiftlineHUD::HandleWanted(const FRiftlineWantedState& State)
{
    if (HUDWidget)
    {
        HUDWidget->SetHeat(State.Heat);
        HUDWidget->SetWantedLevel(static_cast<int32>(State.Level));
    }

    OnWantedLevelUpdated(State);
}

void ARiftlineHUD::HandleCompliance(const FRiftlineComplianceState& State)
{
    if (HUDWidget)
    {
        HUDWidget->SetComplianceState(State);
    }

    OnComplianceUpdated(State);
}

void ARiftlineHUD::HandlePawnChanged(APawn* NewPawn)
{
    if (InteractionComponent.IsValid())
    {
        InteractionComponent->OnInteractionOptions.RemoveAll(this);
    }

    InteractionComponent = nullptr;

    if (NewPawn)
    {
        if (URiftlineInteractionComponent* Comp = NewPawn->FindComponentByClass<URiftlineInteractionComponent>())
        {
            InteractionComponent = Comp;
            Comp->OnInteractionOptions.AddDynamic(this, &ARiftlineHUD::HandleInteractionOptions);
        }
    }

    if (!InteractionComponent.IsValid() && HUDWidget)
    {
        HUDWidget->ClearRadialEntries();
    }
}

void ARiftlineHUD::HandleInteractionOptions(const FRiftlineInteractionHit& Hit)
{
    if (HUDWidget)
    {
        HUDWidget->SetRadialEntries(Hit.Options);
    }
}

void ARiftlineHUD::HandleRadialEntrySelected(FName EntryId)
{
    if (InteractionComponent.IsValid())
    {
        InteractionComponent->InvokeInteraction(EntryId);
    }

    if (URiftlineGameInstance* GI = GetWorld() ? GetWorld()->GetGameInstance<URiftlineGameInstance>() : nullptr)
    {
        TMap<FString, FString> Properties;
        Properties.Add(TEXT("option"), EntryId.ToString());
        GI->PushTelemetryEvent(TEXT("ui.radial.select"), Properties);
    }

    if (HUDWidget)
    {
        HUDWidget->ClearRadialEntries();
    }
}
