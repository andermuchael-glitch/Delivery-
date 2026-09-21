import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const android = path.join(root, "android");
const app = path.join(android, "app");
const src = path.join(app, "src", "main");
const javaDir = path.join(src, "java", "br", "com", "entrega365", "app");

await mkdir(javaDir, { recursive: true });

const service = `package br.com.entrega365.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class LocationTrackingService extends Service {
    private static final String CHANNEL_ID = "entrega365_location";
    private static final int NOTIFICATION_ID = 36501;
    private LocationManager locationManager;

    private final LocationListener listener = new LocationListener() {
        @Override public void onLocationChanged(Location location) {
            getSharedPreferences("entrega365_location", MODE_PRIVATE)
                .edit()
                .putLong("time", System.currentTimeMillis())
                .putString("lat", String.valueOf(location.getLatitude()))
                .putString("lng", String.valueOf(location.getLongitude()))
                .putString("accuracy", String.valueOf(location.getAccuracy()))
                .putString("provider", location.getProvider() == null ? "" : location.getProvider())
                .apply();
        }
    };

    @Override public void onCreate() {
        super.onCreate();
        createChannel();
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Entrega365")
            .setContentText("Localização em segundo plano ativa")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();

        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        requestUpdates();
    }

    private void requestUpdates() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            stopSelf();
            return;
        }

        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER, 10000L, 10f, listener, Looper.getMainLooper());
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER, 15000L, 25f, listener, Looper.getMainLooper());
            }
        } catch (SecurityException e) {
            stopSelf();
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Localização do Entrega365", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Indica quando o Entrega365 está acompanhando a localização.");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        requestUpdates();
        return START_STICKY;
    }

    @Override public void onDestroy() {
        if (locationManager != null) {
            try { locationManager.removeUpdates(listener); } catch (Exception ignored) {}
        }
        stopForeground(true);
        super.onDestroy();
    }

    @Nullable @Override public IBinder onBind(Intent intent) { return null; }
}
`;

const plugin = `package br.com.entrega365.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PluginMethod;

@CapacitorPlugin(
    name = "BackgroundLocation",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "backgroundLocation",
            strings = {
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            }
        )
    }
)
public class BackgroundLocationPlugin extends Plugin {
    private static final int SETTINGS_REQUEST = 36510;

    @PluginMethod
    public void start(PluginCall call) {
        if (!hasForegroundLocation()) {
            requestPermissionForAlias("location", call, "locationPermissionsCallback");
            return;
        }
        if (Build.VERSION.SDK_INT >= 30 && !hasBackgroundLocation()) {
            openLocationSettings(call);
            return;
        }
        if (Build.VERSION.SDK_INT >= 29 && !hasBackgroundLocation()) {
            requestPermissionForAlias("backgroundLocation", call, "backgroundPermissionsCallback");
            return;
        }
        startService();
        JSObject ret = statusObject();
        ret.put("running", true);
        call.resolve(ret);
    }

    @ActivityCallback
    private void locationPermissionsCallback(PluginCall call) {
        if (!hasForegroundLocation()) {
            call.reject("Permissão de localização não concedida.");
            return;
        }
        if (Build.VERSION.SDK_INT >= 30 && !hasBackgroundLocation()) {
            openLocationSettings(call);
            return;
        }
        startService();
        JSObject ret = statusObject();
        ret.put("running", true);
        call.resolve(ret);
    }

    @ActivityCallback
    private void backgroundPermissionsCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 29 && !hasBackgroundLocation()) {
            call.reject("Permissão de localização em segundo plano não concedida.");
            return;
        }
        startService();
        JSObject ret = statusObject();
        ret.put("running", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void openBackgroundSettings(PluginCall call) {
        openLocationSettings(call);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), LocationTrackingService.class));
        JSObject ret = statusObject();
        ret.put("running", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(statusObject());
    }

    private void startService() {
        Intent intent = new Intent(getContext(), LocationTrackingService.class);
        ContextCompat.startForegroundService(getContext(), intent);
    }

    private boolean hasForegroundLocation() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasBackgroundLocation() {
        if (Build.VERSION.SDK_INT < 29) return true;
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void openLocationSettings(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Atividade do aplicativo indisponível.");
            return;
        }
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        activity.startActivityForResult(intent, SETTINGS_REQUEST);
        JSObject ret = statusObject();
        ret.put("running", false);
        ret.put("backgroundRequired", true);
        call.resolve(ret);
    }

    private JSObject statusObject() {
        JSObject ret = new JSObject();
        ret.put("foreground", hasForegroundLocation());
        ret.put("background", hasBackgroundLocation());
        return ret;
    }
}
`;

await writeFile(path.join(javaDir, "LocationTrackingService.java"), service);
await writeFile(path.join(javaDir, "BackgroundLocationPlugin.java"), plugin);

const manifestPath = path.join(src, "AndroidManifest.xml");
let manifest = await readFile(manifestPath, "utf8");

for (const permission of [
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_BACKGROUND_LOCATION",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_LOCATION"
]) {
  if (!manifest.includes('android:name="' + permission + '"')) {
    manifest = manifest.replace("<manifest", '<manifest');
    manifest = manifest.replace(/(<manifest[^>]*>)/, "$1\n    <uses-permission android:name=\"" + permission + "\" />");
  }
}

if (!manifest.includes("android.permission.POST_NOTIFICATIONS")) {
  manifest = manifest.replace(/(<manifest[^>]*>)/, "$1\\n    <uses-permission android:name=\"android.permission.POST_NOTIFICATIONS\" />");
}

if (!manifest.includes("LocationTrackingService")) {
  manifest = manifest.replace("</application>", `    <service
        android:name=".LocationTrackingService"
        android:exported="false"
        android:foregroundServiceType="location" />
    </application>`);
}
await writeFile(manifestPath, manifest);

const activityPath = path.join(javaDir, "MainActivity.java");
let activity = await readFile(activityPath, "utf8");
if (!activity.includes("BackgroundLocationPlugin")) {
  activity = activity.replace(
    /package ([^;]+);/,
    "package $1;\n\nimport com.getcapacitor.BridgeActivity;"
  );
  activity = activity.replace(
    /public class MainActivity extends BridgeActivity\\s*\\{/,
    "public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n        registerPlugin(BackgroundLocationPlugin.class);\n        super.onCreate(savedInstanceState);\n    }"
  );
}
await writeFile(activityPath, activity);

console.log("Entrega365: localização em segundo plano preparada no projeto Android.");
