import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const { classifyTarget } = await import(
  join(packageDir, "dist/target-mode.js")
);

function assertEq(actual, expected, label) {
  if (actual !== expected)
    throw new Error(
      `classifyTarget(${label}) = ${actual}, expected ${expected}`
    );
}

// Remote: explicit server URLs and bare host:port.
assertEq(classifyTarget("http://localhost:5055"), "remote", "http://");
assertEq(classifyTarget("https://ui.example.com"), "remote", "https://");
assertEq(classifyTarget("red://localhost"), "remote", "red:// (http(s) alias)");
assertEq(classifyTarget("reds://host:5055"), "remote", "reds://");
assertEq(classifyTarget("grpc://host:5055"), "remote", "grpc://");
assertEq(classifyTarget("localhost:5055"), "remote", "bare host:port");
assertEq(
  classifyTarget("http://host/data.rdb"),
  "remote",
  "http URL serving .rdb"
);

// Remote: empty / absent → cold open, nothing local to serve.
assertEq(classifyTarget(""), "remote", "empty");
assertEq(classifyTarget(undefined), "remote", "undefined");
assertEq(classifyTarget(null), "remote", "null");
assertEq(classifyTarget("   "), "remote", "whitespace");

// Local: file:// and filesystem paths / .rdb files (browser can't reach them).
assertEq(classifyTarget("file:///data/app.rdb"), "local", "file://");
assertEq(classifyTarget("./mydb.rdb"), "local", "./relative .rdb");
assertEq(classifyTarget("../data/x.rdb"), "local", "../relative .rdb");
assertEq(classifyTarget("/var/lib/reddb/data.rdb"), "local", "absolute .rdb");
assertEq(classifyTarget("~/notes.rdb"), "local", "~ home path");
assertEq(classifyTarget("memory.rdb"), "local", "bare .rdb filename");
assertEq(classifyTarget("/etc/reddb/store"), "local", "absolute fs path");
assertEq(classifyTarget("C:\\data\\app.rdb"), "local", "windows path");

console.log("target-mode classifier test passed");
