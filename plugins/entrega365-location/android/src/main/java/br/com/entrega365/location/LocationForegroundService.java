package br.com.entrega365.location;

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
import android.util.Log;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LocationForegroundService extends Service implements LocationListener {
    public static final String ACTION_START = "br.com.entrega365.location.START";
    public static final String PREFS = "e365_location_service";
    private static final String CHANNEL_ID = "entrega365_gps_tracking";
    private static final int NOTIFICATION_ID = 3651;
    private static final String TAG = "E365Location";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private LocationManager locationManager;
    private String endpoint = "";
    private volatile String idToken = "";
    private volatile String refreshToken = "";
    private String apiKey = "";
    private String displayName = "Motoboy";

    private android.content.SharedPreferences prefs() {
        return getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_START.equals(intent.getAction())) {
            endpoint = intent.getStringExtra("endpoint");
            idToken = intent.getStringExtra("idToken");
            refreshToken = intent.getStringExtra("refreshToken");
            apiKey = intent.getStringExtra("apiKey");
            displayName = intent.getStringExtra("displayName");
            if (endpoint == null) endpoint = "";
            if (idToken == null) idToken = "";
            if (refreshToken == null) refreshToken = "";
            if (apiKey == null) apiKey = "";
            if (displayName == null) displayName = "Motoboy";
            prefs().edit()
                .putBoolean("active", true)
                .putString("endpoint", endpoint)
                .putString("idToken", idToken)
                .putString("refreshToken", refreshToken)
                .putString("apiKey", apiKey)
                .putString("displayName", displayName)
                .apply();
        } else {
            if (!prefs().getBoolean("active", false)) {
                stopSelf();
                return START_NOT_STICKY;
            }
            endpoint = prefs().getString("endpoint", "");
            idToken = prefs().getString("idToken", "");
            refreshToken = prefs().getString("refreshToken", "");
            apiKey = prefs().getString("apiKey", "");
            displayName = prefs().getString("displayName", "Motoboy");
            if (endpoint == null) endpoint = "";
            if (idToken == null) idToken = "";
            if (refreshToken == null) refreshToken = "";
            if (apiKey == null) apiKey = "";
            if (displayName == null) displayName = "Motoboy";
        }

        if (endpoint.isEmpty() || idToken.isEmpty()) {
            stopSelf();
            return START_NOT_STICKY;
        }

        startForeground(NOTIFICATION_ID, buildNotification("Compartilhando GPS durante o expediente"));
        try {
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                && checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                updateNotification("Permissão de localização necessária");
                stopSelf();
                return START_NOT_STICKY;
            }
            locationManager.removeUpdates(this);
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 10000L, 0f, this, Looper.getMainLooper());
            Location last = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            if (last != null) onLocationChanged(last);
        } catch (Exception error) {
            Log.e(TAG, "Não foi possível iniciar GPS", error);
            updateNotification("GPS indisponível. Verifique as permissões.");
        }
        return START_STICKY;
    }

    @Override
    public void onLocationChanged(Location location) {
        if (endpoint.isEmpty() || idToken.isEmpty()) return;
        final String payload;
        try {
            JSONObject json = new JSONObject();
            json.put("latitude", location.getLatitude());
            json.put("longitude", location.getLongitude());
            json.put("accuracy", location.hasAccuracy() ? location.getAccuracy() : JSONObject.NULL);
            json.put("altitude", location.hasAltitude() ? location.getAltitude() : JSONObject.NULL);
            json.put("speed", location.hasSpeed() ? location.getSpeed() : JSONObject.NULL);
            json.put("heading", location.hasBearing() ? location.getBearing() : JSONObject.NULL);
            payload = json.toString();
        } catch (Exception error) {
            Log.e(TAG, "Não foi possível preparar coordenadas", error);
            return;
        }
        executor.execute(() -> sendLocation(payload, true));
    }

    private void sendLocation(String payload, boolean allowRefresh) {
        try {
            int code = post(payload, idToken);
            if (code == 401 && allowRefresh && refreshIdToken()) code = post(payload, idToken);
            if (code >= 200 && code < 300) {
                String time = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date());
                updateNotification("GPS atualizado · " + time);
            } else {
                Log.w(TAG, "Servidor respondeu HTTP " + code);
                updateNotification("GPS ativo · aguardando conexão com servidor");
            }
        } catch (Exception error) {
            Log.w(TAG, "Falha ao enviar posição; nova tentativa na próxima leitura", error);
            updateNotification("GPS ativo · sem conexão com servidor");
        }
    }

    private int post(String payload, String token) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setRequestMethod("POST");
        connection.setConnectTimeout(12000);
        connection.setReadTimeout(12000);
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Authorization", "Bearer " + token);
        try (OutputStream output = connection.getOutputStream()) {
            output.write(payload.getBytes(StandardCharsets.UTF_8));
        }
        int code = connection.getResponseCode();
        connection.disconnect();
        return code;
    }

    private boolean refreshIdToken() {
        if (refreshToken.isEmpty() || apiKey.isEmpty()) return false;
        HttpURLConnection connection = null;
        try {
            String url = "https://securetoken.googleapis.com/v1/token?key=" + URLEncoder.encode(apiKey, "UTF-8");
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(12000);
            connection.setReadTimeout(12000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            String body = "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(refreshToken, "UTF-8");
            try (OutputStream output = connection.getOutputStream()) {
                output.write(body.getBytes(StandardCharsets.UTF_8));
            }
            int code = connection.getResponseCode();
            InputStream stream = code >= 200 && code < 300 ? connection.getInputStream() : connection.getErrorStream();
            if (stream == null) return false;
            StringBuilder response = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) response.append(line);
            }
            if (code < 200 || code >= 300) return false;
            JSONObject json = new JSONObject(response.toString());
            idToken = json.optString("id_token", idToken);
            refreshToken = json.optString("refresh_token", refreshToken);
            prefs().edit().putString("idToken", idToken).putString("refreshToken", refreshToken).apply();
            return !idToken.isEmpty();
        } catch (Exception error) {
            Log.w(TAG, "Não foi possível renovar o token Firebase", error);
            return false;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Rastreamento Entrega365", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Indica quando o GPS do motoboy está sendo compartilhado");
            channel.setShowBadge(false);
            manager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification(String message) {
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);
        return builder.setContentTitle("Entrega365 · GPS ativo")
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build();
    }

    private void updateNotification(String message) {
        try {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            manager.notify(NOTIFICATION_ID, buildNotification(message));
        } catch (Exception error) {
            Log.w(TAG, "Não foi possível atualizar notificação", error);
        }
    }

    @Override public void onStatusChanged(String provider, int status, android.os.Bundle extras) {}
    @Override public void onProviderEnabled(String provider) {}
    @Override public void onProviderDisabled(String provider) {
        updateNotification("GPS desativado. Ative a localização do aparelho.");
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        try { locationManager.removeUpdates(this); } catch (Exception ignored) {}
        prefs().edit().putBoolean("active", false).apply();
        executor.shutdown();
        super.onDestroy();
    }
}
