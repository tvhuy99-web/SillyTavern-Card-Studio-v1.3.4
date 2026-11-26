package com.tvhuy99.cardstudio;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Properties;

/** Private receipt for an uncertain SAF write. Recovery never deletes a user
 * document: the process could have died after close but before acknowledgement.
 * Single worker owns all journal operations. The last interrupted export is
 * retained until explicitly acknowledged. */
final class NativeExportJournal {
    static final class Receipt {
        private final String id, fileName;
        Receipt(String id, String fileName) { this.id = id; this.fileName = fileName; }
        String id() { return id; }
        String fileName() { return fileName; }
    }
    private final File directory, pending, interrupted;
    NativeExportJournal(File directory) {
        this.directory = directory;
        pending = new File(directory, "pending.properties");
        interrupted = new File(directory, "interrupted.properties");
    }
    private static Receipt read(File file) throws IOException {
        if (!file.isFile()) return null;
        if (file.length() > 8192) throw new IOException("Invalid export receipt");
        Properties properties = new Properties();
        try (FileInputStream input = new FileInputStream(file)) { properties.load(input); }
        String id = properties.getProperty("id", ""), name = properties.getProperty("fileName", "");
        if (id.isEmpty() || name.isEmpty()) throw new IOException("Invalid export receipt");
        return new Receipt(id, name);
    }
    private void write(File target, Receipt receipt) throws IOException {
        if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException("Cannot create export journal");
        File stage = new File(directory, target.getName()+".part");
        Properties properties = new Properties();
        properties.setProperty("id", receipt.id()); properties.setProperty("fileName", receipt.fileName());
        try {
            try (FileOutputStream output = new FileOutputStream(stage)) {
                properties.store(output, "Unconfirmed SAF export"); output.getFD().sync();
            }
            if (!stage.renameTo(target)) throw new IOException("Cannot publish export receipt");
        } finally { if (stage.exists()) stage.delete(); }
    }
    private static void remove(File file) throws IOException {
        if (file.exists() && !file.delete()) throw new IOException("Cannot clear export receipt");
    }
    void recover() throws IOException {
        Receipt receipt = read(pending);
        if (receipt != null) { write(interrupted, receipt); remove(pending); }
    }
    void begin(String id, String fileName) throws IOException {
        if (pending.exists()) throw new IOException("Previous export receipt was not recovered");
        write(pending, new Receipt(id, fileName));
    }
    void complete(String id) throws IOException {
        Receipt receipt = read(pending);
        if (receipt != null && receipt.id().equals(id)) remove(pending);
    }
    void uncertain(String id) throws IOException {
        Receipt receipt = read(pending);
        if (receipt != null && receipt.id().equals(id)) recover();
    }
    Receipt interrupted() throws IOException { return read(interrupted); }
    void acknowledge(String id) throws IOException {
        Receipt receipt = read(interrupted);
        if (receipt != null && receipt.id().equals(id)) remove(interrupted);
    }
}
