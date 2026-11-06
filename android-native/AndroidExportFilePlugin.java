package com.tvhuy99.cardstudio;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.Base64;
import android.util.Log;
import android.widget.Toast;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Save exported cards, Lorebooks, JSON, PNG, ZIP and backups to a location
 * selected by the user via Android's Storage Access Framework.
 *
 * Android WebView does not implement Chrome's blob:/data: anchor download
 * semantics. JavaScript streams at most 256 KiB per call instead of passing
 * unbounded base64 strings to the bridge. No storage permission is requested
 * and no exported content is sent to the network.
 */
@CapacitorPlugin(name = "AndroidExportFile")
public class AndroidExportFilePlugin extends Plugin {
    private static final String TAG = "CardStudioExport";
    private static final int MAX_BYTES = 256 * 1024;
    private final ExecutorService writer = Executors.newSingleThreadExecutor();
    private OutputStream output;
    private Uri documentUri;
    private boolean picking = false;
    private long totalWritten;

    @PluginMethod
    public void beginSave(PluginCall call) {
        if (picking || output != null) {
            call.reject("Một tệp đang được lưu. Hãy hoàn tất trước khi xuất tệp khác.");
            return;
        }
        String fileName = call.getString("fileName", "CardStudio-export.json");
        if (fileName == null) fileName = "CardStudio-export.json";
        fileName = fileName.replaceAll("[\\\\/\\x00-\\x1F\\x7F]", "_").trim();
        if (fileName.length() > 180) fileName = fileName.substring(fileName.length() - 180);
        if (fileName.isEmpty()) fileName = "CardStudio-export.json";
        String mimeType = call.getString("mimeType", "application/octet-stream");
        if (mimeType == null || !mimeType.matches("^[\\w.+-]+/[\\w.+-]+$")) {
            mimeType = "application/octet-stream";
        }
        picking = true;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, fileName);
        intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        startActivityForResult(call, intent, "selectedDestination");
    }

    @ActivityCallback
    private void selectedDestination(PluginCall call, ActivityResult result) {
        picking = false;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null
            || result.getData().getData() == null) {
            call.reject("Người dùng đã hủy lưu tệp.");
            return;
        }
        Uri chosen = result.getData().getData();
        writer.execute(() -> {
            try {
                if (output != null) throw new IOException("Another export is still active");
                OutputStream stream = getContext().getContentResolver().openOutputStream(chosen, "w");
                if (stream == null) throw new IOException("Unable to open destination document");
                output = new BufferedOutputStream(stream, 128 * 1024);
                documentUri = chosen;
                totalWritten = 0;
                JSObject response = new JSObject();
                response.put("destination", chosen.toString());
                call.resolve(response);
            } catch (Exception failure) {
                Log.e(TAG, "Unable to open selected export destination", failure);
                call.reject("Không mở được vị trí lưu: " + failure.getMessage(), failure);
            }
        });
    }

    @PluginMethod
    public void appendChunk(PluginCall call) {
        String encoded = call.getString("base64");
        if (encoded == null || encoded.length() < 1 || encoded.length() > 350000) {
            call.reject("Export chunk is invalid or too large");
            return;
        }
        writer.execute(() -> {
            try {
                if (output == null) throw new IOException("No open export file");
                byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
                if (bytes.length < 1 || bytes.length > MAX_BYTES) {
                    throw new IOException("Invalid export buffer size");
                }
                output.write(bytes);
                totalWritten += bytes.length;
                JSObject response = new JSObject();
                response.put("writtenBytes", totalWritten);
                call.resolve(response);
            } catch (Exception failure) {
                Log.e(TAG, "Unable to write exported data", failure);
                call.reject("Không ghi được tệp xuất: " + failure.getMessage(), failure);
            }
        });
    }

    @PluginMethod
    public void finishSave(PluginCall call) {
        writer.execute(() -> {
            try {
                if (output == null) throw new IOException("No open export file");
                output.flush();
                output.close();
                output = null;
                JSObject result = new JSObject();
                result.put("bytes", totalWritten);
                result.put("destination", documentUri == null ? "" : documentUri.toString());
                documentUri = null;
                getActivity().runOnUiThread(() ->
                    Toast.makeText(getContext(), "Đã lưu tệp thành công", Toast.LENGTH_SHORT).show());
                call.resolve(result);
            } catch (Exception failure) {
                Log.e(TAG, "Unable to finish export", failure);
                call.reject("Không hoàn tất lưu tệp: " + failure.getMessage(), failure);
            }
        });
    }

    @PluginMethod
    public void abortSave(PluginCall call) {
        writer.execute(() -> {
            closeAndDeletePartial();
            call.resolve();
        });
    }

    private void closeAndDeletePartial() {
        if (output != null) {
            try { output.close(); } catch (Exception ignored) {}
            output = null;
        }
        if (documentUri != null) {
            try {
                DocumentsContract.deleteDocument(getContext().getContentResolver(), documentUri);
            } catch (Exception error) {
                Log.w(TAG, "Unable to remove incomplete export", error);
            }
            documentUri = null;
        }
        totalWritten = 0;
    }

    @Override
    protected void handleOnDestroy() {
        writer.execute(this::closeAndDeletePartial);
        writer.shutdown();
        super.handleOnDestroy();
    }
}
