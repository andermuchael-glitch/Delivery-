package br.com.entrega365.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

public class QuickComandaActivity extends Activity {
    private static final String PREFS = "entrega365_quick_comanda";

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        WindowManager.LayoutParams lp=getWindow().getAttributes();
        lp.dimAmount=0.55f;
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);

        String field=getIntent().getStringExtra("field");
        boolean numero="numero".equals(field);
        SharedPreferences prefs=getSharedPreferences(PREFS,Context.MODE_PRIVATE);

        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(28,24,28,22);
        GradientDrawable bg=new GradientDrawable();
        bg.setColor(Color.rgb(30,30,30)); bg.setCornerRadius(28);
        root.setBackground(bg);

        TextView title=new TextView(this);
        title.setText(numero ? "Número da comanda" : "Taxa da comanda");
        title.setTextColor(Color.WHITE); title.setTextSize(21); title.setGravity(Gravity.CENTER);
        root.addView(title,new LinearLayout.LayoutParams(-1,-2));

        EditText input=new EditText(this);
        input.setSingleLine(true); input.setTextColor(Color.WHITE); input.setHintTextColor(Color.LTGRAY);
        input.setHint(numero ? "Ex.: 12345" : "Ex.: 8,00");
        input.setText(numero ? prefs.getString("numero","") : prefs.getString("taxa",""));
        input.setTextSize(20);
        root.addView(input,new LinearLayout.LayoutParams(-1,-2));

        Button save=new Button(this);
        save.setText("SALVAR");
        save.setOnClickListener(v -> {
            String value=input.getText().toString().trim();
            if(numero) prefs.edit().putString("numero",value).apply();
            else prefs.edit().putString("taxa",value.replace(",", ".")).apply();
            refreshWidgets(); finish();
        });
        root.addView(save,new LinearLayout.LayoutParams(-1,-2));

        Button cancel=new Button(this); cancel.setText("CANCELAR"); cancel.setOnClickListener(v->finish());
        root.addView(cancel,new LinearLayout.LayoutParams(-1,-2));

        setContentView(root);
        input.requestFocus();
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE);
    }

    private void refreshWidgets() {
        AppWidgetManager manager=AppWidgetManager.getInstance(this);
        int[] ids=manager.getAppWidgetIds(new android.content.ComponentName(this,Entrega365QuickComandaWidget.class));
        for(int id:ids) Entrega365QuickComandaWidget.updateWidget(this,manager,id);
    }
}