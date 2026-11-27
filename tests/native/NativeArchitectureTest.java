package com.tvhuy99.cardstudio;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;
import com.sun.source.util.JavacTask;

public final class NativeArchitectureTest {
    static void check(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
    static void waitFor(CountDownLatch latch) {
        try { check(latch.await(5, TimeUnit.SECONDS), "Timed out waiting for worker"); }
        catch (InterruptedException error) { throw new AssertionError(error); }
    }
    static void worker() {
        NativeSerialWorker worker = new NativeSerialWorker("native-test");
        List<String> events = Collections.synchronizedList(new ArrayList<>());
        CountDownLatch started = new CountDownLatch(1), release = new CountDownLatch(1), cleaned = new CountDownLatch(1);
        worker.submit(() -> { events.add("start"); started.countDown(); waitFor(release); events.add("end"); }, () -> events.add("unexpected-reject"));
        waitFor(started);
        worker.submit(() -> events.add("unexpected-work"), () -> events.add("queued-reject"));
        worker.close(() -> { events.add("cleanup"); cleaned.countDown(); });
        worker.close(() -> events.add("duplicate-cleanup"));
        worker.submit(() -> events.add("unexpected-late-work"), () -> events.add("late-reject"));
        release.countDown(); waitFor(cleaned);
        check(events.equals(List.of("start", "late-reject", "end", "queued-reject", "cleanup")), "Worker close ordering: " + events);
    }
    static void workerRecreation() {
        NativeSerialWorker old = new NativeSerialWorker("same-resource"), next = new NativeSerialWorker("same-resource");
        CountDownLatch started=new CountDownLatch(1), finish=new CountDownLatch(1), cleaned=new CountDownLatch(1), accepted=new CountDownLatch(1);
        old.submit(() -> { started.countDown(); waitFor(finish); }, () -> {throw new AssertionError("Old owner rejected");});
        waitFor(started);
        old.close(cleaned::countDown);
        boolean[] rejected={false};
        next.submit(() -> {throw new AssertionError("Overlapping native owners");}, () -> rejected[0]=true);
        check(rejected[0], "Recreated instance must wait for previous cleanup");
        finish.countDown(); waitFor(cleaned);
        long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);
        while (accepted.getCount()!=0 && System.nanoTime()<deadline) {
            boolean[] busy={false};
            next.submit(accepted::countDown, () -> busy[0]=true);
            if(!busy[0])break;
            Thread.yield();
        }
        waitFor(accepted); next.close(() -> {});
    }
    static void exports() {
        NativeExportSession session = new NativeExportSession();
        long first = session.begin();
        try { session.begin(); throw new AssertionError("Picker not reserved"); } catch (IllegalStateException expected) {}
        check(session.transition(first, NativeExportSession.State.PICKING, NativeExportSession.State.OPENING), "Picker -> open reservation");
        try { session.begin(); throw new AssertionError("Opening not reserved"); } catch (IllegalStateException expected) {}
        check(session.transition(first, NativeExportSession.State.OPENING, NativeExportSession.State.OPEN), "Open");
        check(session.isOpen(first), "First owner"); session.release(first);
        long second = session.begin();
        check(second != first && !session.isOpen(first), "Stale revision");
        session.release(first);
        check(session.current(NativeExportSession.State.PICKING) == second, "Old release cannot free new picker");
        session.close();
        check(!session.transition(second, NativeExportSession.State.PICKING, NativeExportSession.State.OPENING), "Destroy invalidates picker");
        session.release(second);
        try { session.begin(); throw new AssertionError("Closed session reopened"); } catch (IllegalStateException expected) {}
    }
    static void generation() {
        NativeGenerationLease lease = new NativeGenerationLease();
        lease.request("A"); check(lease.owns("A"), "A owns service");
        lease.request("B"); check(!lease.release("A") && lease.owns("B"), "Old stop cannot cancel B");
        check(lease.release("B") && !lease.owns("B"), "B finished before delayed start");
        check(!lease.release(null), "Null not an owner");
        check(AiStudioOrigin.isStudioUrl("https://aistudio.google.com/u/0/prompts/new_chat"), "First-party URL");
        check(AiStudioOrigin.isStudioUrl("https://AISTUDIO.GOOGLE.COM:443/prompts/new_chat"), "Default HTTPS port");
        for (String url : List.of("https://aistudio.google.com.evil.test/", "https://aistudio.google.com@evil.test/", "https://evil@aistudio.google.com/", "http://aistudio.google.com/", "https://aistudio.google.com:444/", "https://accounts.google.com/", "data:text/html,x", "not a URL")) {
            check(!AiStudioOrigin.isStudioUrl(url), "Reject non-studio origin: " + url);
        }
        check(!AiStudioCompletionPolicy.isTerminal(true, true, 20000, 20000, 20), "Busy never finishes");
        check(!AiStudioCompletionPolicy.isTerminal(false, true, 6999, 4000, 10), "Idle too short");
        check(!AiStudioCompletionPolicy.isTerminal(false, true, 7000, 3500, 3), "Fewer than four polls");
        check(AiStudioCompletionPolicy.isTerminal(false, true, 7000, 3500, 4), "Known busy threshold");
        check(!AiStudioCompletionPolicy.isTerminal(false, false, 14999, 15000, 25), "Fallback threshold");
        check(AiStudioCompletionPolicy.isTerminal(false, false, 15000, 15000, 25), "Fallback complete");
    }
    static void modelFiles(Path temp) throws Exception {
        File target = temp.resolve("model").toFile(), part = temp.resolve("model.part").toFile(), marker = temp.resolve("model.ok").toFile();
        String hash = "ab".repeat(32);
        Files.write(target.toPath(), new byte[10]); Files.writeString(marker.toPath(), "10:" + hash);
        check(NativeModelFiles.onnxReady(target, marker, 1), "Legacy ONNX marker supported");
        Files.write(part.toPath(), new byte[5]);
        try { NativeModelFiles.commit(part, target, marker, "20:"+hash, 20); throw new AssertionError("Incomplete copy committed"); }
        catch (java.io.IOException expected) {}
        check(target.length() == 10 && NativeModelFiles.onnxReady(target, marker, 1), "Incomplete copy preserves old model");
        Files.write(part.toPath(), new byte[20]); NativeModelFiles.commit(part, target, marker, "20:"+hash, 20);
        check(target.length() == 20 && !part.exists() && NativeModelFiles.onnxReady(target, marker, 1), "Verified candidate committed");
        Files.writeString(marker.toPath(), "10:"+hash); check(!NativeModelFiles.onnxReady(target, marker, 1), "Size mismatch");
        Files.writeString(marker.toPath(), "20:garbage"); check(!NativeModelFiles.onnxReady(target, marker, 1), "Invalid hash");
        Files.writeString(marker.toPath(), hash + "\n"); check(NativeModelFiles.liteRtReady(target, marker, 1, hash), "Legacy LiteRT marker supported");
        check(!NativeModelFiles.liteRtReady(target, marker, 1, "cd".repeat(32)), "Wrong model hash marker");
    }
    static void writePair(File directory, byte value) throws Exception {
        if (!directory.isDirectory()) check(directory.mkdirs(), "Create pair directory");
        for (String name : List.of(NativeOnnxModelSet.GRAPH, NativeOnnxModelSet.WEIGHTS)) {
            int size = (int)NativeOnnxModelSet.minimum(name);
            byte[] content = new byte[size]; java.util.Arrays.fill(content, value);
            Files.write(new File(directory, name).toPath(), content);
            Files.writeString(new File(directory, name + ".ok").toPath(), size + ":" + "ab".repeat(32));
        }
    }
    static int firstByte(File directory) throws Exception {
        try (var stream = new java.io.FileInputStream(new File(directory, NativeOnnxModelSet.GRAPH))) { return stream.read(); }
    }
    static void modelSets(Path temp) throws Exception {
        File active = temp.resolve("pair/onnx").toFile();
        NativeOnnxModelSet sets = new NativeOnnxModelSet(active);
        writePair(active, (byte)1);
        File staging = sets.begin();
        Files.write(new File(staging, NativeOnnxModelSet.GRAPH).toPath(), new byte[1024]);
        try { sets.commit(); throw new AssertionError("Incomplete pair published"); } catch (java.io.IOException expected) {}
        check(firstByte(active)==1 && NativeOnnxModelSet.complete(active), "Old pair survives failed commit");
        sets.abort(); check(!staging.exists(), "Abort removes staging only");
        staging=sets.begin(); writePair(staging, (byte)2);
        sets.commit(); check(firstByte(active)==2 && NativeOnnxModelSet.complete(active), "Both files published");
        check(!staging.exists(), "Staging gone");

        staging=sets.begin(); writePair(staging,(byte)3);
        File previous = new File(active.getParentFile(), "onnx.previous");
        check(active.renameTo(previous), "Simulate first rename");
        NativeOnnxModelSet reopened = new NativeOnnxModelSet(active);
        reopened.recover(); check(firstByte(active)==2 && !previous.exists(), "Recover old pair after interrupted swap");
        reopened.abort();

        staging=reopened.begin(); writePair(staging,(byte)4);
        check(active.renameTo(previous) && staging.renameTo(active), "Simulate both renames");
        reopened.recover(); check(firstByte(active)==4 && !previous.exists(), "Keep published pair and clean old");
        reopened.delete(); check(!active.exists(), "Delete pair and staging");
    }
    static void exportJournal(Path temp) throws Exception {
        File dir = temp.resolve("export-journal").toFile();
        NativeExportJournal first = new NativeExportJournal(dir);
        first.begin("one", "backup.json");
        first.complete("stale");
        NativeExportJournal restarted = new NativeExportJournal(dir);
        restarted.recover();
        check(restarted.interrupted().id().equals("one"), "Unconfirmed write recovered after restart");
        restarted.acknowledge("stale"); check(restarted.interrupted()!=null, "Stale acknowledgement ignored");
        restarted.begin("two", "character.png"); restarted.complete("two");
        restarted.recover(); check(restarted.interrupted().id().equals("one"), "Confirmed export does not erase earlier uncertainty");
        restarted.acknowledge("one"); check(restarted.interrupted()==null, "Explicit acknowledgement clears only matching receipt");
        restarted.begin("three", "export.json"); restarted.uncertain("three");
        check(restarted.interrupted().fileName().equals("export.json"), "Failed cleanup retains receipt");
    }
    static void requestLedger() {
        NativeRequestLedger ledger = new NativeRequestLedger();
        String a = "a".repeat(40) + "1", b = "a".repeat(40) + "2";
        check(NativeRequestLedger.valid(a) && NativeRequestLedger.valid(b), "Long IDs supported without truncation");
        ledger.cancel(a); check(ledger.isCancelled(a) && !ledger.isCancelled(b), "Cancel-before-start without collisions");
        ledger.cancel("unsafe id"); check(!ledger.isCancelled("unsafe id"), "Invalid ID ignored");
        for (int i=0; i<128; i++) ledger.cancel("id-"+i);
        check(!ledger.isCancelled(a) && ledger.isCancelled("id-127"), "Bounded cancellation history");
    }
    static void parseAll(Path directory) throws Exception {
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        try (StandardJavaFileManager files = compiler.getStandardFileManager(diagnostics, null, null);
             var stream = Files.list(directory)) {
            List<File> sources = stream.filter(p -> p.toString().endsWith(".java")).map(Path::toFile).sorted().toList();
            JavacTask task = (JavacTask)compiler.getTask(null, files, diagnostics, List.of("--release", "21", "-proc:none"), null, files.getJavaFileObjectsFromFiles(sources));
            int count = 0; for (var ignored : task.parse()) count++;
            for (var diagnostic : diagnostics.getDiagnostics()) check(diagnostic.getKind() != Diagnostic.Kind.ERROR, diagnostic.toString());
            check(count == sources.size(), "All Java sources parsed");
            System.out.println("Java syntax parsed: " + count + " files (not Android type-checking)");
        }
    }
    public static void main(String[] args) throws Exception {
        Path source = Path.of(args[0]), temp = Path.of(args[1]);
        worker(); workerRecreation(); exports(); generation(); modelFiles(temp); modelSets(temp); exportJournal(temp); requestLedger(); parseAll(source);

        Files.writeString(temp.resolve("install.js"), AiStudioPageScripts.INSTALL_JS);
        Files.writeString(temp.resolve("thinking-open.js"), AiStudioPageScripts.THINKING_OPEN_JS);
        Files.writeString(temp.resolve("thinking-select.js"), AiStudioPageScripts.THINKING_SELECT_JS.replace("__STS_LEVEL__", "\"high\""));
        Files.writeString(temp.resolve("thinking-verify.js"), AiStudioPageScripts.THINKING_VERIFY_JS.replace("__STS_LEVEL__", "\"high\""));
        System.out.println("Native JDK tests: worker shutdown, export ownership, generation lease, origin, completion policy, model pair recovery, export receipt and cancellation ledger PASS");
    }
}
