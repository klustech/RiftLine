// SPDX-License-Identifier: MIT
#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "RadialMenuWidget.generated.h"

class UTexture2D;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnRadialEntrySelected, FName, EntryId);

USTRUCT(BlueprintType)
struct FRadialEntry
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FName Id;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FText Label;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    UTexture2D* Icon = nullptr;
};

UCLASS(BlueprintType)
class URadialMenuWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    TArray<FRadialEntry> Entries;

    UPROPERTY(BlueprintAssignable)
    FOnRadialEntrySelected OnSelected;

    UFUNCTION(BlueprintCallable)
    void SetEntries(const TArray<FRadialEntry>& InEntries)
    {
        Entries = InEntries;
    }

    UFUNCTION(BlueprintCallable)
    void SelectByIndex(int32 Index)
    {
        if (Entries.IsValidIndex(Index))
        {
            OnSelected.Broadcast(Entries[Index].Id);
        }
    }
};
