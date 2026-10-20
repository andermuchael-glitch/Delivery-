package br.com.entrega365.location

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.Executors

class LocationForegroundService : Service(), LocationListener {
    companion object {
        const val ACTION_START = "br.com.entrega365.location.START"
        const val PREFS = "e365_location_service"
        private const val CHANNEL_ID = "entrega365_gps_tracking"
        private const val NOTIFICATION_ID = 3651
        private const val TAG = "E365Location"
    }

    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var locationManager: LocationManager
    private val prefs by lazy { getSharedPreferences(PREFS, Context.MODE_PRIVATE) }
    @Volatile private var endpoint = ""
    @Volatile private var idToken = ""
    @Volatile private var refreshToken = ""
    @Volatile private var apiKey = ""
    @Volatile private var displayName = "Motoboy"

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action != ACTION_START) {
            stopSelf()
            return START_NOT_STICKY
        }
        endpoint = intent.getStringExtra("endpoint") ?: ""
        idToken = intent.getStringExtra("idToken") ?: ""
        refreshToken = intent.getStringExtra("refreshToken") ?: ""
        apiKey = intent.getStringExtra("apiKey") ?: ""
        displayName = intent.getStringExtra("displayName") ?: "Motoboy"
        prefs.edit().putBoolean("active", true).apply()

        startForeground(NOTIFICATION_ID, buildNotification("Compartilhando GPS durante o expediente"))
        try {
            if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != android.content.pm.PackageManager.PERMISSION_GRANTED &&
                checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                stopSelf()
                return START_NOT_STICKY
            }
            locationManager.removeUpdates(this)
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 10000L, 0f, this, Looper.getMainLooper())
            locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)?.let { onLocationChanged(it) }
        } catch (error: Exception) {
            Log.e(TAG, "Não foi possível iniciar GPS", error)
            updateNotification("GPS indisponível. Verifique as permissões.")
        }
        return START_STICKY
    }

    override fun onLocationChanged(location: Location) {
        if (endpoint.isBlank() || idToken.isBlank()) return
        val payload = JSONObject().apply {
            put("latitude", location.latitude)
            put("longitude", location.longitude)
            put("accuracy", if (location.hasAccuracy()) location.accuracy else JSONObject.NULL)
            put("altitude", if (location.hasAltitude()) location.altitude else JSONObject.NULL)
            put("speed", if (location.hasSpeed()) location.speed else JSONObject.NULL)
            put("heading", if (location.hasBearing()) location.bearing else JSONObject.NULL)
        }.toString()
        executor.execute { sendLocation(payload, allowRefresh = true) }
    }

    private fun sendLocation(payload: String, allowRefresh: Boolean) {
        try {
            var responseCode = post(payload, idToken)
            if (responseCode == 401 && allowRefresh && refreshIdToken()) {
                responseCode = post(payload, idToken)
            }
            if (responseCode in 200..299) {
                updateNotification("GPS atualizado · " + java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault()).format(java.util.Date()))
            } else {
                Log.w(TAG, "Servidor respondeu HTTP $responseCode")
                updateNotification("GPS ativo · aguardando conexão com servidor")
            }
        } catch (error: Exception) {
            Log.w(TAG, "Falha ao enviar posição; nova tentativa na próxima leitura", error)
            updateNotification("GPS ativo · sem conexão com servidor")
        }
    }

    private fun post(payload: String, token: String): Int {
        val connection = URL(endpoint).openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.connectTimeout = 12000
        connection.readTimeout = 12000
        connection.doOutput = true
        connection.setRequestProperty("Content-Type", "application/json")
        connection.setRequestProperty("Authorization", "Bearer $token")
        connection.outputStream.use { it.write(payload.toByteArray(Charsets.UTF_8)) }
        val code = connection.responseCode
        connection.disconnect()
        return code
    }

    private fun refreshIdToken(): Boolean {
        if (refreshToken.isBlank() || apiKey.isBlank()) return false
        return try {
            val url = URL("https://securetoken.googleapis.com/v1/token?key=" + URLEncoder.encode(apiKey, "UTF-8"))
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.connectTimeout = 12000
            connection.readTimeout = 12000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
            val body = "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(refreshToken, "UTF-8")
            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val response = stream.bufferedReader().use(BufferedReader::readText)
            connection.disconnect()
            if (code !in 200..299) return false
            val json = JSONObject(response)
            idToken = json.optString("id_token", idToken)
            refreshToken = json.optString("refresh_token", refreshToken)
            prefs.edit().putString("idToken", idToken).putString("refreshToken", refreshToken).apply()
            true
        } catch (error: Exception) {
            Log.w(TAG, "Não foi possível renovar o token Firebase", error)
            false
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, "Rastreamento Entrega365", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Indica quando o GPS do motoboy está sendo compartilhado"
                setShowBadge(false)
            })
        }
    }

    private fun buildNotification(message: String): Notification {
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            Notification.Builder(this, CHANNEL_ID) else Notification.Builder(this)
        return builder.setContentTitle("Entrega365 · GPS ativo")
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()
    }

    private fun updateNotification(message: String) {
        try {
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .notify(NOTIFICATION_ID, buildNotification(message))
        } catch (error: Exception) {
            Log.w(TAG, "Não foi possível atualizar notificação", error)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        try { locationManager.removeUpdates(this) } catch (_: Exception) {}
        prefs.edit().putBoolean("active", false).apply()
        executor.shutdown()
        super.onDestroy()
    }
}
