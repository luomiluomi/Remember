package app.remember.preview;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.*;
import java.io.IOException;
import java.util.Arrays;

public final class PreviewActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/index.html";
    private WebView web;
    private NativeVoice nativeVoice;
    private String screenConfig;
    private PermissionRequest microphone;
    private ValueCallback<Uri[]> chooser;

    private static boolean local(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) &&
            (uri.getPort() == -1 || uri.getPort() == 443);
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        if (android.os.Build.VERSION.SDK_INT >= 29) {
            getWindow().setNavigationBarContrastEnforced(false);
            getWindow().setStatusBarContrastEnforced(false);
        }
        web = new WebView(this);
        setContentView(web);
        web.setOnApplyWindowInsetsListener((view, insets) -> {
            float density = getResources().getDisplayMetrics().density;
            int top = insets.getSystemWindowInsetTop();
            int bottom = insets.getSystemWindowInsetBottom();
            String script = "document.documentElement.style.setProperty('--native-top','" +
                (top / density) + "px');document.documentElement.style.setProperty('--native-bottom','" +
                (bottom / density) + "px')";
            web.evaluateJavascript(script, null);
            return insets;
        });
        web.addJavascriptInterface(new Object() {
            @JavascriptInterface public void theme(String color, boolean dark) {
                if (!color.matches("#[0-9a-fA-F]{6}")) return;
                runOnUiThread(() -> {
                    web.setBackgroundColor(Color.parseColor(color));
                    int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                        View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
                    if (!dark) flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    getWindow().getDecorView().setSystemUiVisibility(flags);
                    web.requestApplyInsets();
                });
            }
        }, "RememberWindow");
        web.addJavascriptInterface(new Object() {
            @JavascriptInterface public void start(String json) {
                runOnUiThread(() -> {
                    if (!android.provider.Settings.canDrawOverlays(PreviewActivity.this)) {
                        startActivity(new Intent(android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:" + getPackageName())));
                        android.widget.Toast.makeText(PreviewActivity.this,"请允许悬浮窗后返回，再点击开始",android.widget.Toast.LENGTH_LONG).show();
                        return;
                    }
                    stopService(new Intent(PreviewActivity.this, ScreenCompanionService.class));
                    screenConfig = json;
                    startActivityForResult(((android.media.projection.MediaProjectionManager)getSystemService(MEDIA_PROJECTION_SERVICE))
                        .createScreenCaptureIntent(), 71);
                });
            }
            @JavascriptInterface public void stop() {
                runOnUiThread(() -> stopService(new Intent(PreviewActivity.this, ScreenCompanionService.class)));
            }
            @JavascriptInterface public String pending() {
                synchronized(ScreenCompanionService.events) { return ScreenCompanionService.events.isEmpty() ? getSharedPreferences("screen-pending",0).getString("events","[]") : "["+android.text.TextUtils.join(",",ScreenCompanionService.events)+"]"; }
            }
            @JavascriptInterface public void acknowledge(String id) {
                synchronized(ScreenCompanionService.events) {
                    if(ScreenCompanionService.events.isEmpty()) {
                        try { org.json.JSONArray saved=new org.json.JSONArray(getSharedPreferences("screen-pending",0).getString("events","[]"));
                            for(int i=0;i<saved.length();i++)ScreenCompanionService.events.add(saved.getJSONObject(i).toString());
                        } catch(Exception ignored){}
                    }
                    ScreenCompanionService.events.removeIf(e -> {try{return new org.json.JSONObject(e).getString("id").equals(id);}catch(Exception ex){return false;}});
                    getSharedPreferences("screen-pending",0).edit().putString("events","["+android.text.TextUtils.join(",",ScreenCompanionService.events)+"]").commit();
                }
            }
        }, "MemoryScreen");
        nativeVoice = new NativeVoice(this);
        web.addJavascriptInterface(new NativeLauncher(this), "MemoryLauncher");
        web.addJavascriptInterface(nativeVoice, "RememberMicrophone");
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        // The system file picker returns permission-scoped content:// URIs.
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setWebViewClient(new WebViewClient() {
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request,
                                                      WebResourceResponse response) {
                Uri url = request.getUrl();
                String path = url.getPath();
                if (local(url) && (request.isForMainFrame() ||
                        (path != null && path.startsWith("/static/js/main.")))) {
                    showStartupError();
                }
            }

            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!local(request.getUrl())) return null;
                String path = request.getUrl().getPath();
                if (path == null || path.contains("..") ||
                        !(path.equals("/index.html") || path.startsWith("/static/"))) {
                    return missing();
                }
                String mime = path.endsWith(".html") ? "text/html" :
                    path.endsWith(".js") ? "application/javascript" :
                    path.endsWith(".css") ? "text/css" :
                    path.endsWith(".png") ? "image/png" :
                    path.endsWith(".svg") ? "image/svg+xml" :
                    path.endsWith(".woff2") ? "font/woff2" :
                    path.endsWith(".woff") ? "font/woff" :
                    path.endsWith(".ttf") ? "font/ttf" : "application/octet-stream";
                try {
                    return new WebResourceResponse(mime, mime.startsWith("font/") || mime.startsWith("image/") ? null : "UTF-8",
                        getAssets().open(path.substring(1)));
                } catch (IOException ex) {
                    return missing();
                }
            }

            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (local(url)) return false;
                if (!request.isForMainFrame()) return true;
                if ("https".equals(url.getScheme()) || "http".equals(url.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, url)); }
                    catch (android.content.ActivityNotFoundException ignored) {}
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                if (!local(request.getOrigin()) || !Arrays.asList(request.getResources())
                        .contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                    request.deny();
                    return;
                }
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(new String[] {PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                } else if (microphone == null) {
                    microphone = request;
                    requestPermissions(new String[] {Manifest.permission.RECORD_AUDIO}, 1);
                } else {
                    request.deny();
                }
            }

            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (microphone == request) microphone = null;
            }

            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                                       FileChooserParams params) {
                if (chooser != null) chooser.onReceiveValue(null);
                chooser = callback;
                try { startActivityForResult(params.createIntent(), 2); }
                catch (android.content.ActivityNotFoundException ex) {
                    chooser = null;
                    callback.onReceiveValue(null);
                }
                return true;
            }
        });
        web.loadUrl(HOME);
    }

    private long lastBackAt = 0;
    @Override public void onBackPressed() {
        web.evaluateJavascript("(function(){return !window.dispatchEvent(new Event('remember-back',{cancelable:true}));})()", handled -> {
            if ("true".equals(handled)) { lastBackAt = 0; return; }
            if (web.getUrl() != null && web.getUrl().contains("#")) { web.goBack(); lastBackAt = 0; return; }
            long now = android.os.SystemClock.elapsedRealtime();
            if (now - lastBackAt < 2000) moveTaskToBack(true);
            else {
                lastBackAt = now;
                android.widget.Toast.makeText(this, "再返回一次回到桌面", android.widget.Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showStartupError() {
        new android.app.AlertDialog.Builder(this)
            .setTitle("记得未能加载")
            .setMessage("应用启动文件读取失败。请重试，或安装最新的预览版。")
            .setPositiveButton("重试", (dialog, which) -> web.loadUrl(HOME))
            .setNegativeButton("关闭", null)
            .show();
    }

    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
            java.util.Collections.emptyMap(), new java.io.ByteArrayInputStream(new byte[0]));
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grants) {
        super.onRequestPermissionsResult(requestCode, permissions, grants);
        if (requestCode != 1 || microphone == null) return;
        PermissionRequest request = microphone;
        microphone = null;
        if (grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED)
            request.grant(new String[] {PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        else request.deny();
    }

    @Override protected void onActivityResult(int request, int result, Intent intent) {
        super.onActivityResult(request, result, intent);
        if (request == 71) {
            if (result == RESULT_OK && intent != null && screenConfig != null) {
                ScreenCompanionService.configuration = screenConfig;
                startForegroundService(new Intent(this, ScreenCompanionService.class).putExtra("grant",intent));
            }
            screenConfig = null;
        }
        if (request == 2 && chooser != null) {
            ValueCallback<Uri[]> callback = chooser;
            chooser = null;
            callback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, intent));
        }
    }

    @Override protected void onDestroy() {
        if (chooser != null) chooser.onReceiveValue(null);
        if (microphone != null) microphone.deny();
        nativeVoice.cancel();
        web.destroy();
        super.onDestroy();
    }
}

