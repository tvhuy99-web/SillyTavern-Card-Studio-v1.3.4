package com.tvhuy99.cardstudio;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;

/** Preserve existing marker formats, never publish a marker before the model
 * is fully copied. The two files are not a cross-file transaction. */
final class NativeModelFiles {
    private NativeModelFiles() {}
    static String readMarker(File marker) {
        if (!marker.isFile() || marker.length() > 256) return "";
        try (FileInputStream input = new FileInputStream(marker)) {
            byte[] buffer = new byte[257];
            int offset = 0;
            while (offset < buffer.length) {
                int count = input.read(buffer, offset, buffer.length - offset);
                if (count < 0) break;
                offset += count;
            }
            return offset == buffer.length ? "" : new String(buffer, 0, offset, StandardCharsets.US_ASCII).trim();
        } catch (IOException failure) { return ""; }
    }
    static boolean onnxReady(File file, File marker, long minimum) {
        if (!file.isFile() || file.length() < minimum) return false;
        String value = readMarker(marker);
        int colon = value.indexOf(':');
        return colon > 0 && value.substring(0, colon).equals(Long.toString(file.length()))
            && value.substring(colon + 1).matches("(?i)[0-9a-f]{64}");
    }
    static boolean liteRtReady(File file, File marker, long minimum, String expectedHash) {
        return file.isFile() && file.length() >= minimum && expectedHash.equalsIgnoreCase(readMarker(marker));
    }
    static void commit(File partial, File target, File marker, String markerValue, long expectedSize) throws IOException {
        if (!partial.isFile() || partial.length() != expectedSize) throw new IOException("Incomplete model copy");
        try (RandomAccessFile durable = new RandomAccessFile(partial, "rw")) { durable.getFD().sync(); }
        File stagedMarker = new File(marker.getParentFile(), marker.getName() + ".part");
        try {
            try (FileOutputStream output = new FileOutputStream(stagedMarker)) {
                output.write(markerValue.getBytes(StandardCharsets.US_ASCII));
                output.getFD().sync();
            }
            // Invalidate the previous marker only after the replacement has
            // been fully written. A crash must not make incomplete data ready.
            if (marker.exists() && !marker.delete()) throw new IOException("Cannot invalidate previous model marker");
            // Same-directory rename on Android/Linux. Never delete the existing
            // model before attempting to replace it.
            if (!partial.renameTo(target)) throw new IOException("Cannot commit model file");
            if (!stagedMarker.renameTo(marker)) throw new IOException("Cannot commit model marker");
        } finally {
            if (stagedMarker.exists()) stagedMarker.delete();
        }
    }
}
