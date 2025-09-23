using UnrealBuildTool;
using System.Collections.Generic;

public class RiftlineEditorTarget : TargetRules
{
    public RiftlineEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V2;
        ExtraModuleNames.AddRange(new List<string> { "Riftline" });
    }
}
