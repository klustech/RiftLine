#include "RiftlinePhoneWidget.h"

#include "Components/Button.h"
#include "Components/TextBlock.h"
#include "Components/Widget.h"
#include "Components/WidgetSwitcher.h"
#include "Engine/World.h"
#include "RiftlineGameInstance.h"

URiftlinePhoneWidget::URiftlinePhoneWidget(const FObjectInitializer& ObjectInitializer)
    : Super(ObjectInitializer)
    , ActiveTab(ERiftlinePhoneTab::Shards)
{
}

void URiftlinePhoneWidget::NativeOnInitialized()
{
    Super::NativeOnInitialized();

    if (TabShard)
    {
        TabShard->OnClicked.AddDynamic(this, &URiftlinePhoneWidget::HandleShardTabClicked);
    }
    if (TabMap)
    {
        TabMap->OnClicked.AddDynamic(this, &URiftlinePhoneWidget::HandleMapTabClicked);
    }
    if (TabAuctions)
    {
        TabAuctions->OnClicked.AddDynamic(this, &URiftlinePhoneWidget::HandleAuctionsTabClicked);
    }
    if (TabInventory)
    {
        TabInventory->OnClicked.AddDynamic(this, &URiftlinePhoneWidget::HandleInventoryTabClicked);
    }
    if (TabMessages)
    {
        TabMessages->OnClicked.AddDynamic(this, &URiftlinePhoneWidget::HandleMessagesTabClicked);
    }

    ActiveTab = DefaultTab;
    SetActiveTab(ActiveTab, false);
}

void URiftlinePhoneWidget::HandleSessionUpdated(const FRiftlineSessionProfile& Profile)
{
    const bool bWalletChanged = CachedSession.Wallet != Profile.Wallet;
    CachedSession = Profile;

  if (Profile.CurrentShard.ShardId != INDEX_NONE)
  {
    KnownShards.AddUnique(Profile.CurrentShard);
    UpdateShardDetails(Profile.CurrentShard);
  }

  CachedCompliance = Profile.Compliance;
  UpdateComplianceDetails(Profile.Compliance);

    OnSessionUpdated(Profile);

    if (bWalletChanged && !Profile.Wallet.IsEmpty() && !bWalletLoginTelemetrySent)
    {
        TMap<FString, FString> Properties;
        Properties.Add(TEXT("address"), Profile.Wallet);
        EmitTelemetry(TEXT("wallet.login"), Properties);
        bWalletLoginTelemetrySent = true;
    }
}

void URiftlinePhoneWidget::HandleWantedUpdated(const FRiftlineWantedState& State)
{
    CachedSession.Wanted = State;
    OnWantedChanged(State);
}

void URiftlinePhoneWidget::HandleComplianceUpdated(const FRiftlineComplianceState& Compliance)
{
    CachedSession.Compliance = Compliance;
    CachedCompliance = Compliance;
    UpdateComplianceDetails(Compliance);
    OnComplianceChanged(Compliance);
}

void URiftlinePhoneWidget::HandleShardStatus(const FRiftlineShardStatus& Status)
{
    CachedSession.CurrentShard = Status;
    KnownShards.AddUnique(Status);
    UpdateShardDetails(Status);
    OnShardStatusChanged(Status);
}

void URiftlinePhoneWidget::HandleWalletUpdated(const FRiftlineWalletView& Wallet)
{
    CachedWallet = Wallet;
    UpdateWalletDetails(Wallet);
    OnWalletUpdated(Wallet);
}

void URiftlinePhoneWidget::HandleMissionsUpdated(const TArray<FText>& Missions)
{
    CachedMissions = Missions;
    OnMissionsUpdated(CachedMissions);
}

void URiftlinePhoneWidget::OnShardChanged(const FRiftlineShardStatus& Status)
{
    HandleShardStatus(Status);
}

void URiftlinePhoneWidget::OnComplianceChanged(const FRiftlineComplianceState& Compliance)
{
    HandleComplianceUpdated(Compliance);
}

void URiftlinePhoneWidget::OnAuctionsUpdated(const TArray<FRiftlineAuctionRow>& Rows)
{
    CachedAuctions = Rows;
    RefreshAuctionsUI();

    TMap<FString, FString> Properties;
    Properties.Add(TEXT("count"), FString::FromInt(CachedAuctions.Num()));
    EmitTelemetry(TEXT("market.list"), Properties);
}

void URiftlinePhoneWidget::SetActiveTab(ERiftlinePhoneTab Tab, bool bEmitTelemetry)
{
    ActiveTab = Tab;
    if (Tabs)
    {
        Tabs->SetActiveWidgetIndex(static_cast<int32>(Tab));
    }

    if (Tab == ERiftlinePhoneTab::Auctions)
    {
        RefreshAuctionsUI();
    }

    if (!bEmitTelemetry)
    {
        return;
    }

    const UEnum* EnumClass = StaticEnum<ERiftlinePhoneTab>();
    FString TabName = EnumClass ? EnumClass->GetNameStringByValue(static_cast<int64>(Tab)) : TEXT("Unknown");

    TMap<FString, FString> Properties;
    Properties.Add(TEXT("tab"), TabName);
    EmitTelemetry(TEXT("ui.phone.tab"), Properties);

    if (Tab == ERiftlinePhoneTab::Auctions)
    {
        TMap<FString, FString> MarketProps;
        MarketProps.Add(TEXT("source"), TEXT("phone"));
        MarketProps.Add(TEXT("items"), FString::FromInt(CachedAuctions.Num()));
        EmitTelemetry(TEXT("market.view"), MarketProps);
    }
}

void URiftlinePhoneWidget::NotifyPhoneVisible(bool bVisible)
{
    OnPhoneVisibilityChanged(bVisible);

    if (bVisible)
    {
        SetActiveTab(ActiveTab, false);
    }
}

void URiftlinePhoneWidget::HandleShardTabClicked()
{
    SetActiveTab(ERiftlinePhoneTab::Shards);
}

void URiftlinePhoneWidget::HandleMapTabClicked()
{
    SetActiveTab(ERiftlinePhoneTab::Map);
}

void URiftlinePhoneWidget::HandleAuctionsTabClicked()
{
    SetActiveTab(ERiftlinePhoneTab::Auctions);
}

void URiftlinePhoneWidget::HandleInventoryTabClicked()
{
    SetActiveTab(ERiftlinePhoneTab::Inventory);
}

void URiftlinePhoneWidget::HandleMessagesTabClicked()
{
    SetActiveTab(ERiftlinePhoneTab::Messages);
}

void URiftlinePhoneWidget::EmitTelemetry(const FString& Event) const
{
    EmitTelemetry(Event, TMap<FString, FString>());
}

void URiftlinePhoneWidget::EmitTelemetry(const FString& Event, const TMap<FString, FString>& Properties) const
{
    if (Event.IsEmpty())
    {
        return;
    }

    if (URiftlineGameInstance* GameInstance = ResolveGameInstance())
    {
        GameInstance->PushTelemetryEvent(Event, Properties);
    }
}

URiftlineGameInstance* URiftlinePhoneWidget::ResolveGameInstance() const
{
    if (const UWorld* World = GetWorld())
    {
        return World->GetGameInstance<URiftlineGameInstance>();
    }
    return nullptr;
}

void URiftlinePhoneWidget::UpdateShardDetails(const FRiftlineShardStatus& Status)
{
    if (ShardNameText)
    {
        ShardNameText->SetText(FText::FromString(Status.Name));
    }
    if (ShardPopulationText)
    {
        ShardPopulationText->SetText(FText::AsNumber(Status.Population));
    }
    if (ShardRulesetText)
    {
        ShardRulesetText->SetText(FText::FromString(Status.Ruleset));
    }
}

void URiftlinePhoneWidget::UpdateComplianceDetails(const FRiftlineComplianceState& Compliance)
{
    if (ComplianceStatusText)
    {
        FString Summary;
        Summary += Compliance.bKycVerified ? TEXT("KYC Verified") : TEXT("KYC Pending");
        Summary += Compliance.bAmlClear ? TEXT(" • AML Clear") : TEXT(" • AML Review");
        Summary += FString::Printf(TEXT(" • Risk %d"), Compliance.RiskScore);
        if (!Compliance.LastCaseId.IsEmpty())
        {
            Summary += FString::Printf(TEXT(" • Case %s"), *Compliance.LastCaseId);
        }
        ComplianceStatusText->SetText(FText::FromString(Summary));
    }
}

void URiftlinePhoneWidget::UpdateWalletDetails(const FRiftlineWalletView& Wallet)
{
    if (WalletAddressText)
    {
        WalletAddressText->SetText(Wallet.Address.IsEmpty() ? FText::GetEmpty() : FText::FromString(Wallet.Address));
    }
    if (SoftCurrencyText)
    {
        SoftCurrencyText->SetText(FText::AsNumber(Wallet.SoftCurrency));
    }
}

void URiftlinePhoneWidget::RefreshAuctionsUI()
{
    if (AuctionsEmptyState)
    {
        AuctionsEmptyState->SetVisibility(CachedAuctions.Num() > 0 ? ESlateVisibility::Collapsed : ESlateVisibility::Visible);
    }

    OnAuctionsChanged(CachedAuctions);
}
