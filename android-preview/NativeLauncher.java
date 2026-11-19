package app.remember.preview;

import android.app.Activity;
import android.content.ComponentName;
import android.content.pm.PackageManager;
import android.webkit.JavascriptInterface;
import java.util.Arrays;

public final class NativeLauncher {
    private final Activity activity;
    public NativeLauncher(Activity activity) { this.activity = activity; }
    @JavascriptInterface public String current() {
        ComponentName memory = new ComponentName(activity.getPackageName(), activity.getPackageName() + ".LauncherMemory");
        return activity.getPackageManager().getComponentEnabledSetting(memory) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED ? "memory" : "remember";
    }
    @JavascriptInterface public String select(String preset) {
        if (!"memory".equals(preset) && !"remember".equals(preset)) return "invalid";
        try {
            PackageManager manager = activity.getPackageManager();
            ComponentName enable = new ComponentName(activity.getPackageName(), activity.getPackageName() + ("memory".equals(preset) ? ".LauncherMemory" : ".LauncherRemember"));
            ComponentName disable = new ComponentName(activity.getPackageName(), activity.getPackageName() + ("memory".equals(preset) ? ".LauncherRemember" : ".LauncherMemory"));
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                manager.setComponentEnabledSettings(Arrays.asList(
                    new PackageManager.ComponentEnabledSetting(enable, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP),
                    new PackageManager.ComponentEnabledSetting(disable, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)));
            } else {
                manager.setComponentEnabledSetting(enable, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
                manager.setComponentEnabledSetting(disable, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
            }
            return current();
        } catch (Exception error) { return "failed"; }
    }
}
