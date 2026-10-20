package br.com.entrega365.location;

import android.Manifest;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "Entrega365Location",
    permissions = {
        @Permission(
            alias = "location",
            strings = { Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION }
        )
    }
)
public class Entrega365LocationPlugin extends Plugin {
    @PluginMethod
    public void startTracking(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "locationPermissionResult");
            return;
        }
        startService(call);
    }

    @PermissionCallback
    private void locationPermissionResult(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            call.reject("Permita o acesso à localização para iniciar o rastreamento.");
            return;
        }
        startService(call);
    }

    private void startService(PluginCall call) {
        String endpoint = call.getString("endpoint", "https://www.entrega365.com.br/api/location-update");
        String idToken = call.getString("idToken", "");
        String refreshToken = call.getString("refreshToken", "");
        String apiKey = call.getString("apiKey", "");
        String displayName = call.getString("displayName", "Motoboy");
        if (idToken.isEmpty() || endpoint.isEmpty()) {
            call.reject("Sessão de autenticação inválida. Entre novamente no Entrega365.");
            return;
        }
        Intent intent = new Intent(getContext(), LocationForegroundService.class);
        intent.setAction(LocationForegroundService.ACTION_START);
        intent.putExtra("endpoint", endpoint);
        intent.putExtra("idToken", idToken);
        intent.putExtra("refreshToken", refreshToken);
        intent.putExtra("apiKey", apiKey);
        intent.putExtra("displayName", displayName);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) getContext().startForegroundService(intent);
            else getContext().startService(intent);
            JSObject result = new JSObject();
            result.put("started", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Não foi possível iniciar o serviço GPS: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        getContext().stopService(new Intent(getContext(), LocationForegroundService.class));
        JSObject result = new JSObject();
        result.put("stopped", true);
        call.resolve(result);
    }

    @PluginMethod
    public void isTracking(PluginCall call) {
        boolean active = getContext()
            .getSharedPreferences(LocationForegroundService.PREFS, 0)
            .getBoolean("active", false);
        JSObject result = new JSObject();
        result.put("active", active);
        call.resolve(result);
    }
}
