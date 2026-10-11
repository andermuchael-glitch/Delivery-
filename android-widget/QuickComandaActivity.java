package br.com.entrega365.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.NumberFormat;
import java.util.Date;
import java.util.Locale;
import java.text.SimpleDateFormat;

public class QuickComandaActivity extends Activity {
    private static final String PREFS = "entrega365_quick_comanda";

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        WindowManager.LayoutParams lp=getWindow().getAttributes();
        lp.dimAmount=0.55f;
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);

        SharedPreferences prefs=getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(24,20,24,18);
        GradientDrawable bg=new GradientDrawable();
        bg.setColor(Color.rgb(30,30,30)); bg.setCornerRadius(24);
        root.setBackground(bg);

        TextView title=new TextView(this);
        title.setText("Nova comanda");
        title.setTextColor(Color.rgb(255,210,26)); title.setTextSize(20); title.setGravity(Gravity.CENTER);
        title.setPadding(0,0,0,8);
        root.addView(title,new LinearLayout.LayoutParams(-1,-2));

        EditText numero=new EditText(this);
        numero.setSingleLine(true); numero.setTextColor(Color.WHITE); numero.setHintTextColor(Color.LTGRAY);
        numero.setHint("Número da comanda"); numero.setInputType(InputType.TYPE_CLASS_NUMBER);
        root.addView(numero,new LinearLayout.LayoutParams(-1,-2));

        EditText taxa=new EditText(this);
        taxa.setSingleLine(true); taxa.setTextColor(Color.WHITE); taxa.setHintTextColor(Color.LTGRAY);
        taxa.setHint("Taxa (R$)"); taxa.setInputType(InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_FLAG_DECIMAL|InputType.TYPE_NUMBER_FLAG_SIGNED);
        root.addView(taxa,new LinearLayout.LayoutParams(-1,-2));

        Button save=new Button(this);
        save.setText("LANÇAR COMANDA");
        save.setOnClickListener(v -> {
            String n=numero.getText().toString().trim();
            String raw=taxa.getText().toString().trim().replace(",", ".");
            double amount=0;
            try { if(!raw.isEmpty()) amount=Double.parseDouble(raw); } catch(Exception ignored) {}
            if(n.isEmpty()){numero.setError("Informe o número");return;}
            if(amount<0){taxa.setError("Informe uma taxa válida");return;}
            try {
                JSONArray queue;
                String old=prefs.getString("pending_comandas","[]");
                queue=new JSONArray(old);
                JSONObject item=new JSONObject();
                item.put("numero",n); item.put("taxa",amount);
                item.put("date",new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()));
                queue.put(item);
                int count=prefs.getInt("today_count_int",0)+1;
                double total=(double)prefs.getFloat("today_earnings_value",0f)+amount;
                NumberFormat money=NumberFormat.getCurrencyInstance(new Locale("pt","BR"));
                prefs.edit().putString("pending_comandas",queue.toString())
                    .putInt("today_count_int",count)
                    .putString("today_count",String.valueOf(count))
                    .putFloat("today_earnings_value",(float)total)
                    .putString("today_earnings",money.format(total)).apply();
                Entrega365QuickComandaWidget.refreshAll(this);
                finish();
            } catch(Exception e) {
                taxa.setError("Não foi possível salvar. Tente novamente.");
            }
        });
        root.addView(save,new LinearLayout.LayoutParams(-1,-2));
        Button cancel=new Button(this); cancel.setText("CANCELAR"); cancel.setOnClickListener(v->finish());
        root.addView(cancel,new LinearLayout.LayoutParams(-1,-2));

        setContentView(root);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    }
}