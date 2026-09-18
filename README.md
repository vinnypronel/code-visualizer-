# AI-Powered Interactive Code Visualization

A research study app that teaches Java program execution, built for the CRA
UR2PhD Undergraduate Research Experience at Kean University.

**Live study app:** https://code-visualizer-alpha.vercel.app

Participants either step through an interactive visualizer that shows the
call stack, heap, and variables changing line by line, or study the same
material as static readings. Pre-test and post-test scores are compared between
the two groups.

## Research

- **Question:** Does an AI-assisted interactive visualizer help first-year
  students understand Java execution better than static reading materials?
- **Design:** Between-subjects. Odd participant numbers get the visualizer,
  even numbers get the static materials.
- **Flow:** Consent, participant ID, pre-test, learning phase, post-test,
  questionnaire.
- **Team:** Vincent Pronel and Kiana Becca Nuñez, with faculty mentor
  Dr. Yan Ma, Department of Computer Science and Technology, Kean University.

The study is IRB approved. No participant data is stored in this repository.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS v4
- Supabase (Postgres), written only through server-side API routes
- Cloudflare Turnstile on participant ID assignment
- java_jail (JDI-based Java tracer) for real execution traces
- JavaParser for AST exploration (prototype)

## Repository Layout

```text
visualizer-ui/   The study app (Next.js). Start here.
parser-spike/    Maven prototype that parses Java with JavaParser and walks the AST.
LICENSE          MIT
```

Setup, environment variables, database migrations, and the participant flow
are documented in [visualizer-ui/README.md](visualizer-ui/README.md).

## Optional: Live Java Tracing

The `/api/trace` route runs user-written Java through java_jail and turns the
trace into steps the visualizer can play. It is off in production builds and
is not part of the study flow. java_jail is GPL licensed, so it is not included
in this repository. To enable tracing locally:

1. Install JDK 21.
2. From the repository root, clone java_jail into `java-jail-spike` and check
   out the tested commit:

   ```bash
   git clone https://github.com/daveagp/java_jail.git java-jail-spike
   cd java-jail-spike
   git checkout a692605
   ```

3. Apply two changes so the tracer works on JDK 9 and newer:
   - In `cp/traceprinter/JDI2JSON.java`, add `"jdk"` to the
     `builtin_packages` array. Then, in the method that reads a stack frame's
     local variables, add a catch for `com.sun.jdi.OpaqueFrameException` next
     to the existing JDWP error handling, and set `JDWPerror = true` inside
     it. Newer JDKs throw this exception where older ones returned JDWP
     error 35.
   - In `cp/traceprinter/JSONTracingThread.java`, add `"jdk.*"` to the
     `no_breakpoint_requests` array. The existing
     `"jdk.internal.org.objectweb.asm.*"` entry can be removed, since
     `"jdk.*"` covers it.

4. Compile the tracer with JDK 21 from inside `java-jail-spike/cp`:

   ```bash
   javac -cp ".:javax.json-1.0.jar" $(find . -name "*.java")
   ```

   On Windows, use `;` instead of `:` in the classpath.

5. If your JDK or tracer folder is somewhere else, set `JAVA_BIN` and
   `JAVA_JAIL_DIR` in `visualizer-ui/.env.local` (see `.env.example`).

java_jail's chroot sandbox only works on Linux. On other systems the tracer
runs code with your own user permissions, so only trace code you trust.

## License

MIT. See [LICENSE](LICENSE).
