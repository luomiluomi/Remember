package app.remember.preview;

import android.graphics.*;
import android.graphics.drawable.*;
import android.view.*;
import android.widget.*;
import android.os.*;
import java.util.*;

final class CompanionOverlay {
    final ScreenCompanionService service;
    final FrameLayout root;
    final WindowManager windows;
    final WindowManager.LayoutParams params;
    final ImageView avatar;
    final LinearLayout card;
    final TextView status, speech, transcript;
    final ScrollView scroll;
    EditText input;
    final int surface,ink,muted,accent,tint;
    int x=16,y=220;
    boolean open, talking;
    final Handler handler=new Handler(Looper.getMainLooper());
    final Runnable dismiss=()->{talking=false;place();};

    CompanionOverlay(ScreenCompanionService s) {
        service=s;windows=(WindowManager)s.getSystemService(s.WINDOW_SERVICE);
        surface=color("surface","#FFFDFA");ink=color("ink","#25211E");
        muted=color("muted","#625B53");accent=color("accent","#A52626");tint=color("tint","#F8E9E6");
        root=new FrameLayout(s);
        avatar=new ImageView(s);avatar.setScaleType(ImageView.ScaleType.CENTER_CROP);
        avatar.setBackground(shape(tint,28));avatar.setClipToOutline(true);avatar.setElevation(dp(5));
        avatar.setContentDescription("打开角色聊天，拖动可移动");
        try {
            String source=s.config.optString("avatar");byte[] data=android.util.Base64.decode(source.substring(source.indexOf(',')+1),0);
            avatar.setImageBitmap(BitmapFactory.decodeByteArray(data,0,data.length));
        }catch(Exception e){avatar.setImageResource(android.R.drawable.ic_dialog_info);avatar.setPadding(dp(12),dp(12),dp(12),dp(12));}
        speech=new TextView(s);speech.setTextSize(14);speech.setTextColor(ink);speech.setPadding(dp(16),dp(13),dp(16),dp(13));
        speech.setMaxLines(5);speech.setEllipsize(android.text.TextUtils.TruncateAt.END);
        speech.setElevation(dp(3));speech.setOnClickListener(v->{open=true;talking=false;place();});
        card=new LinearLayout(s);card.setOrientation(1);card.setPadding(dp(16),dp(12),dp(16),dp(12));card.setBackground(shape(surface,22));card.setElevation(dp(6));
        LinearLayout header=new LinearLayout(s);header.setGravity(Gravity.CENTER_VERTICAL);
        TextView title=text(s.config.optString("name","Memory"),16,ink);title.setTypeface(null,1);
        header.addView(title,new LinearLayout.LayoutParams(0,-2,1));header.addView(button("收起",()->{open=false;input.clearFocus();((android.view.inputmethod.InputMethodManager)s.getSystemService(s.INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(input.getWindowToken(),0);place();}));
        card.addView(header);
        status=text("陪伴中 · 截图与语音识别可能消耗额度",11,muted);status.setPadding(0,dp(3),0,dp(5));card.addView(status);
        scroll=new ScrollView(s);scroll.setFillViewport(true);
        transcript=text("",14,ink);transcript.setLineSpacing(dp(4),1f);transcript.setTextIsSelectable(true);
        scroll.addView(transcript);card.addView(scroll,new LinearLayout.LayoutParams(-1,0,1f));
        transcript.setText("可以直接打字，或按住下方按钮说话。");
        LinearLayout composer=new LinearLayout(s);composer.setGravity(Gravity.CENTER_VERTICAL);composer.setBackground(shape(tint,16));composer.setPadding(dp(10),dp(3),dp(5),dp(3));
        input=new EditText(s);input.setTextColor(ink);input.setHintTextColor(muted);input.setTextSize(14);input.setHint("说点什么…");input.setMaxLines(3);input.setBackgroundColor(Color.TRANSPARENT);
        TextView voice=button("按住说话",()->{});
        voice.setGravity(Gravity.CENTER);voice.setVisibility(View.GONE);
        TextView mode=button("语音",()->{
            boolean voiceMode=voice.getVisibility()!=View.VISIBLE;
            voice.setVisibility(voiceMode?View.VISIBLE:View.GONE);input.setVisibility(voiceMode?View.GONE:View.VISIBLE);
            ((android.view.inputmethod.InputMethodManager)s.getSystemService(s.INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(input.getWindowToken(),0);
        });
        composer.addView(mode);
        composer.addView(input,new LinearLayout.LayoutParams(0,dp(40),1));
        composer.addView(voice,new LinearLayout.LayoutParams(0,dp(40),1));
        composer.addView(button("发送",()->{String value=input.getText().toString().trim();if(!value.isEmpty()&&!s.busy){input.setText("");s.request(value,false);}}));
        voice.setOnTouchListener((v,e)->{
            if(e.getAction()==MotionEvent.ACTION_DOWN){s.startVoice();return true;}
            if(e.getAction()==MotionEvent.ACTION_UP){s.finishVoice(true);voice.setVisibility(View.GONE);input.setVisibility(View.VISIBLE);return true;}
            if(e.getAction()==MotionEvent.ACTION_CANCEL){s.finishVoice(false);return true;}return true;
        });
        card.addView(composer);
        TextView menu=button("更多",()->{});
        menu.setOnClickListener(v->{
            LinearLayout options=new LinearLayout(s);options.setOrientation(1);options.setPadding(dp(8),dp(8),dp(8),dp(8));options.setBackground(shape(surface,16));
            PopupWindow popup=new PopupWindow(options,dp(190),-2,true);
            options.addView(button("看一眼屏幕",()->{popup.dismiss();s.request("看看当前屏幕，结合我们的对话回应。",true);}));
            options.addView(button(s.quiet?"恢复主动陪伴":"安静陪伴",()->{s.quiet=!s.quiet;status.setText(s.quiet?"安静陪伴":"陪伴中");s.schedule();popup.dismiss();}));
            options.addView(button(s.paused?"恢复屏幕观察":"暂停屏幕观察",()->{s.paused=!s.paused;status.setText(s.paused?"观察已暂停":"观察已恢复");s.schedule();popup.dismiss();}));
            options.addView(button("结束陪伴",()->{popup.dismiss();s.stopSelf();}));
            popup.setBackgroundDrawable(shape(surface,16));popup.setElevation(dp(8));popup.setOutsideTouchable(true);popup.showAsDropDown(menu);
        });
        header.addView(menu,1);
        root.addView(card);root.addView(speech);root.addView(avatar);
        params=new WindowManager.LayoutParams(dp(56),dp(56),WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,PixelFormat.TRANSLUCENT);
        params.gravity=Gravity.TOP|Gravity.LEFT;params.softInputMode=WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;
        windows.addView(root,params);
        float[] drag=new float[4];
        avatar.setOnTouchListener((v,e)->{
            if(e.getAction()==0){drag[0]=e.getRawX();drag[1]=e.getRawY();drag[2]=x;drag[3]=y;return true;}
            if(e.getAction()==2){x=(int)(drag[2]+e.getRawX()-drag[0]);y=(int)(drag[3]+e.getRawY()-drag[1]);place();return true;}
            if(e.getAction()==1){
                if(Math.abs(e.getRawX()-drag[0])+Math.abs(e.getRawY()-drag[1])<dp(8)){open=!open;talking=false;if(!open){input.clearFocus();((android.view.inputmethod.InputMethodManager)service.getSystemService(service.INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(input.getWindowToken(),0);}}
                else {int width=s.getResources().getDisplayMetrics().widthPixels;x=x<width/2?dp(8):width-dp(64);}
                place();return true;
            }return true;
        });
        place();
    }
    int dp(int n){return service.dp(n);}
    int color(String key,String fallback){try{return Color.parseColor(service.config.optJSONObject("theme").optString(key,fallback));}catch(Exception e){return Color.parseColor(fallback);}}
    GradientDrawable shape(int color,int radius){GradientDrawable bg=new GradientDrawable();bg.setColor(color);bg.setCornerRadius(dp(radius));return bg;}
    TextView text(String value,int size,int color){TextView v=new TextView(service);v.setText(value);v.setTextSize(size);v.setTextColor(color);return v;}
    TextView button(String value,Runnable action){TextView v=text(value,12,accent);v.setPadding(dp(9),dp(7),dp(9),dp(7));v.setOnClickListener(w->action.run());return v;}
    void place(){
        android.util.DisplayMetrics metrics=service.getResources().getDisplayMetrics();int sw=metrics.widthPixels,sh=metrics.heightPixels;
        int a=dp(52),margin=dp(8),top=dp(32),bottom=sh-dp(40);
        x=Math.max(margin,Math.min(sw-a-margin,x));y=Math.max(top,Math.min(bottom-a,y));
        boolean left=x+a/2<sw/2,below=y<(sh/2);
        int cardWidth=Math.min(dp(340),sw-2*margin);
        int cardHeight=Math.min(dp(450),bottom-top-a-dp(8));
        boolean compact=sh<dp(500);
        if(compact)cardHeight=Math.min(dp(450),bottom-top);
        int width=open?cardWidth+(compact?a+dp(8):0):talking?Math.min(dp(292),sw-2*margin):a;
        int height=open?cardHeight+(compact?0:a+dp(8)):talking?dp(174):a;
        int wx=left?x:x+a-width;wx=Math.max(margin,Math.min(sw-width-margin,wx));
        int wy=below?y:y+a-height;wy=Math.max(top,Math.min(bottom-height,wy));
        int avatarX=compact&&open?(left?0:width-a):x-wx,avatarY=below?0:height-a;
        FrameLayout.LayoutParams ap=new FrameLayout.LayoutParams(a,a);ap.leftMargin=avatarX;ap.topMargin=avatarY;avatar.setLayoutParams(ap);
        FrameLayout.LayoutParams cp=new FrameLayout.LayoutParams(cardWidth,cardHeight);cp.topMargin=compact?0:below?a+dp(8):0;cp.leftMargin=compact&&left?a+dp(8):0;card.setLayoutParams(cp);card.setVisibility(open?View.VISIBLE:View.GONE);
        int bubbleWidth=Math.max(dp(120),width-a-dp(10));
        FrameLayout.LayoutParams sp=new FrameLayout.LayoutParams(bubbleWidth,dp(120));
        sp.leftMargin=left?a+dp(10):0;sp.topMargin=below?dp(8):Math.max(0,height-dp(128));speech.setLayoutParams(sp);
        // Tail corner follows the avatar: left/right and above/below.
        float r=dp(18),tip=dp(3);float[] corners={r,r,r,r,r,r,r,r};
        int corner=left?(below?0:6):(below?2:4);corners[corner]=tip;corners[corner+1]=tip;
        GradientDrawable bubbleBg=new GradientDrawable();bubbleBg.setColor(surface);bubbleBg.setCornerRadii(corners);speech.setBackground(bubbleBg);
        speech.setVisibility(!open&&talking?View.VISIBLE:View.GONE);
        params.x=wx;params.y=wy;params.width=width;params.height=height;
        params.flags=open?WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL:WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
        windows.updateViewLayout(root,params);
    }
    void speak(String value){speech.setText(value);if(!open){talking=true;place();handler.removeCallbacks(dismiss);handler.postDelayed(dismiss,15000);}}
    void line(String value){if(transcript.getText().toString().equals("可以直接打字，或按住下方按钮说话。"))transcript.setText("");transcript.append(value+"\n\n");scroll.post(()->scroll.fullScroll(View.FOCUS_DOWN));}
    void close(){handler.removeCallbacksAndMessages(null);}
}
