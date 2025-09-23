#include "RiftlineGameInstance.h"

#include "Algo/Sort.h"
#include "Engine/Engine.h"
#include "HAL/PlatformProperties.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "Riftline.h"
#include "RiftlinePhoneWidget.h"
#include "TimerManager.h"

namespace
{
    FString ComposeEndpoint(const FString& BaseUrl, const FString& Path)
    {
        if (BaseUrl.IsEmpty())
        {
            return FString();
        }
        FString SanitisedBase = BaseUrl;
        SanitisedBase.RemoveFromEnd(TEXT("/"));
        FString SanitisedPath = Path;
        if (!SanitisedPath.StartsWith(TEXT("/")))
        {
            SanitisedPath = TEXT("/") + SanitisedPath;
        }
        return SanitisedBase + SanitisedPath;
    }
}

URiftlineGameInstance::URiftlineGameInstance()
{
    ApiBaseUrl = TEXT("http://localhost:8080");
    NakamaUrl = TEXT("http://localhost:7350");
    FpsSamples.Reserve(120);
}

void URiftlineGameInstance::Init()
{
    Super::Init();
    InitialiseFromEnvironment();
    StartHeartbeat();
}

void URiftlineGameInstance::Shutdown()
{
    StopHeartbeat();
    Super::Shutdown();
}

void URiftlineGameInstance::InitialiseFromEnvironment()
{
    const FString ApiOverride = FPlatformMisc::GetEnvironmentVariable(TEXT("RIFTLINE_API_URL"));
    if (!ApiOverride.IsEmpty())
    {
        ApiBaseUrl = ApiOverride;
    }

    const FString NakamaOverride = FPlatformMisc::GetEnvironmentVariable(TEXT("RIFTLINE_NAKAMA_URL"));
    if (!NakamaOverride.IsEmpty())
    {
        NakamaUrl = NakamaOverride;
    }

    UE_LOG(LogRiftline, Log, TEXT("Initialised GameInstance with API=%s Nakama=%s"), *ApiBaseUrl, *NakamaUrl);
}

void URiftlineGameInstance::SetSessionProfile(const FRiftlineSessionProfile& NewProfile)
{
    Session = NewProfile;
    OnSessionChanged.Broadcast(Session);

    if (PhoneWidget.IsValid())
    {
        PhoneWidget->HandleSessionUpdated(Session);
    }
}

void URiftlineGameInstance::ApplyWantedState(const FRiftlineWantedState& Wanted)
{
    Session.Wanted = Wanted;
    OnWantedStateChanged.Broadcast(Session.Wanted);
    SubmitWantedTelemetry(Wanted);

    if (PhoneWidget.IsValid())
    {
        PhoneWidget->HandleWantedUpdated(Wanted);
    }
}

void URiftlineGameInstance::ClearWanted()
{
    Session.Wanted = FRiftlineWantedState();
    OnWantedStateChanged.Broadcast(Session.Wanted);
    SubmitWantedTelemetry(Session.Wanted);

    if (PhoneWidget.IsValid())
    {
        PhoneWidget->HandleWantedUpdated(Session.Wanted);
    }
}

void URiftlineGameInstance::UpdateShardStatus(const FRiftlineShardStatus& Status)
{
    Session.CurrentShard = Status;
    OnSessionChanged.Broadcast(Session);

    if (PhoneWidget.IsValid())
    {
        PhoneWidget->HandleShardStatus(Status);
    }
}

void URiftlineGameInstance::UpdateCompliance(const FRiftlineComplianceState& ComplianceState)
{
    Session.Compliance = ComplianceState;
    OnComplianceChanged.Broadcast(Session.Compliance);

    if (PhoneWidget.IsValid())
    {
        PhoneWidget->HandleComplianceUpdated(ComplianceState);
    }
}

void URiftlineGameInstance::UpdateWalletView(const FRiftlineWalletView& WalletViewIn)
{
    WalletView = WalletViewIn;

    if (PhoneWidget.IsValid())
    {
        PhoneWidget->HandleWalletUpdated(WalletView);
    }
}

void URiftlineGameInstance::UpdateActiveMissions(const TArray<FText>& Missions)
{
    ActiveMissions = Missions;

    if (PhoneWidget.IsValid())
    {
        PhoneWidget->HandleMissionsUpdated(ActiveMissions);
    }
}

void URiftlineGameInstance::PushTelemetryEvent(const FString& Event, const TMap<FString, FString>& Properties)
{
    if (Session.PlayerId.IsEmpty())
    {
        return;
    }

    const FString Url = ComposeEndpoint(ApiBaseUrl, TEXT("/telemetry/events"));
    if (Url.IsEmpty())
    {
        return;
    }

    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
    Request->SetURL(Url);
    Request->SetVerb(TEXT("POST"));
    Request->SetHeader(TEXT("Content-Type"), TEXT("application/json"));

    FString JsonPayload = TEXT("{");
    JsonPayload += FString::Printf(TEXT("\"playerId\":\"%s\","), *Session.PlayerId);
    JsonPayload += FString::Printf(TEXT("\"event\":\"%s\","), *Event);
    JsonPayload += TEXT("\"properties\":{");

    bool bFirst = true;
    for (const TPair<FString, FString>& Pair : Properties)
    {
        if (!bFirst)
        {
            JsonPayload += TEXT(",");
        }
        JsonPayload += FString::Printf(TEXT("\"%s\":\"%s\""), *Pair.Key.ReplaceCharWithEscapedChar(), *Pair.Value.ReplaceCharWithEscapedChar());
        bFirst = false;
    }
    JsonPayload += TEXT("}}");
    Request->SetContentAsString(JsonPayload);
    Request->ProcessRequest();
}

void URiftlineGameInstance::RegisterPhoneWidget(URiftlinePhoneWidget* Widget)
{
    PhoneWidget = Widget;
    if (PhoneWidget.IsValid())
    {
        PhoneWidget->HandleSessionUpdated(Session);
        PhoneWidget->HandleWantedUpdated(Session.Wanted);
        PhoneWidget->HandleComplianceUpdated(Session.Compliance);
        PhoneWidget->HandleShardStatus(Session.CurrentShard);
        PhoneWidget->HandleWalletUpdated(WalletView);
        PhoneWidget->HandleMissionsUpdated(ActiveMissions);
    }
}

void URiftlineGameInstance::StartHeartbeat()
{
    StopHeartbeat();
    if (!GetWorld())
    {
        return;
    }
    const float Interval = 15.f;
    GetWorld()->GetTimerManager().SetTimer(HeartbeatTimerHandle, this, &URiftlineGameInstance::HeartbeatTick, Interval, true, Interval);
}

void URiftlineGameInstance::StopHeartbeat()
{
    if (GetWorld())
    {
        GetWorld()->GetTimerManager().ClearTimer(HeartbeatTimerHandle);
    }
}

void URiftlineGameInstance::HeartbeatTick()
{
    if (Session.PlayerId.IsEmpty())
    {
        return;
    }

    const FString Url = ComposeEndpoint(ApiBaseUrl, TEXT("/players/heartbeat"));
    if (!Url.IsEmpty())
    {
        TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
        Request->SetURL(Url);
        Request->SetVerb(TEXT("POST"));
        Request->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
        Request->SetContentAsString(FString::Printf(TEXT("{\"playerId\":\"%s\",\"shardId\":%d}"), *Session.PlayerId, Session.CurrentShard.ShardId));
        Request->ProcessRequest();
    }

    EmitClientPerformanceTelemetry();
    EmitThermalTelemetry();
}

void URiftlineGameInstance::SubmitWantedTelemetry(const FRiftlineWantedState& WantedState)
{
    if (Session.PlayerId.IsEmpty())
    {
        return;
    }

    TMap<FString, FString> Properties;
    Properties.Add(TEXT("level"), StaticEnum<ERiftlineWantedLevel>()->GetNameStringByValue(static_cast<int64>(WantedState.Level)));
    Properties.Add(TEXT("expires"), WantedState.ExpiresAt.ToIso8601());
    Properties.Add(TEXT("heat"), FString::SanitizeFloat(WantedState.Heat));
    PushTelemetryEvent(TEXT("wanted_state"), Properties);
}

void URiftlineGameInstance::EmitClientPerformanceTelemetry()
{
    if (!GEngine)
    {
        return;
    }

    const float CurrentFps = GEngine->GetAverageFPS();
    if (CurrentFps <= 0.f || !FMath::IsFinite(CurrentFps))
    {
        return;
    }

    FpsSamples.Add(CurrentFps);
    const int32 MaxSamples = 120;
    if (FpsSamples.Num() > MaxSamples)
    {
        const int32 Excess = FpsSamples.Num() - MaxSamples;
        FpsSamples.RemoveAt(0, Excess);
    }

    float Sum = 0.f;
    for (float Sample : FpsSamples)
    {
        Sum += Sample;
    }

    const float Average = Sum / FpsSamples.Num();

    TArray<float> SortedSamples = FpsSamples;
    SortedSamples.Sort();

    float Percentile95 = SortedSamples.Last();
    if (SortedSamples.Num() > 1)
    {
        const float Position = 0.95f * (SortedSamples.Num() - 1);
        const int32 LowerIndex = FMath::FloorToInt(Position);
        const int32 UpperIndex = FMath::CeilToInt(Position);

        if (LowerIndex >= 0 && UpperIndex < SortedSamples.Num())
        {
            if (LowerIndex == UpperIndex)
            {
                Percentile95 = SortedSamples[LowerIndex];
            }
            else
            {
                const float Fraction = Position - LowerIndex;
                Percentile95 = FMath::Lerp(SortedSamples[LowerIndex], SortedSamples[UpperIndex], Fraction);
            }
        }
    }

    TMap<FString, FString> Properties;
    Properties.Add(TEXT("avg"), FString::Printf(TEXT("%.2f"), Average));
    Properties.Add(TEXT("pct95"), FString::Printf(TEXT("%.2f"), Percentile95));
    PushTelemetryEvent(TEXT("client.fps"), Properties);
}

void URiftlineGameInstance::EmitThermalTelemetry()
{
    TMap<FString, FString> Properties;
    Properties.Add(TEXT("state"), DescribeThermalState());
    Properties.Add(TEXT("platform"), FString(FPlatformProperties::IniPlatformName()));
    PushTelemetryEvent(TEXT("client.thermal"), Properties);
}

FString URiftlineGameInstance::DescribeThermalState() const
{
#if PLATFORM_ANDROID
    return TEXT("android:unknown");
#else
    return TEXT("unknown");
#endif
}
