# UR2PhD Summer REU - Visualizer-UI

## What this is
Summer research project "AI-Powered Interactive Code Visualization" (Vinny + partner Kiana,
mentor Dr. Yan Ma). Visualizes Java program execution step by step; sprints are defined by the
research plan. Vinny is learning this domain: explain what things are and answer questions
before touching code, and verify each step actually works rather than reporting that it should.

## Environment (verified June 2026)
- JDK 21 at C:\Program Files\Java\jdk-21, set as user JAVA_HOME and prepended to user PATH. The
  SYSTEM default is Java 8 via an Oracle javapath entry; a fresh terminal is needed after env
  changes. Always confirm `java -version` shows 21 before building.
- No global Maven. Use the wrapper: `cd parser-spike && .\mvnw.cmd compile exec:java`.

## Verified components
- parser-spike/: JavaParser AST extraction, prints collapsible block line ranges (methods,
  loops) and can extract System.out.println literal arguments.
- java-jail-spike/: java_jail (JDI tracer, daveagp/java_jail) producing real execution JSON
  traces (events call/step_line/return, stack_to_render frames, encoded_locals, cumulative
  stdout, globals, heap). Sample trace at java-jail-spike/sample_trace.json.

## Next phase
Wire AST collapse ranges + trace steps into the actual visualizer frontend (collapse loops and
methods into single steps during playback).
