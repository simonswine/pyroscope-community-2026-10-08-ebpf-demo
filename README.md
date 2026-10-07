# Under the hood

Open `index.html` for the eBPF guide, Go workload source, and Linux/Docker labs.

## Deploy to GitHub Pages

1. Push this project to your GitHub repository with `index.html` and `.github/` at the repository root.
2. In **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source.
3. Push to `main`, or run **Deploy to GitHub Pages** manually from the Actions tab.

The workflow publishes the static app and downloadable Go/bpftrace examples, without compiled binaries. The deployment URL appears in the workflow's `github-pages` environment. If your default branch isn't `main`, update `.github/workflows/pages.yml`. GitHub Pages serves the guide only; the Linux examples still run on your own machine.

## Two independent sessions, discovery inside bpftrace

Terminal A:

```sh
go build -o examples/workload examples/workload.go
./examples/workload
```

Leave it running. Terminal B, from the same project root:

```sh
export WORKLOAD_PID="$(sudo bpftrace -q examples/discover.bt)"
[[ "$WORKLOAD_PID" =~ ^[1-9][0-9]*$ ]] && echo "Discovered: $WORKLOAD_PID"
# Continue only if discovery returned one positive integer.
sudo bpftrace examples/writes.bt "$WORKLOAD_PID"
sudo bpftrace examples/stacks.bt "$WORKLOAD_PID"
sudo bpftrace examples/uprobe.bt
```

Discover once with a uprobe on `main.helloWorld`, export the kernel PID into the tracing shell's environment, and pass it to the write and stack examples. The uprobe example requires no PID or discovery: it attaches directly to the executable and observes all its running instances. No pgrep, comm filters, shell launcher, or `/proc` discovery. Run exactly one instance: discovery selects the first observed process and exits, or returns empty after ten seconds. Stop if discovery fails. Repeat discovery after any workload restart; stale PIDs can be reused by unrelated processes. Both sessions must see the same actual executable file, not separate copies; don't rebuild it while running. Kernel BTF is required for `curtask` field access. This avoids the namespace PID helper that produced `get_ns_current_pid_tgid, retcode: -22`. No host PID namespace sharing is needed. Nested containers still need tracing permissions from their outer environment.

Each trace stops after ten seconds; the demo continues until Ctrl+C. The demo prints `hello world` every 500 ms. The uprobe prints `eBPF observed: helloWorld() called`, without modifying output or confirming write success.

## Docker on native Linux

Use a trusted disposable Linux host: privileged containers grant broad host access. With tracefs mounted at `/sys/kernel/tracing`, from the project root:

Terminal A:

```sh
docker run --name ebpf-playground -t -i \
  --privileged \
  -v "$PWD":/workspace \
  -v /sys/kernel/tracing:/sys/kernel/tracing:ro \
  -w /workspace golang:latest bash
# Inside:
apt-get update && apt-get install -y bpftrace
go build -o examples/workload examples/workload.go
./examples/workload
```

Terminal B:

```sh
docker exec -t -i -w /workspace ebpf-playground bash
# Inside:
export WORKLOAD_PID="$(bpftrace -q examples/discover.bt)"
[[ "$WORKLOAD_PID" =~ ^[1-9][0-9]*$ ]] && echo "Discovered: $WORKLOAD_PID"
# Continue only if discovery returned one positive integer.
bpftrace examples/writes.bt "$WORKLOAD_PID"
bpftrace examples/stacks.bt "$WORKLOAD_PID"
bpftrace examples/uprobe.bt
```

Exit Terminal B, Ctrl+C the demo in Terminal A, exit its shell, then `docker rm ebpf-playground` on the host. Don't disable security controls to make tracing work. If errors persist, collect `bpftrace --version`, `uname -r`, and `bpftrace --info`.

Preserve Go symbols and `//go:noinline`. Generic native stack samples may be sparse/incomplete and don't reproduce OTel's runtime-aware unwinding. Return probes can conflict with Go stack management.

The Go workload has been built and smoke-tested. Linux tracing has not been execution-tested here. Docker instructions assume rootful native Linux, not Docker Desktop. Fonts optionally load from Google Fonts.
