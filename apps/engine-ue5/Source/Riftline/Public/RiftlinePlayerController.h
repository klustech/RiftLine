#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "RiftlinePlayerController.generated.h"

class URiftlinePhoneWidget;
class URiftlineGameInstance;

UCLASS()
class RIFTLINE_API ARiftlinePlayerController : public APlayerController
{
    GENERATED_BODY()

public:
    ARiftlinePlayerController();

    virtual void BeginPlay() override;
    virtual void SetupInputComponent() override;

protected:
    UPROPERTY(EditDefaultsOnly, Category = "Riftline|UI")
    TSubclassOf<URiftlinePhoneWidget> PhoneWidgetClass;

private:
    UPROPERTY(Transient)
    URiftlinePhoneWidget* PhoneWidget;

    bool bPhoneVisible;

    void TogglePhone();
    void OpenMap();
    void UpdateInputMode();
    void SetPhoneVisibility(bool bVisible, const FString& SourceTag);
};
