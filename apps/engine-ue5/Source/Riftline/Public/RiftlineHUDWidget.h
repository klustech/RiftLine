#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "RiftlineTypes.h"
#include "RiftlineHUDWidget.generated.h"

class UHorizontalBox;
class UImage;
class UProgressBar;
class UTextBlock;
class UWidget;
class URiftlineRadialMenuWidget;
struct FRiftlineInteractionOption;

UCLASS(Abstract, Blueprintable)
class RIFTLINE_API URiftlineHUDWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    URiftlineHUDWidget(const FObjectInitializer& ObjectInitializer);

    UFUNCTION(BlueprintCallable, Category = "Riftline|HUD")
    void SetWantedLevel(int32 Stars);

    UFUNCTION(BlueprintCallable, Category = "Riftline|HUD")
    void SetHeat(float Value);

    UFUNCTION(BlueprintCallable, Category = "Riftline|HUD")
    void SetComplianceState(const FRiftlineComplianceState& State);

    UFUNCTION(BlueprintCallable, Category = "Riftline|HUD")
    void SetRadialEntries(const TArray<FRiftlineInteractionOption>& Entries);

    UFUNCTION(BlueprintCallable, Category = "Riftline|HUD")
    void ClearRadialEntries();

    UFUNCTION(BlueprintPure, Category = "Riftline|HUD")
    URiftlineRadialMenuWidget* GetRadialMenu() const { return RadialMenu; }

    UFUNCTION(BlueprintPure, Category = "Riftline|HUD")
    int32 GetVisibleWantedLevel() const { return VisibleWantedLevel; }

    UFUNCTION(BlueprintPure, Category = "Riftline|HUD")
    const FRiftlineWantedState& GetWantedState() const { return WantedState; }

    UFUNCTION(BlueprintPure, Category = "Riftline|HUD")
    const FRiftlineComplianceState& GetComplianceState() const { return ComplianceState; }

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|HUD")
    void HandleWantedLevelChanged(int32 Stars);

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|HUD")
    void HandleHeatChanged(float Value);

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|HUD")
    void HandleComplianceChanged(const FRiftlineComplianceState& State);

protected:
    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UImage* Minimap;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UHorizontalBox* WantedStars;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UProgressBar* HeatBar;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UTextBlock* HeatValueText;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UTextBlock* ComplianceText;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UWidget* RadialContainer;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    URiftlineRadialMenuWidget* RadialMenu;

    UPROPERTY(BlueprintReadOnly, Category = "Riftline|HUD")
    FRiftlineWantedState WantedState;

    UPROPERTY(BlueprintReadOnly, Category = "Riftline|HUD")
    FRiftlineComplianceState ComplianceState;

    UPROPERTY(BlueprintReadOnly, Category = "Riftline|HUD")
    int32 VisibleWantedLevel = 0;

private:
    void UpdateWantedVisuals(int32 Stars) const;
    void UpdateRadialVisibility(bool bVisible) const;
};
