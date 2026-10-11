package br.com.entrega365.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import java.text.NumberFormat;
import java.util.Locale;

public class Entrega365QuickComandaWidget extends AppWidgetProvider {
    static final String PREFS = "entrega365_quick_comanda";
    static final String ACTION_NEW = "br.com.entrega365.app.NEW_QUICK_COMANDA";
    static final int REQUEST_CODE = 36510;

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) updateWidget(context, manager, id);
    }

    static void updateWidget(Context context, AppWidgetManager manager, int id) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_comanda);
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String count = p.getString("today_count", "0");
        String earnings = p.getString("today_earnings", "R$ 0,00");
        views.setTextViewText(R.id.widget_today_count, count + " entregas hoje");
        views.setTextViewText(R.id.widget_today_earnings, earnings);
        Intent add = new Intent(context, QuickComandaActivity.class);
        add.setAction(ACTION_NEW);
        views.setOnClickPendingIntent(R.id.widget_new_comanda,
            PendingIntent.getActivity(context, REQUEST_CODE + id, add,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        manager.updateAppWidget(id, views);
    }

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, Entrega365QuickComandaWidget.class));
        for (int id : ids) updateWidget(context, manager, id);
    }

    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
    }
}