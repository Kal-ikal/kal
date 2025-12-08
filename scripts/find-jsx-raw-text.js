/**
 * SAFE VERSION — NO CHALK, NO ESM
 * Works on all Node versions
 */

const fs = require("fs-extra");
const path = require("path");
const glob = require("glob");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const ROOT = process.cwd();
const PATTERN = "**/*.{tsx,jsx,ts,js}";
const IGNORE = [
  "node_modules/**",
  "ios/**",
  "android/**",
  ".expo/**",
  "dist/**",
  "build/**",
];

function parseFile(code) {
  return parser.parse(code, {
    sourceType: "module",
    plugins: [
      "typescript",
      "jsx",
      "classProperties",
      "optionalChaining",
      "nullishCoalescingOperator",
      "decorators-legacy",
    ],
  });
}

function isOnlyWhitespace(text) {
  return !text || /^\s*$/.test(text);
}

function report(out, file, loc, message, snippet) {
  out.push({ file, loc, message, snippet });
}

async function main() {
  console.log("\nScanning for raw JSX text and invalid string returns...\n");

  const files = glob.sync(PATTERN, { cwd: ROOT, ignore: IGNORE });
  const problems = [];

  for (const file of files) {
    const full = path.join(ROOT, file);
    let code;
    try {
      code = fs.readFileSync(full, "utf8");
    } catch {
      continue;
    }

    if (!code.trim()) continue;

    let ast;
    try {
      ast = parseFile(code);
    } catch (err) {
      report(
        problems,
        file,
        { line: 1 },
        "Could not parse file (syntax error)",
        err.message
      );
      continue;
    }

    traverse(ast, {
      JSXText(pathNode) {
        const text = pathNode.node.value;
        if (isOnlyWhitespace(text)) return;

        const parent = pathNode.parent;
        let name = "unknown";
        if (
          parent.openingElement &&
          parent.openingElement.name &&
          parent.openingElement.name.type === "JSXIdentifier"
        ) {
          name = parent.openingElement.name.name;
        }

        if (name !== "Text") {
          const loc = pathNode.node.loc.start;
          const lines = code.split("\n");
          const snippet = lines.slice(loc.line - 2, loc.line + 2).join("\n");
          report(problems, file, loc, `Raw JSX text inside <${name}>`, snippet);
        }
      },

      JSXExpressionContainer(pathNode) {
        const expr = pathNode.node.expression;

        if (expr && expr.type === "StringLiteral") {
          const parent = pathNode.parent;
          let name = "unknown";
          if (
            parent.openingElement &&
            parent.openingElement.name &&
            parent.openingElement.name.type === "JSXIdentifier"
          ) {
            name = parent.openingElement.name.name;
          }

          if (name !== "Text") {
            const loc = pathNode.node.loc.start;
            const lines = code.split("\n");
            const snippet = lines.slice(loc.line - 2, loc.line + 2).join("\n");
            report(
              problems,
              file,
              loc,
              `String literal {"..."} inside <${name}>`,
              snippet
            );
          }
        }
      },

      ReturnStatement(pathNode) {
        const arg = pathNode.node.argument;
        if (!arg) return;

        if (arg.type === "StringLiteral") {
          const loc = pathNode.node.loc.start;
          const lines = code.split("\n");
          const snippet = lines.slice(loc.line - 2, loc.line + 2).join("\n");
          report(
            problems,
            file,
            loc,
            `Function returns a raw string literal: return "${arg.value}"`,
            snippet
          );
        }
      },
    });
  }

  if (problems.length === 0) {
    console.log("✔ No problems found.\n");
    return;
  }

  console.log(`⚠ Found ${problems.length} issues:\n`);

  problems.forEach((p) => {
    console.log(`FILE: ${p.file}`);
    console.log(`LINE: ${p.loc.line}`);
    console.log(`PROBLEM: ${p.message}`);
    console.log("SNIPPET:");
    console.log(p.snippet);
    console.log("----------------------------------------\n");
  });

  fs.writeFileSync(
    "scan-jsx-raw-text-report.json",
    JSON.stringify(problems, null, 2)
  );

  console.log("Saved full report: scan-jsx-raw-text-report.json\n");
}

main();
