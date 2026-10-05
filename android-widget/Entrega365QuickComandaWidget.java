package br.com.entrega365.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class Entrega365QuickComandaWidget extends AppWidgetProvider {
    private static final int REQUEST_CODE_BASE = 36510;
    private static final String PREFS = "entrega365_quick_comanda";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, manager, appWidgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
    }

    static void updateWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_comanda);
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        String numero = prefs.getString("numero", "");
        String taxa = prefs.getString("taxa", "");
        boolean conferida = prefs.getBoolean("conferida", false);

        views.setTextViewText(R.id.widget_comanda_numero, numero.isEmpty() ? "Nº" : numero);
        views.setTextViewText(R.id.widget_comanda_taxa, taxa.isEmpty() ? "Taxa R$" : "R$ " + taxa);
        views.setTextViewText(R.id.widget_comanda_status, conferida ? "Conferida" : "Pendente");
        views.setTextViewText(R.id.widget_comanda_counter, conferida ? "1/1 conferidas" : "0/1 conferidas");
        views.setTextViewText(R.id.widget_comanda_check, conferida ? "✓" : "");

        Intent numeroIntent = new Intent(context, QuickComandaActivity.class);
        numeroIntent.putExtra("field", "numero");
        views.setOnClickPendingIntent(
            R.id.widget_comanda_numero,
            PendingIntent.getActivity(context, REQUEST_CODE_BASE + 1, numeroIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)
        );

        Intent taxaIntent = new Intent(context, QuickComandaActivity.class);
        taxaIntent.putExtra("field", "taxa");
        views.setOnClickPendingIntent(
            R.id.widget_comanda_taxa,
            PendingIntent.getActivity(context, REQUEST_CODE_BASE + 2, taxaIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)
        );

        Intent checkIntent = new Intent(context, Entrega365QuickComandaWidget.class);
        checkIntent.setAction("br.com.entrega365.app.CHECK_COMANDA");
        checkIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        views.setOnClickPendingIntent(
            R.id.widget_comanda_check,
            PendingIntent.getBroadcast(context, REQUEST_CODE_BASE + 3, checkIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)
        );

        Intent deleteIntent = new Intent(context, Entrega365QuickComandaWidget.class);
        deleteIntent.setAction("br.com.entrega365.app.DELETE_COMANDA");
        deleteIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        views.setOnClickPendingIntent(
            R.id.widget_comanda_delete,
            PendingIntent.getBroadcast(context, REQUEST_CODE_BASE + 4, deleteIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)
        );

        manager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (intent == null || intent.getAction() == null) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        if ("br.com.entrega365.app.CHECK_COMANDA".equals(intent.getAction())) {
            boolean checked = prefs.getBoolean("conferida", false);
            prefs.edit().putBoolean("conferida", !checked).apply();
        } else if ("br.com.entrega365.app.DELETE_COMANDA".equals(intent.getAction())) {
            prefs.edit().clear().apply();
        }

        if ("br.com.entrega365.app.CHECK_COMANDA".equals(intent.getAction())
                || "br.com.entrega365.app.DELETE_COMANDA".equals(intent.getAction())) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(
                new android.content.ComponentName(context, Entrega365QuickComandaWidget.class)
            );
            for (int id : ids) updateWidget(context, manager, id);
        }
    }
}
