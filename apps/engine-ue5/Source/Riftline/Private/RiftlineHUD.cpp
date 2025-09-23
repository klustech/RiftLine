#include "RiftlineHUD.h"
#include "RiftlineGameInstance.h"

void ARiftlineHUD::BeginPlay()
{
    Super::BeginPlay();

    if (URiftlineGameInstance* GI = GetWorld() ? GetWorld()->GetGameInstance<URiftlineGameInstance>() : nullptr)
    {
        GI->OnWantedStateChanged.AddDynamic(this, &ARiftlineHUD::HandleWanted);
        GI->OnComplianceChanged.AddDynamic(this, &ARiftlineHUD::HandleCompliance);
        HandleWanted(GI->GetSessionProfile().Wanted);
        HandleCompliance(GI->GetSessionProfile().Compliance);
    }
}

void ARiftlineHUD::HandleWanted(const FRiftlineWantedState& State)
{
    OnWantedLevelUpdated(State);
}

void ARiftlineHUD::HandleCompliance(const FRiftlineComplianceState& State)
{
    OnComplianceUpdated(State);
}
