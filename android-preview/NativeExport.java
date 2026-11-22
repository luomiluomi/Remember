package app.remember.preview;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import java.io.*;

/** Chunked WebView-to-SAF export; no shared-storage permission and no blob URL download. */
public final class NativeExport {
    private final Activity activity;
    private final WebView web;
    private File file;
    private FileOutputStream stream;
    private String job;
    NativeExport(Activity activity, WebView web) { this.activity=activity; this.web=web; }

    @JavascriptInterface public synchronized boolean begin(String id) {
        if(job!=null)return false;
        try {
            file=File.createTempFile("memory-export-",".zip",activity.getCacheDir());
            stream=new FileOutputStream(file);job=id;return true;
        }catch(IOException e){cleanup();return false;}
    }
    @JavascriptInterface public synchronized boolean append(String base64) {
        if(stream==null||base64.length()>400000)return false;
        try{stream.write(android.util.Base64.decode(base64,android.util.Base64.DEFAULT));return true;}
        catch(Exception e){finish("error","无法准备导出文件");return false;}
    }
    @JavascriptInterface public synchronized void cancel() { cleanup(); }
    @JavascriptInterface public synchronized void save(String name) {
        if(stream==null)return;
        try{stream.close();stream=null;}
        catch(IOException e){finish("error","无法准备导出文件");return;}
        activity.runOnUiThread(()->{
            try {
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("application/zip").putExtra(Intent.EXTRA_TITLE,name.replaceAll("[^a-zA-Z0-9._-]","_"));
                activity.startActivityForResult(intent,72);
            }catch(Exception e){finish("error","系统文件保存器不可用");}
        });
    }
    void result(int result, Intent intent) {
        if(result!=Activity.RESULT_OK||intent==null||intent.getData()==null){finish("cancel","已取消保存");return;}
        final Uri destination=intent.getData();
        new Thread(()->{
            try(InputStream in=new FileInputStream(file);
                OutputStream out=activity.getContentResolver().openOutputStream(destination,"wt")){
                if(out==null)throw new IOException();
                byte[] buffer=new byte[65536];int count;
                while((count=in.read(buffer))!=-1)out.write(buffer,0,count);
                out.flush();finish("saved","聊天记录已保存");
            }catch(Exception e){finish("error","保存失败，请检查目标位置的可用空间与访问权限");}
        },"memory-export").start();
    }
    private synchronized void finish(String status,String message) {
        String id=job;cleanup();
        try {
            org.json.JSONObject event=new org.json.JSONObject().put("id",id).put("status",status).put("message",message);
            activity.runOnUiThread(()->web.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('memory-export-result',{detail:"+event.toString()+"}))",null));
        }catch(Exception ignored){}
    }
    private synchronized void cleanup(){
        if(stream!=null){try{stream.close();}catch(IOException ignored){}stream=null;}
        if(file!=null){file.delete();file=null;}job=null;
    }
}
