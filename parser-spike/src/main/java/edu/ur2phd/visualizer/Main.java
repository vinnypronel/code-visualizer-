package edu.ur2phd.visualizer;

import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.visitor.VoidVisitorAdapter;
import com.github.javaparser.ast.stmt.ForStmt;
import com.github.javaparser.ast.expr.AssignExpr;
import com.github.javaparser.ast.expr.BinaryExpr;
import com.github.javaparser.ast.expr.UnaryExpr;
import com.github.javaparser.ast.expr.NameExpr;
import com.github.javaparser.ast.expr.IntegerLiteralExpr;

/**
 * Parser Spike – demonstrates how to parse a Java for-loop with JavaParser
 * (version 3.28.2) and walk the resulting Abstract Syntax Tree (AST).
 *
 * <p>Run via Maven:
 * <pre>
 *   mvn compile exec:java
 * </pre>
 */
public class Main {

    // -----------------------------------------------------------------------
    // Sample Java source that contains the for-loop we want to analyse
    // -----------------------------------------------------------------------
    private static final String SOURCE = """
            public class Sample {
                public static void main(String[] args) {
                    int sum = 0;
                    for (int i = 0; i < 10; i++) {
                        sum += i;
                    }
                    System.out.println("Sum = " + sum);
                }
            }
            """;

    public static void main(String[] args) {

        System.out.println("╔══════════════════════════════════════════════════╗");
        System.out.println("║        JavaParser AST Explorer – Spike           ║");
        System.out.println("╚══════════════════════════════════════════════════╝");
        System.out.println();
        System.out.println("── Source being parsed ────────────────────────────");
        System.out.println(SOURCE);
        System.out.println("── Full AST (depth-first walk) ────────────────────");

        // Parse the source string into a CompilationUnit (the root AST node)
        CompilationUnit cu = StaticJavaParser.parse(SOURCE);

        // Walk every node in the tree and print it
        cu.walk(node -> {
            int depth = depth(node);
            String indent = "  ".repeat(depth);
            String nodeType = node.getClass().getSimpleName();
            String range = node.getRange()
                    .map(r -> " [line " + r.begin.line + ":" + r.begin.column
                            + " → " + r.end.line + ":" + r.end.column + "]")
                    .orElse("");
            String snippet = node.toString().lines().findFirst().orElse("").trim();
            if (snippet.length() > 60) {
                snippet = snippet.substring(0, 57) + "...";
            }
            System.out.printf("%s▸ %-38s%s%n", indent, nodeType + range, snippet);
        });

        System.out.println();
        System.out.println("── For-loop deep-dive ─────────────────────────────");
        // Use a typed visitor to focus only on the ForStmt
        cu.accept(new ForLoopVisitor(), null);

        System.out.println();
        System.out.println("── Done ────────────────────────────────────────────");
    }

    // -----------------------------------------------------------------------
    // Helper: calculate the depth of a node in the tree
    // -----------------------------------------------------------------------
    private static int depth(Node node) {
        int d = 0;
        Node current = node;
        while (current.getParentNode().isPresent()) {
            d++;
            current = current.getParentNode().get();
        }
        return d;
    }

    // -----------------------------------------------------------------------
    // Typed visitor that extracts structured information from the for-loop
    // -----------------------------------------------------------------------
    private static class ForLoopVisitor extends VoidVisitorAdapter<Void> {

        @Override
        public void visit(ForStmt forStmt, Void arg) {
            System.out.println("ForStmt detected:");

            // Initializer
            System.out.println("  Initialization : " + forStmt.getInitialization());

            // Compare expression
            forStmt.getCompare().ifPresent(cmp -> {
                System.out.println("  Compare        : " + cmp);
                if (cmp instanceof BinaryExpr binaryExpr) {
                    System.out.println("    Operator     : " + binaryExpr.getOperator());
                    System.out.println("    Left operand : " + binaryExpr.getLeft());
                    System.out.println("    Right operand: " + binaryExpr.getRight());
                }
            });

            // Update expressions
            System.out.println("  Update         : " + forStmt.getUpdate());
            forStmt.getUpdate().forEach(upd -> {
                if (upd instanceof UnaryExpr unaryExpr) {
                    System.out.println("    Unary op     : " + unaryExpr.getOperator()
                            + " on " + unaryExpr.getExpression());
                }
            });

            // Body
            System.out.println("  Body           : " + forStmt.getBody());

            // Continue walking into child nodes
            super.visit(forStmt, arg);
        }

        @Override
        public void visit(AssignExpr assignExpr, Void arg) {
            // Only report assigns inside the loop body
            System.out.println("  AssignExpr     : " + assignExpr
                    + "  [operator=" + assignExpr.getOperator() + "]");
            super.visit(assignExpr, arg);
        }

        @Override
        public void visit(NameExpr nameExpr, Void arg) {
            System.out.println("  NameExpr       : " + nameExpr.getNameAsString());
            super.visit(nameExpr, arg);
        }

        @Override
        public void visit(IntegerLiteralExpr intLiteral, Void arg) {
            System.out.println("  IntegerLiteral : " + intLiteral.asInt());
            super.visit(intLiteral, arg);
        }
    }
}
