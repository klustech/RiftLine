#include "RiftlineRadialMenuWidget.h"

void URiftlineRadialMenuWidget::SetEntries(const TArray<FRiftlineInteractionOption>& InEntries)
{
    Entries = InEntries;
    HandleEntriesChanged();
}

void URiftlineRadialMenuWidget::ClearEntries()
{
    Entries.Reset();
    HandleEntriesChanged();
}

void URiftlineRadialMenuWidget::SelectEntryByIndex(int32 Index)
{
    if (!Entries.IsValidIndex(Index))
    {
        return;
    }

    OnEntrySelected.Broadcast(Entries[Index].Id);
}
