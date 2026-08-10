/*
 * Configuration for running participant-supplied Java through the java_jail
 * tracer.
 *
 * SECURITY, read this before changing ALLOW_CODE_EXECUTION.
 *
 * java_jail ships a chroot sandbox, but that sandbox is Linux only and is NOT
 * in effect on Windows. On this machine the tracer runs user code as a normal
 * child process with the developer's own privileges. That is acceptable for
 * local development against code we wrote ourselves, and it is NOT acceptable
 * on a deployed URL where anyone can post arbitrary Java.
 *
 * So the flag defaults to development only. Turning it on in production is a
 * deliberate decision that requires a real sandbox first (a container, a VM, or
 * java_jail running under Linux as designed).
 */

export const ALLOW_CODE_EXECUTION = process.env.NODE_ENV !== "production";

/*
 * The system default java on this machine is Java 8, which cannot load the
 * traceprinter classes (they are compiled to class file version 65, meaning
 * Java 21). The absolute path is therefore the default rather than bare "java".
 * Override with JAVA_BIN if your JDK lives elsewhere.
 */
export const JAVA_BIN =
  process.env.JAVA_BIN ?? "C:\\Program Files\\Java\\jdk-21\\bin\\java.exe";

/*
 * Directory holding java_jail. The tracer must run with this as its working
 * directory because its classpath entries are relative. Path is relative to the
 * Next.js project root (visualizer-ui), so this points one level up into the
 * repository.
 */
export const JAVA_JAIL_DIR = process.env.JAVA_JAIL_DIR ?? "../java-jail-spike";

/* Classpath entries, joined with the platform separator at spawn time. */
export const JAVA_JAIL_CLASSPATH = ["cp", "cp/javax.json-1.0.jar"];

/* Entry point class inside java_jail that reads a JSON job on stdin. */
export const TRACER_MAIN_CLASS = "traceprinter.InMemory";

/* Hard wall clock limit for one trace. The child is killed when it expires. */
export const TRACE_TIMEOUT_MS = 15_000;

/* Cap on tracer stdout, so a runaway program cannot exhaust server memory. */
export const MAX_TRACE_OUTPUT_BYTES = 4 * 1024 * 1024;

/* Cap on submitted source length. Generous for a lesson, small for an attack. */
export const MAX_SOURCE_LENGTH = 20_000;

/* Steps beyond this are dropped, with the truncation reported to the caller. */
export const MAX_STEPS = 300;
