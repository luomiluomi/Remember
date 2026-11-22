package app.remember.preview;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

public final class NativeVoice {
    private static final int RATE = 16000;
    private static final int MAX_BYTES = RATE * 2 * 120;
    private final android.content.Context activity;
    private AudioRecord recorder;
    private Thread worker;
    private ByteArrayOutputStream pcm;
    private volatile boolean running;
    private volatile boolean failed;
    private volatile double level;

    NativeVoice(android.content.Context activity) {
        this.activity = activity;
    }

    @JavascriptInterface public synchronized String start() {
        if (activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            if(activity instanceof Activity) {
                Activity host=(Activity)activity;host.runOnUiThread(() -> host.requestPermissions(
                new String[] { Manifest.permission.RECORD_AUDIO }, 3));
            }
            return "permission";
        }
        finish(false);
        try {
            int min = AudioRecord.getMinBufferSize(RATE, AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT);
            if (min <= 0) return "init";
            recorder = new AudioRecord(MediaRecorder.AudioSource.MIC, RATE,
                AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, Math.max(min, 4096));
            recorder.startRecording();
            if (recorder.getRecordingState() != AudioRecord.RECORDSTATE_RECORDING) {
                finish(false);
                return "init";
            }
            AudioRecord input = recorder;
            pcm = new ByteArrayOutputStream();
            ByteArrayOutputStream output = pcm;
            running = true;
            failed = false;
            level = 0;
            worker = new Thread(() -> {
                byte[] buffer = new byte[4096];
                try {
                    while (running && output.size() < MAX_BYTES) {
                        int count = input.read(buffer, 0, Math.min(buffer.length, MAX_BYTES - output.size()));
                        if (count < 0) {
                            failed = running;
                            break;
                        }
                        output.write(buffer, 0, count);
                        double squares = 0;
                        for (int i = 0; i + 1 < count; i += 2) {
                            int sample = (short) ((buffer[i] & 255) | (buffer[i + 1] << 8));
                            squares += (double) sample * sample;
                        }
                        if (count >= 2) level = Math.sqrt(squares / (count / 2)) / 32768;
                    }
                } catch (RuntimeException ex) {
                    failed = running;
                }
            }, "remember-mic");
            worker.start();
            return "ok";
        } catch (RuntimeException ex) {
            finish(false);
            return "init";
        }
    }

    @JavascriptInterface public synchronized String stop() {
        return finish(true);
    }

    @JavascriptInterface public double level() {
        return level;
    }

    @JavascriptInterface public synchronized void cancel() {
        finish(false);
    }

    private String finish(boolean keep) {
        running = false;
        if (recorder != null) {
            try { recorder.stop(); } catch (RuntimeException ignored) {}
        }
        if (worker != null) {
            try { worker.join(750); }
            catch (InterruptedException ex) { Thread.currentThread().interrupt(); }
            if (worker.isAlive()) keep = false;
            worker = null;
        }
        if (recorder != null) {
            recorder.release();
            recorder = null;
        }
        byte[] data = keep && !failed && pcm != null ? pcm.toByteArray() : new byte[0];
        pcm = null;
        if (data.length == 0) return "";
        ByteBuffer wav = ByteBuffer.allocate(44 + data.length).order(ByteOrder.LITTLE_ENDIAN);
        wav.putInt(0x46464952).putInt(36 + data.length).putInt(0x45564157);
        wav.putInt(0x20746d66).putInt(16).putShort((short) 1).putShort((short) 1);
        wav.putInt(RATE).putInt(RATE * 2).putShort((short) 2).putShort((short) 16);
        wav.putInt(0x61746164).putInt(data.length).put(data);
        return Base64.encodeToString(wav.array(), Base64.NO_WRAP);
    }
}
