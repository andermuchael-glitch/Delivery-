package br.com.entrega365.location

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionCallback
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback as CapacitorPermissionCallback

@CapacitorPlugin(
    name = "Entrega365Location",
    permissions = [
        Permission(
            alias = "location",
            strings = [Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION]
        )
    ]
)
class Entrega365LocationPlugin : Plugin() {
    @PluginMethod
    fun startTracking(call: PluginCall) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "startTrackingPermissionResult")
            return
        }
        startService(call)
    }

    @CapacitorPermissionCallback
    private fun startTrackingPermissionResult(call: PluginCall) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            call.reject("Permita o acesso à localização para iniciar o rastreamento.")
            return
        }
        startService(call)
    }

    private fun startService(call: PluginCall) {
        val endpoint = call.getString("endpoint") ?: "https://www.entrega365.com.br/api/location-update"
        val idToken = call.getString("idToken") ?: ""
        val refreshToken = call.getString("refreshToken") ?: ""
        val apiKey = call.getString("apiKey") ?: ""
        val displayName = call.getString("displayName") ?: "Motoboy"
        if (idToken.isBlank() || endpoint.isBlank()) {
            call.reject("Sessão de autenticação inválida. Entre novamente no Entrega365.")
            return
        }
        val intent = Intent(context, LocationForegroundService::class.java).apply {
            action = LocationForegroundService.ACTION_START
            putExtra("endpoint", endpoint)
            putExtra("idToken", idToken)
            putExtra("refreshToken", refreshToken)
            putExtra("apiKey", apiKey)
            putExtra("displayName", displayName)
            putExtra("email", bridge.getSavedCall(call.callbackId)?.getString("email") ?: "")
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
            else context.startService(intent)
            call.resolve(JSObject().put("started", true))
        } catch (error: Exception) {
            call.reject("Não foi possível iniciar o serviço GPS: " + error.message, error)
        }
    }

    @PluginMethod
    fun stopTracking(call: PluginCall) {
        context.stopService(Intent(context, LocationForegroundService::class.java))
        call.resolve(JSObject().put("stopped", true))
    }

    @PluginMethod
    fun isTracking(call: PluginCall) {
        val prefs = context.getSharedPreferences(LocationForegroundService.PREFS, 0)
        call.resolve(JSObject().put("active", prefs.getBoolean("active", false)))
    }
}
