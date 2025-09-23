#include "RiftlinePhoneWidget.h"

URiftlinePhoneWidget::URiftlinePhoneWidget(const FObjectInitializer& ObjectInitializer)
    : Super(ObjectInitializer)
{
}

void URiftlinePhoneWidget::HandleSessionUpdated(const FRiftlineSessionProfile& Profile)
{
    CachedSession = Profile;
    OnSessionUpdated(Profile);
}

void URiftlinePhoneWidget::HandleWantedUpdated(const FRiftlineWantedState& State)
{
    CachedSession.Wanted = State;
    OnWantedChanged(State);
}

void URiftlinePhoneWidget::HandleComplianceUpdated(const FRiftlineComplianceState& Compliance)
{
    CachedSession.Compliance = Compliance;
    OnComplianceChanged(Compliance);
}

void URiftlinePhoneWidget::HandleShardStatus(const FRiftlineShardStatus& Status)
{
    CachedSession.CurrentShard = Status;
    KnownShards.AddUnique(Status);
    OnShardStatusChanged(Status);
}

void URiftlinePhoneWidget::HandleWalletUpdated(const FRiftlineWalletView& Wallet)
{
    CachedWallet = Wallet;
    OnWalletUpdated(Wallet);
}

void URiftlinePhoneWidget::HandleMissionsUpdated(const TArray<FText>& Missions)
{
    CachedMissions = Missions;
    OnMissionsUpdated(CachedMissions);
}
