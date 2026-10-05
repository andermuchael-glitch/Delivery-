package br.com.entrega365.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class Entrega365QuickComandaWidget extends AppWidgetProvider {
    private static final int REQUEST_CODE = 36501;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_comanda);

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setAction("br.com.entrega365.app.QUICK_COMANDA");
            launchIntent.putExtra("entrega365_quick_action", "new_comanda");
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                REQUEST_CODE,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            views.setOnClickPendingIntent(R.id.widget_quick_comanda_button, pendingIntent);
            manager.updateAppWidget(appWidgetId, views);
        }
    }
}
