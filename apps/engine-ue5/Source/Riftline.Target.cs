using UnrealBuildTool;
using System.Collections.Generic;

public class RiftlineTarget : TargetRules
{
    public RiftlineTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V2;
        ExtraModuleNames.AddRange(new List<string> { "Riftline" });
    }
}
