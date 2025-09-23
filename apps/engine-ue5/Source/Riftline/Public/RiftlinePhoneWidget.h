#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "RiftlineTypes.h"
#include "RiftlinePhoneWidget.generated.h"

class UButton;
class UTextBlock;
class UWidget;
class UWidgetSwitcher;
class URiftlineGameInstance;

UCLASS(Abstract, Blueprintable)
class RIFTLINE_API URiftlinePhoneWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    URiftlinePhoneWidget(const FObjectInitializer& ObjectInitializer);

    virtual void NativeOnInitialized() override;

    void HandleSessionUpdated(const FRiftlineSessionProfile& Profile);
    void HandleWantedUpdated(const FRiftlineWantedState& State);
    void HandleComplianceUpdated(const FRiftlineComplianceState& Compliance);
    void HandleShardStatus(const FRiftlineShardStatus& Status);
    void HandleWalletUpdated(const FRiftlineWalletView& Wallet);
    void HandleMissionsUpdated(const TArray<FText>& Missions);

    UFUNCTION()
    void OnShardChanged(const FRiftlineShardStatus& Status);

    UFUNCTION()
    void OnComplianceChanged(const FRiftlineComplianceState& Compliance);

    UFUNCTION()
    void OnAuctionsUpdated(const TArray<FRiftlineAuctionRow>& Rows);

    UFUNCTION(BlueprintCallable, Category = "Riftline|Phone")
    void SetActiveTab(ERiftlinePhoneTab Tab, bool bEmitTelemetry = true);

    UFUNCTION(BlueprintPure, Category = "Riftline|Phone")
    ERiftlinePhoneTab GetActiveTab() const { return ActiveTab; }

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|Phone")
    void OnSessionUpdated(const FRiftlineSessionProfile& Profile);

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|Phone")
    void OnWantedChanged(const FRiftlineWantedState& State);

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|Phone")
    void OnComplianceChanged(const FRiftlineComplianceState& Compliance);

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|Phone")
    void OnShardStatusChanged(const FRiftlineShardStatus& Status);

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|Phone")
    void OnWalletUpdated(const FRiftlineWalletView& Wallet);

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|Phone")
    void OnMissionsUpdated(const TArray<FText>& Missions);

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|Phone")
    void OnAuctionsChanged(const TArray<FRiftlineAuctionRow>& Rows);

    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|Phone")
    void OnPhoneVisibilityChanged(bool bVisible);

    UFUNCTION(BlueprintCallable, Category = "Riftline|Phone")
    void NotifyPhoneVisible(bool bVisible);

protected:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Riftline|Phone")
    ERiftlinePhoneTab DefaultTab = ERiftlinePhoneTab::Shards;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidget))
    UWidgetSwitcher* Tabs;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UButton* TabShard;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UButton* TabMap;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UButton* TabAuctions;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UButton* TabInventory;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UButton* TabMessages;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UTextBlock* ShardNameText;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UTextBlock* ShardPopulationText;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UTextBlock* ShardRulesetText;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UTextBlock* ComplianceStatusText;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UTextBlock* WalletAddressText;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UTextBlock* SoftCurrencyText;

    UPROPERTY(BlueprintReadOnly, meta = (BindWidgetOptional))
    UWidget* AuctionsEmptyState;

    UPROPERTY(BlueprintReadOnly, Category = "Riftline|Phone")
    FRiftlineSessionProfile CachedSession;

    UPROPERTY(BlueprintReadOnly, Category = "Riftline|Phone")
    TArray<FRiftlineShardStatus> KnownShards;

    UPROPERTY(BlueprintReadOnly, Category = "Riftline|Phone")
    FRiftlineWalletView CachedWallet;

    UPROPERTY(BlueprintReadOnly, Category = "Riftline|Phone")
    TArray<FText> CachedMissions;

    UPROPERTY(BlueprintReadOnly, Category = "Riftline|Phone")
    FRiftlineComplianceState CachedCompliance;

    UPROPERTY(BlueprintReadOnly, Category = "Riftline|Phone")
    TArray<FRiftlineAuctionRow> CachedAuctions;

    UPROPERTY(BlueprintReadOnly, Category = "Riftline|Phone")
    ERiftlinePhoneTab ActiveTab;

private:
    UFUNCTION()
    void HandleShardTabClicked();

    UFUNCTION()
    void HandleMapTabClicked();

    UFUNCTION()
    void HandleAuctionsTabClicked();

    UFUNCTION()
    void HandleInventoryTabClicked();

    UFUNCTION()
    void HandleMessagesTabClicked();

    void EmitTelemetry(const FString& Event) const;
    void EmitTelemetry(const FString& Event, const TMap<FString, FString>& Properties) const;
    URiftlineGameInstance* ResolveGameInstance() const;

    void UpdateShardDetails(const FRiftlineShardStatus& Status);
    void UpdateComplianceDetails(const FRiftlineComplianceState& Compliance);
    void UpdateWalletDetails(const FRiftlineWalletView& Wallet);
    void RefreshAuctionsUI();

    bool bWalletLoginTelemetrySent = false;
};
