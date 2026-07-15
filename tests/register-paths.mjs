// Registers the `@/*` path alias (from tsconfig.json) for the node test runner,
// so test files can import project modules the same way the app does.
import { register } from "tsconfig-paths";

register({
  baseUrl: new URL("..", import.meta.url).pathname,
  paths: { "@/*": ["./*"] },
});
