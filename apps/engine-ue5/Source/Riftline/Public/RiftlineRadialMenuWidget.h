#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "RiftlineInteractionComponent.h"
#include "RiftlineRadialMenuWidget.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FRiftlineRadialEntrySelectedSignature, FName, EntryId);

UCLASS(Abstract, Blueprintable)
class RIFTLINE_API URiftlineRadialMenuWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Riftline|Radial")
    TArray<FRiftlineInteractionOption> Entries;

    UPROPERTY(BlueprintAssignable, Category = "Riftline|Radial")
    FRiftlineRadialEntrySelectedSignature OnEntrySelected;

    UFUNCTION(BlueprintCallable, Category = "Riftline|Radial")
    void SetEntries(const TArray<FRiftlineInteractionOption>& InEntries);

    UFUNCTION(BlueprintCallable, Category = "Riftline|Radial")
    void ClearEntries();

    UFUNCTION(BlueprintCallable, Category = "Riftline|Radial")
    void SelectEntryByIndex(int32 Index);

protected:
    UFUNCTION(BlueprintImplementableEvent, Category = "Riftline|Radial")
    void HandleEntriesChanged();
};
