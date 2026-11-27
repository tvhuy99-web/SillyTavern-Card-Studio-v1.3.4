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
import java.io.File;
import java.io.OutputStream;
import java.util.UUID;

@CapacitorPlugin(name = "AndroidExportFile")
public class AndroidExportFilePlugin extends Plugin {
    private static final String TAG = "CardStudioExport";
    private static final int MAX_BYTES = 256 * 1024;
    private final NativeSerialWorker writer = new NativeSerialWorker("CardStudioExport");
    private final NativeExportSession session = new NativeExportSession();
    private final String instanceId = UUID.randomUUID().toString();

    private PluginCall pickerCall;
    private long pickerToken;
    private String pickerFileName;

    private OutputStream output;
    private Uri documentUri;
    private long totalWritten;
    private NativeExportJournal journal;
    private String journalId;

    @PluginMethod
    public synchronized void beginSave(PluginCall call) {
        try { pickerToken = session.begin(); }
        catch (IllegalStateException busy) { call.reject("Một tệp đang được lưu. Hãy hoàn tất trước khi xuất tệp khác."); return; }
        pickerCall = call;
        try {
            String fileName = call.getString("fileName", "CardStudio-export.json");
            if (fileName == null) fileName = "CardStudio-export.json";
            fileName = fileName.replaceAll("[\\\\/\\x00-\\x1F\\x7F]", "_").trim();
            if (fileName.length() > 180) fileName = fileName.substring(fileName.length() - 180);
            if (fileName.isEmpty()) fileName = "CardStudio-export.json";
            pickerFileName = fileName;
            String mimeType = call.getString("mimeType", "application/octet-stream");
            if (mimeType == null || !mimeType.matches("^[\\w.+-]+/[\\w.+-]+$")) mimeType = "application/octet-stream";
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(mimeType);
            intent.putExtra(Intent.EXTRA_TITLE, fileName);
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            startActivityForResult(call, intent, "selectedDestination");
        } catch (Exception error) {
            session.release(pickerToken); pickerCall = null;
            call.reject("Không mở được hộp chọn tệp", error);
        }
    }

    @ActivityCallback
    private synchronized void selectedDestination(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (call != pickerCall) { call.reject("EXPORT_PICKER_SESSION_LOST"); return; }
        final long token = pickerToken;
        final String fileName = pickerFileName;
        pickerCall = null; pickerFileName = null;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            session.release(token); call.reject("Người dùng đã hủy lưu tệp."); return;
        }
        final Uri chosen = result.getData().getData();
        if (!session.transition(token, NativeExportSession.State.PICKING, NativeExportSession.State.OPENING)) {
            call.reject("NATIVE_PLUGIN_CLOSED"); return;
        }
        writer.submit(() -> {
            try {
                documentUri = chosen;
                journalId = exportId(token);
                journal().begin(journalId, fileName);
                OutputStream stream;
                try { stream = getContext().getContentResolver().openOutputStream(chosen, "wt"); }
                catch (IllegalArgumentException unsupportedMode) { stream = getContext().getContentResolver().openOutputStream(chosen, "w"); }
                if (stream == null) throw new IOException("Unable to open destination document");
                output = new BufferedOutputStream(stream, 128 * 1024);
                totalWritten = 0;
                if (!session.transition(token, NativeExportSession.State.OPENING, NativeExportSession.State.OPEN)) throw new IOException("NATIVE_PLUGIN_CLOSED");
                JSObject response = new JSObject(); response.put("destination", chosen.toString());
                response.put("exportId", exportId(token)); call.resolve(response);
            } catch (Exception failure) { fail(token, call, "Không mở được vị trí lưu", failure); }
        }, () -> { deletePartial(chosen); session.release(token); call.reject("NATIVE_PLUGIN_UNAVAILABLE"); });
    }

    private NativeExportJournal journal() throws IOException {
        if (journal == null) {
            NativeExportJournal opened = new NativeExportJournal(new File(getContext().getFilesDir(), "cardstudio-export-journal"));
            opened.recover(); journal = opened;
        }
        return journal;
    }

    @PluginMethod public void getInterruptedSave(PluginCall call) {
        writer.submit(() -> {
            try {
                NativeExportJournal.Receipt receipt = journal().interrupted();
                JSObject result = new JSObject(); result.put("interrupted", receipt != null);
                if (receipt != null) { result.put("exportId", receipt.id()); result.put("fileName", receipt.fileName()); }
                call.resolve(result);
            } catch (IOException failure) { call.reject("Cannot read export recovery receipt", failure); }
        }, () -> call.reject(writer.isClosed() ? "NATIVE_PLUGIN_CLOSED" : "NATIVE_PLUGIN_UNAVAILABLE"));
    }
    @PluginMethod public void acknowledgeInterruptedSave(PluginCall call) {
        writer.submit(() -> {
            try { journal().acknowledge(call.getString("exportId")); call.resolve(); }
            catch (IOException failure) { call.reject("Cannot acknowledge export recovery receipt", failure); }
        }, () -> call.reject(writer.isClosed() ? "NATIVE_PLUGIN_CLOSED" : "NATIVE_PLUGIN_UNAVAILABLE"));
    }
    private String exportId(long token) { return instanceId + ":" + token; }
    private boolean matchesExport(PluginCall call, long token) {
        String requested = call.getString("exportId");
        return requested == null || exportId(token).equals(requested);
    }
    private interface WriteOperation { void run() throws Exception; }
    private void withOpenFile(PluginCall call, WriteOperation operation) {
        long token = session.current(NativeExportSession.State.OPEN);
        if (token == 0 || !matchesExport(call, token)) { call.reject("No matching open export file"); return; }
        writer.submit(() -> {
            if (!session.isOpen(token)) { call.reject("No open export file"); return; }
            try { operation.run(); }
            catch (Exception failure) { fail(token, call, "Không ghi được tệp xuất", failure); }
        }, () -> call.reject(writer.isClosed() ? "NATIVE_PLUGIN_CLOSED" : "NATIVE_PLUGIN_UNAVAILABLE"));
    }

    @PluginMethod
    public void appendChunk(PluginCall call) {
        String encoded = call.getString("base64");
        if (encoded == null || encoded.isEmpty() || encoded.length() > 350000) { call.reject("Export chunk is invalid or too large"); return; }
        withOpenFile(call, () -> {
            byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
            if (bytes.length == 0 || bytes.length > MAX_BYTES) throw new IOException("Invalid export buffer size");
            output.write(bytes); totalWritten += bytes.length;
            JSObject response = new JSObject(); response.put("writtenBytes", totalWritten); call.resolve(response);
        });
    }

    @PluginMethod
    public void finishSave(PluginCall call) {
        withOpenFile(call, () -> {
            long token = session.current(NativeExportSession.State.OPEN);
            Long expected = call.getLong("expectedBytes");
            if (expected != null && expected != totalWritten) throw new IOException("Export byte count mismatch");
            output.flush(); output.close(); output = null;
            JSObject result = new JSObject(); result.put("bytes", totalWritten);
            result.put("destination", documentUri == null ? "" : documentUri.toString());
            documentUri = null; totalWritten = 0;
            settleReceipt(true);
            session.release(token);
            call.resolve(result);

            try {
                Activity activity = getActivity();
                if (activity != null) activity.runOnUiThread(() -> {
                    if (!activity.isDestroyed()) Toast.makeText(activity, "Đã lưu tệp thành công", Toast.LENGTH_SHORT).show();
                });
            } catch (RuntimeException notificationFailure) { Log.w(TAG, "Export saved; notification unavailable", notificationFailure); }
        });
    }

    @PluginMethod
    public void abortSave(PluginCall call) {
        long token = session.current(NativeExportSession.State.OPEN);
        if (token == 0) { call.resolve(); return; }
        if (!matchesExport(call, token)) { call.reject("No matching open export file"); return; }
        writer.submit(() -> {
            if (session.isOpen(token)) { closeAndDeletePartial(); session.release(token); }
            call.resolve();
        }, () -> call.reject(writer.isClosed() ? "NATIVE_PLUGIN_CLOSED" : "NATIVE_PLUGIN_UNAVAILABLE"));
    }

    private void fail(long token, PluginCall call, String message, Exception failure) {
        closeAndDeletePartial(); session.release(token);
        Log.e(TAG, message, failure); call.reject(message + ": " + failure.getMessage(), failure);
    }
    private boolean deletePartial(Uri uri) {
        if (uri == null) return true;
        try { return DocumentsContract.deleteDocument(getContext().getContentResolver(), uri); }
        catch (Exception error) { Log.w(TAG, "Unable to remove incomplete export", error); return false; }
    }
    private void settleReceipt(boolean confirmed) {
        String id = journalId; journalId = null;
        if (id == null || journal == null) return;
        try { if (confirmed) journal.complete(id); else journal.uncertain(id); }
        catch (IOException failure) { Log.w(TAG, "Export receipt remains unconfirmed", failure); journal = null; }
    }
    private void closeAndDeletePartial() {
        if (output != null) { try { output.close(); } catch (Exception ignored) {} output = null; }
        boolean removed = deletePartial(documentUri); documentUri = null; totalWritten = 0;
        settleReceipt(removed);
    }
    @Override protected synchronized void handleOnDestroy() {
        session.close();
        if (pickerCall != null) { pickerCall.reject("NATIVE_PLUGIN_CLOSED"); pickerCall = null; }
        writer.close(this::closeAndDeletePartial);
        super.handleOnDestroy();
    }
}
