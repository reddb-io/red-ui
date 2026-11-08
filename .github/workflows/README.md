# Workflow cost policy

Requested by the maintainer on 2026-11-05: keep automatic CI small and make
expensive validation optional. `quick-checks.yml` is the only automatic
quality workflow. It checks changed whitespace, workflow syntax, root/workspace
manifests and this trigger policy on one standard Ubuntu runner, with a
three-minute limit. It does not compile products or run full test suites.

Integration/browser tests, coverage, benchmarks, cross-platform matrices and
operational deployments are available through `workflow_dispatch`. They are
not required PR statuses. Recurring validation and watcher schedules are off.
Existing issue/comment routing remains available; releases only react to
intentional version tags, release events or an explicit manual action.
Artifact source/version/checksum and publication checks stay with publication.

## Run an optional workflow

In GitHub Actions, select its workflow, choose **Run workflow**, then select
the branch and inputs. From the CLI:

```sh
gh workflow run <file.yml> --repo reddb-io/red-ui --ref main
```

A workflow using `workflow_call` is a component of its parent operation.
Run the parent rather than dispatching a component without its required inputs.
Manual deployment and publication commands retain their existing environment,
identity and version requirements; this policy does not publish anything itself.

## Available workflows

| File | Events |
| --- | --- |
| `changesets.yml` | workflow_dispatch |
| `ci.yml` | workflow_dispatch |
| `pages.yml` | workflow_dispatch |
| `red-issues-needs-triage.yml` | issues |
| `release.yml` | push, workflow_dispatch |

## Platform switches

Multiplatform workflows declare `ENABLE_*` variables in their top-level `env`.
Values must be `true` or `false`. Repository Actions variables with the same
names override the workflow defaults, so platforms can be changed without a commit.

| Variable | Default |
| --- | --- |
| `ENABLE_LINUX_X64` | `true` |
| `ENABLE_LINUX_ARM64` | `true` |
| `ENABLE_WINDOWS_X64` | `true` |
| `ENABLE_WINDOWS_ARM64` | `false` |
| `ENABLE_MACOS_X64` | `false` |
| `ENABLE_MACOS_ARM64` | `false` |
| `ENABLE_LINUX_ARMV7` | `false` |
| `ENABLE_LINUX_X86` | `false` |

`x64` means x86_64; `ARM64` means aarch64. glibc/musl and baseline variants
follow their OS/architecture switch. A flag only enables targets already supported
by that workflow; it does not add new build targets. Older tags keep their original
workflow configuration.

The lightweight `Select platforms` job filters matrices before platform runners
are allocated. Disabled platforms create no build/test runner. All native
platforms can be disabled; jobs that require their artifacts then skip. Portable
web packages and platform-independent orchestration keep their existing behavior. The
three-minute automatic Quick checks policy and manual heavy-suite triggers remain.

Example (change only future runs):

```sh
gh variable set ENABLE_MACOS_ARM64 --body true
gh variable set ENABLE_WINDOWS_ARM64 --body false
```

Inspect the `Select platforms` job summary to see the effective selection.

Select `preview_platforms: true` in Run workflow to execute only the lightweight
platform selector. Builds, tests and publication are all skipped in this mode.


## Bounded company workers

Reviewed Linux web/package workflows on main select `reddb-ci-public` /
`reddb-public-linux-x64`. One public job at a time shares the existing two
dedicated CI nodes with the private repositories; no new node or disk is added.
The GitHub group admits exact workflow paths at `refs/heads/main`, not PR refs,
forks, arbitrary branches or tag-defined workflows. Quick checks retain hosted
routing so untrusted contributions cannot reach the privileged DinD environment.
Manual `runner_qualification` is only useful while rio-infra explicitly admits
the reviewed qualification ref; that temporary admission is revoked afterwards.
No automatic quality trigger, platform flag or publication gate is enabled.
Desktop/native/multiplatform lanes, Docker publication, integration/browser
qualification and npm provenance publication retain their existing hosted lanes.
Public runner limits are owned by rio-infra: a 12 GiB web/package pod without
Docker-in-Docker, with a bounded scratch workspace on the existing CI nodes.
