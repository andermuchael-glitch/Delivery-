package br.com.entrega365.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.appwidget.AppWidgetManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;

@CapacitorPlugin(name = "QuickLaunch")
public class QuickLaunchPlugin extends Plugin {
    private static final String EXTRA_ACTION = "entrega365_quick_action";
    private static final String PREFS = "entrega365_quick_comanda";

    @PluginMethod public void getPendingAction(PluginCall call) {
        android.content.Intent intent = getActivity().getIntent();
        String action = intent != null ? intent.getStringExtra(EXTRA_ACTION) : null;
        if (intent != null && action != null) intent.removeExtra(EXTRA_ACTION);
        JSObject result = new JSObject();
        result.put("action", action == null ? "" : action);
        call.resolve(result);
    }

    @PluginMethod public void syncDailySummary(PluginCall call) {
        int count = call.getInt("count", 0);
        double earnings = call.getDouble("earnings", 0.0);
        SharedPreferences p = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        java.text.NumberFormat money = java.text.NumberFormat.getCurrencyInstance(new java.util.Locale("pt","BR"));
        p.edit().putInt("today_count_int", count).putString("today_count", String.valueOf(count))
            .putFloat("today_earnings_value", (float)earnings)
            .putString("today_earnings", money.format(earnings)).apply();
        Entrega365QuickComandaWidget.refreshAll(getContext());
        call.resolve();
    }

    @PluginMethod public void consumePendingComandas(PluginCall call) {
        SharedPreferences p = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String pending = p.getString("pending_comandas", "[]");
        p.edit().putString("pending_comandas", "[]").apply();
        JSObject result = new JSObject();
        result.put("items", pending);
        call.resolve(result);
    }
}