# Connect Argus to an application

Inspect package.json, Node version, actual start command and stdout logging. Run doctor
if Argus is already installed. At the pinned pre-release commit, install from source:

```bash
git clone https://github.com/pharn-dev/argus.git /chosen/source/argus
git -C /chosen/source/argus checkout a69d644383efe19c82fb3cfdee83a0ad1dd5e0f9
cd /chosen/source/argus
npm ci
npm pack
cd /app
npm install /chosen/source/argus/argus-0.0.1.tgz
```

Respect the application's existing package manager and lockfile. The source Argus
repository itself uses npm. If the user already supplied the compatible tarball, use it.

Load the agent before application code. CommonJS: node --require argus/agent app.cjs.
ESM: node --import argus/agent app.mjs. These are Node commands, not a nonexistent
Argus CLI. Adapt wrappers such as tsx or framework runners to their actual Node launch.

Prefer ARGUS_OUTPUT=/absolute/app/.argus/raw.ndjson so ordinary logs cannot corrupt the
data stream. The parent directory must exist. ARGUS_INTERVAL_MS defaults to 1000,
ARGUS_QUEUE_BOUND to 1024, ARGUS_ENABLED to true. argus.config.json has output,
intervalMs, queueBound and enabled. Unknown ARGUS_* variables warn; invalid values
disable collection while the application continues. Check stderr as well as startup.

The agent does not launch a dashboard. For a portable application-side collector,
copy the entire bundled scripts directory to an application-owned location such as
.argus/tools, then create a diagnostic npm script invoking those local files. Preserve
their sibling modules. Never leave an absolute path to a user's skill/plugin cache in
the start command. Keep transient captures out of version control.

Start the application, then run the copied collect helper with --follow. Bind to
127.0.0.1 by default. Non-loopback requires a nonempty token. The dashboard is HTTP;
use a tunnel or TLS proxy for remote access. Scripts use Authorization: Bearer.
The dashboard answers only its bind address (plus localhost names for loopback); any
other Host header gets 421 and a cross-origin /events request gets 403. Behind a reverse
proxy or container port mapping that forwards another name, pass --allowed-host NAME
(repeatable; NAME or NAME:PORT) to the collect helper, or allowedHosts to
createDashboardServer. An SSH tunnel to the loopback port needs no allowed host.

Exercise an existing harmless application endpoint or its representative test workload,
wait for samples, and capture /events. Check metrics and expected incoming request spans.
Restart using the saved recipe and repeat; successful imports alone do not verify setup.
Stop processes you started and close the collector/dashboard when the test finishes.

Under the Node permission model, grant the required output file access. Tracing and
samplers add measurable overhead, especially promise-heavy work on Node 22. Use an
application workload to quantify it; a successful setup is not a zero-overhead claim.
