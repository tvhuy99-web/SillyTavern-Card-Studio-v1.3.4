package com.tvhuy99.cardstudio;

import java.io.File;
import java.io.IOException;

final class NativeOnnxModelSet {
    static final String GRAPH = "model_q4.onnx";
    static final String WEIGHTS = "model_q4.onnx_data";
    private final File active, staged, previous;
    NativeOnnxModelSet(File active) {
        this.active = active;
        staged = new File(active.getParentFile(), active.getName() + ".staged");
        previous = new File(active.getParentFile(), active.getName() + ".previous");
    }
    static long minimum(String name) { return GRAPH.equals(name) ? 1024 : 1024 * 1024; }
    static boolean ready(File directory, String name) {
        return NativeModelFiles.onnxReady(new File(directory, name), new File(directory, name + ".ok"), minimum(name));
    }
    static boolean complete(File directory) { return ready(directory, GRAPH) && ready(directory, WEIGHTS); }
    private static void move(File source, File target) throws IOException {
        if (target.exists() || !source.renameTo(target)) throw new IOException("Cannot move native model directory: " + source.getName());
    }
    private static void clear(File directory) throws IOException {
        if (!directory.exists()) return;

        File[] contents = directory.listFiles();
        if (contents == null) throw new IOException("Cannot inspect model directory");
        java.util.Set<String> allowed = new java.util.HashSet<>();
        for (String name : new String[]{GRAPH, WEIGHTS}) {
            for (String suffix : new String[]{"", ".ok", ".part", ".ok.part"}) allowed.add(name + suffix);
        }
        for (File file : contents) {
            if (!file.isFile() || !allowed.contains(file.getName())) throw new IOException("Unexpected model directory entry");
        }
        for (File file : contents) if (!file.delete()) throw new IOException("Cannot remove " + file.getName());
        if (!directory.delete()) throw new IOException("Cannot remove model staging directory: " + directory.getName());
    }
    File recover() throws IOException {

        if (previous.exists()) {
            if (!active.exists()) move(previous, active);
            else if (complete(active)) { try { clear(previous); } catch (IOException ignored) {} }
            else if (complete(previous)) { clear(active); move(previous, active); }
            else throw new IOException("Native ONNX recovery requires a complete model pair");
        }
        if (!active.isDirectory() && !active.mkdirs()) throw new IOException("Cannot create native model directory");
        return active;
    }
    File begin() throws IOException {
        recover(); clear(previous); clear(staged);
        if (!staged.mkdir()) throw new IOException("Cannot create model staging directory");
        return staged;
    }
    File staging() { return staged; }
    void abort() throws IOException { clear(staged); }
    void commit() throws IOException {
        if (!complete(staged)) throw new IOException("Incomplete ONNX model pair");
        recover();
        move(active, previous);
        try { move(staged, active); }
        catch (IOException failure) {
            try { move(previous, active); } catch (IOException restore) { failure.addSuppressed(restore); }
            throw failure;
        }

        try { clear(previous); } catch (IOException ignored) {}
    }
    void delete() throws IOException {
        recover(); clear(staged); clear(previous); clear(active);
    }
}
