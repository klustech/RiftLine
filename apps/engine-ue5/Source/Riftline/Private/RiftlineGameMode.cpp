#include "RiftlineGameMode.h"
#include "RiftlinePawn.h"
#include "RiftlinePlayerController.h"
#include "RiftlineHUD.h"

ARiftlineGameMode::ARiftlineGameMode()
{
    DefaultPawnClass = ARiftlinePawn::StaticClass();
    PlayerControllerClass = ARiftlinePlayerController::StaticClass();
    HUDClass = ARiftlineHUD::StaticClass();
}
