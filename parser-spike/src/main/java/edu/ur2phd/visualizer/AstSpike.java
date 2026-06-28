package edu.ur2phd.visualizer;

import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.body.VariableDeclarator;
import com.github.javaparser.ast.expr.BinaryExpr;
import com.github.javaparser.ast.expr.MethodCallExpr;
import com.github.javaparser.ast.expr.StringLiteralExpr;
import com.github.javaparser.ast.stmt.BlockStmt;
import com.github.javaparser.ast.stmt.ForStmt;

import java.util.ArrayList;
import java.util.List;

/**
 * AstSpike – proves JavaParser can parse Java source into an AST and extract
 * the block boundaries (methods + loops) with line numbers that the
 * Interactive Code Visualizer frontend will collapse into single playback steps.
 *
 * Run (no Maven required):
 *   javac -cp javaparser-core-3.28.2.jar AstSpike.java
 *   java  -cp .;javaparser-core-3.28.2.jar edu.ur2phd.visualizer.AstSpike
 */
public class AstSpike {

    // A small sample program: sums the numbers 1..3 in a for loop and prints it.
    private static final String SOURCE = """
            public class Sample {
                public static void main(String[] args) {
                    int sum = 0;
                    for (int i = 1; i <= 3; i++) {
                        sum += i;
                    }
                    System.out.println("Sum = " + sum);
                    printHelloWorld();
                }
                public static void printHelloWorld() {
                    System.out.println("Hello World");
                }
            }
            """;

    public static void main(String[] args) {
        System.out.println("== Source being parsed ==");
        System.out.println(SOURCE);

        // Parse the source string into the root AST node.
        CompilationUnit cu = StaticJavaParser.parse(SOURCE);

        // --- 1. Walk the AST, printing the node types we care about, indented by depth ---
        System.out.println("== AST walk (MethodDeclaration / BlockStmt / ForStmt / VariableDeclarator) ==");
        List<Node> collapsibleBlocks = new ArrayList<>();

        cu.walk(node -> {
            boolean interesting =
                    node instanceof MethodDeclaration
                    || node instanceof BlockStmt
                    || node instanceof ForStmt
                    || node instanceof VariableDeclarator;
            if (!interesting) {
                return;
            }

            int depth = depthOf(node);
            String indent = "  ".repeat(depth);
            String type = node.getClass().getSimpleName();
            System.out.printf("%s%-20s %s%n", indent, type, lineRange(node));

            // The frontend collapses whole methods and whole loops into one step.
            if (node instanceof MethodDeclaration || node instanceof ForStmt) {
                collapsibleBlocks.add(node);
            }
        });

        // --- 2. The thing the visualizer actually needs: collapsible block boundaries ---
        System.out.println();
        System.out.println("== Block boundaries the frontend can collapse into one step ==");
        for (Node block : collapsibleBlocks) {
            String type = block.getClass().getSimpleName();
            String label = (block instanceof MethodDeclaration md)
                    ? "method " + md.getNameAsString() + "()"
                    : "for loop";
            block.getRange().ifPresent(r ->
                    System.out.printf("  %-18s %-14s collapse lines %d..%d%n",
                            type, label, r.begin.line, r.end.line));
        }

        // --- 3. Walk all System.out.println calls and extract what they print ---
        System.out.println();
        System.out.println("== What each println call will output ==");
        cu.walk(MethodCallExpr.class, call -> {
            if (!call.getNameAsString().equals("println")) return;
            if (call.getScope().isEmpty()) return;
            if (!call.getScope().get().toString().equals("System.out")) return;
            if (call.getArguments().isEmpty()) return;

            String methodName = call.findAncestor(MethodDeclaration.class)
                    .map(MethodDeclaration::getNameAsString)
                    .orElse("(unknown)");

            var arg = call.getArgument(0);
            if (arg instanceof StringLiteralExpr sle) {
                System.out.printf("  %s(): prints \"%s\"%n", methodName, sle.asString());
            } else if (arg instanceof BinaryExpr be && be.getLeft() instanceof StringLiteralExpr sle) {
                System.out.printf("  %s(): prints \"%s\" (plus a runtime value)%n", methodName, sle.asString());
            } else {
                System.out.printf("  %s(): prints %s (non-literal)%n", methodName, arg);
            }
        });
    }

    /** Depth of a node = number of ancestors up to the root. */
    private static int depthOf(Node node) {
        int d = 0;
        for (Node c = node; c.getParentNode().isPresent(); c = c.getParentNode().get()) {
            d++;
        }
        return d;
    }

    /** "lines 4..6" style range, or "(no range)" if unavailable. */
    private static String lineRange(Node node) {
        return node.getRange()
                .map(r -> "lines " + r.begin.line + ".." + r.end.line)
                .orElse("(no range)");
    }
}
