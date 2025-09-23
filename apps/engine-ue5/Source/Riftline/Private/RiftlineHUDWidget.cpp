#include "RiftlineHUDWidget.h"

#include "Components/HorizontalBox.h"
#include "Components/Image.h"
#include "Components/ProgressBar.h"
#include "Components/TextBlock.h"
#include "Components/Widget.h"
#include "RiftlineInteractionComponent.h"
#include "RiftlineRadialMenuWidget.h"

URiftlineHUDWidget::URiftlineHUDWidget(const FObjectInitializer& ObjectInitializer)
    : Super(ObjectInitializer)
{
}

void URiftlineHUDWidget::SetWantedLevel(int32 Stars)
{
    const int32 Clamped = FMath::Max(Stars, 0);
    VisibleWantedLevel = Clamped;
    WantedState.Level = static_cast<ERiftlineWantedLevel>(FMath::Clamp(Clamped, 0, static_cast<int32>(ERiftlineWantedLevel::Critical)));
    UpdateWantedVisuals(Clamped);
    HandleWantedLevelChanged(Clamped);
}

void URiftlineHUDWidget::SetHeat(float Value)
{
    const float Clamped = FMath::Clamp(Value, 0.f, 1.f);
    WantedState.Heat = Clamped;
    if (HeatBar)
    {
        HeatBar->SetPercent(Clamped);
    }
    if (HeatValueText)
    {
        HeatValueText->SetText(FText::AsPercent(Clamped));
    }
    HandleHeatChanged(Clamped);
}

void URiftlineHUDWidget::SetComplianceState(const FRiftlineComplianceState& State)
{
    ComplianceState = State;

    if (ComplianceText)
    {
        FString Summary;
        Summary += State.bKycVerified ? TEXT("KYC Verified") : TEXT("KYC Pending");
        Summary += State.bAmlClear ? TEXT(" • AML Clear") : TEXT(" • AML Review");
        Summary += FString::Printf(TEXT(" • Risk %d"), State.RiskScore);
        if (!State.LastCaseId.IsEmpty())
        {
            Summary += FString::Printf(TEXT(" • Case %s"), *State.LastCaseId);
        }
        ComplianceText->SetText(FText::FromString(Summary));
    }

    HandleComplianceChanged(ComplianceState);
}

void URiftlineHUDWidget::SetRadialEntries(const TArray<FRiftlineInteractionOption>& Entries)
{
    if (RadialMenu)
    {
        if (Entries.Num() > 0)
        {
            RadialMenu->SetEntries(Entries);
            UpdateRadialVisibility(true);
        }
        else
        {
            RadialMenu->ClearEntries();
            UpdateRadialVisibility(false);
        }
    }
    else
    {
        UpdateRadialVisibility(Entries.Num() > 0);
    }
}

void URiftlineHUDWidget::ClearRadialEntries()
{
    if (RadialMenu)
    {
        RadialMenu->ClearEntries();
    }
    UpdateRadialVisibility(false);
}

void URiftlineHUDWidget::UpdateWantedVisuals(int32 Stars) const
{
    if (!WantedStars)
    {
        return;
    }

    const int32 ChildCount = WantedStars->GetChildrenCount();
    for (int32 Index = 0; Index < ChildCount; ++Index)
    {
        if (UWidget* Child = WantedStars->GetChildAt(Index))
        {
            Child->SetVisibility(Index < Stars ? ESlateVisibility::HitTestInvisible : ESlateVisibility::Hidden);
        }
    }
}

void URiftlineHUDWidget::UpdateRadialVisibility(bool bVisible) const
{
    if (RadialContainer)
    {
        RadialContainer->SetVisibility(bVisible ? ESlateVisibility::Visible : ESlateVisibility::Collapsed);
    }
    else if (RadialMenu)
    {
        RadialMenu->SetVisibility(bVisible ? ESlateVisibility::Visible : ESlateVisibility::Collapsed);
    }
}
