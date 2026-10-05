package br.com.entrega365.app;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "QuickLaunch")
public class QuickLaunchPlugin extends Plugin {
    private static final String EXTRA_ACTION = "entrega365_quick_action";

    @PluginMethod
    public void getPendingAction(PluginCall call) {
        Intent intent = getActivity().getIntent();
        String action = intent != null ? intent.getStringExtra(EXTRA_ACTION) : null;

        if (intent != null && action != null) {
            intent.removeExtra(EXTRA_ACTION);
        }

        JSObject result = new JSObject();
        result.put("action", action == null ? "" : action);
        call.resolve(result);
    }
}
