#pragma once

#include "CoreMinimal.h"
#include "RiftlineTypes.generated.h"

UENUM(BlueprintType)
enum class ERiftlineWantedLevel : uint8
{
    None UMETA(DisplayName = "None"),
    Low UMETA(DisplayName = "Low"),
    Medium UMETA(DisplayName = "Medium"),
    High UMETA(DisplayName = "High"),
    Critical UMETA(DisplayName = "Critical")
};

USTRUCT(BlueprintType)
struct FRiftlineWantedState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    ERiftlineWantedLevel Level = ERiftlineWantedLevel::None;

    UPROPERTY(BlueprintReadOnly)
    FDateTime ExpiresAt = FDateTime(0);

    UPROPERTY(BlueprintReadOnly)
    float Heat = 0.f;
};

USTRUCT(BlueprintType)
struct FRiftlineShardStatus
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    int32 ShardId = INDEX_NONE;

    UPROPERTY(BlueprintReadOnly)
    FString Name;

    UPROPERTY(BlueprintReadOnly)
    int32 Population = 0;

    UPROPERTY(BlueprintReadOnly)
    FString Ruleset;

    bool operator==(const FRiftlineShardStatus& Other) const
    {
        return ShardId == Other.ShardId
            && Name == Other.Name
            && Population == Other.Population
            && Ruleset == Other.Ruleset;
    }
};

USTRUCT(BlueprintType)
struct FRiftlineComplianceState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    bool bKycVerified = false;

    UPROPERTY(BlueprintReadOnly)
    bool bAmlClear = true;

    UPROPERTY(BlueprintReadOnly)
    int32 RiskScore = 0;

    UPROPERTY(BlueprintReadOnly)
    FString LastCaseId;
};

USTRUCT(BlueprintType)
struct FRiftlineWalletView
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString Address;

    UPROPERTY(BlueprintReadOnly)
    int32 SoftCurrency = 0;

    UPROPERTY(BlueprintReadOnly)
    int32 WantedMinutes = 0;

    UPROPERTY(BlueprintReadOnly)
    int32 ShardId = INDEX_NONE;
};

USTRUCT(BlueprintType)
struct FRiftlineSessionProfile
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString Wallet;

    UPROPERTY(BlueprintReadOnly)
    FString PlayerId;

    UPROPERTY(BlueprintReadOnly)
    FString DisplayName;

    UPROPERTY(BlueprintReadOnly)
    FRiftlineShardStatus CurrentShard;

    UPROPERTY(BlueprintReadOnly)
    FRiftlineWantedState Wanted;

    UPROPERTY(BlueprintReadOnly)
    FRiftlineComplianceState Compliance;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FRiftlineWantedDelegate, const FRiftlineWantedState&, State);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FRiftlineComplianceDelegate, const FRiftlineComplianceState&, State);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FRiftlineSessionDelegate, const FRiftlineSessionProfile&, Profile);
