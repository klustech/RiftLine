#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "RiftlineTypes.h"
#include "RiftlineGameInstance.generated.h"

class URiftlinePhoneWidget;

UCLASS()
class RIFTLINE_API URiftlineGameInstance : public UGameInstance
{
    GENERATED_BODY()

public:
    URiftlineGameInstance();

    virtual void Init() override;
    virtual void Shutdown() override;

    UFUNCTION(BlueprintCallable, Category = "Riftline|Session")
    void SetSessionProfile(const FRiftlineSessionProfile& NewProfile);

    UFUNCTION(BlueprintCallable, Category = "Riftline|Session")
    const FRiftlineSessionProfile& GetSessionProfile() const { return Session; }

    UFUNCTION(BlueprintCallable, Category = "Riftline|Wanted")
    void ApplyWantedState(const FRiftlineWantedState& Wanted);

    UFUNCTION(BlueprintCallable, Category = "Riftline|Wanted")
    void ClearWanted();

    UFUNCTION(BlueprintCallable, Category = "Riftline|Shard")
    void UpdateShardStatus(const FRiftlineShardStatus& Status);

    UFUNCTION(BlueprintCallable, Category = "Riftline|Compliance")
    void UpdateCompliance(const FRiftlineComplianceState& ComplianceState);

    UFUNCTION(BlueprintCallable, Category = "Riftline|Network")
    void PushTelemetryEvent(const FString& Event, const TMap<FString, FString>& Properties);

    UPROPERTY(BlueprintAssignable)
    FRiftlineWantedDelegate OnWantedStateChanged;

    UPROPERTY(BlueprintAssignable)
    FRiftlineComplianceDelegate OnComplianceChanged;

    UPROPERTY(BlueprintAssignable)
    FRiftlineSessionDelegate OnSessionChanged;

    UFUNCTION(BlueprintCallable, Category = "Riftline|UI")
    void RegisterPhoneWidget(URiftlinePhoneWidget* Widget);

    FString GetApiBaseUrl() const { return ApiBaseUrl; }
    FString GetNakamaUrl() const { return NakamaUrl; }

private:
    FString ApiBaseUrl;
    FString NakamaUrl;

    FRiftlineSessionProfile Session;
    TWeakObjectPtr<URiftlinePhoneWidget> PhoneWidget;

    FTimerHandle HeartbeatTimerHandle;

    void InitialiseFromEnvironment();
    void StartHeartbeat();
    void StopHeartbeat();
    void HeartbeatTick();

    void SubmitWantedTelemetry(const FRiftlineWantedState& WantedState);
};
