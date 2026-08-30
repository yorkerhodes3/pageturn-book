# 12. Dev & Delivery {#dev-delivery}

## Repository {#term-12-1}

*Repo*

The project folder plus its entire history of changes. Everything else in version control is an operation on a repository.

## Version control {#term-12-2}

*Git, VCS*

A system that records every change to a codebase, who made it and why, and lets you go back. Git is the near-universal one; GitHub and GitLab are hosts for it.

## Clone {#term-12-3}



Copying a remote repository, including its full history, onto your own machine. The first command of most working days.

## Fork {#term-12-4}



Your own server-side copy of someone else's repository, so you can change it without write access to the original and propose the change back.

## Branch {#term-12-5}



A named line of work running alongside the main one. It lets you build or break something without affecting what everyone else is using.

## main / master {#term-12-6}

*Default branch*

The branch treated as the source of truth. Most projects protect it so nothing lands without review.

## Commit {#term-12-7}



A saved, described snapshot of your changes, recorded permanently in the history. The unit of work everything else — review, revert, blame — operates on.

## Commit message {#term-12-8}



The note explaining what changed and why. The why is the part future-you cannot reconstruct from the diff.

## Staging area {#term-12-9}

*Index*

Git's holding pen between your working files and a commit. `git add` puts changes there so you can commit some edits and not others.

## Push {#term-12-10}



Sending your local commits up to the remote repository so others — and any deployment pipeline — can see them. Nothing you have not pushed exists to anyone else.

## Pull {#term-12-11}



Fetching changes from the remote and merging them into your branch. Pull before you start work, or you will be resolving conflicts later.

## Fetch {#term-12-12}



Downloading remote changes without applying them to your working copy. The cautious half of a pull, when you want to look before you merge.

## Sync {#term-12-13}



Bringing two copies into agreement — usually a pull followed by a push, so local and remote match. In GUIs it is often one button doing both.

## Remote {#term-12-14}

*origin, upstream*

A named repository your local copy talks to. `origin` is normally your own copy; `upstream` is the original you forked from.

## Merge {#term-12-15}



Combining one branch's changes into another. Git does it automatically unless both sides edited the same lines.

## Merge conflict {#term-12-16}



Two branches changed the same lines and Git refuses to guess. You pick what the file should say, then commit the resolution.

## Rebase {#term-12-17}



Replaying your commits on top of an updated branch to give a straight history instead of a merge. Never rebase a branch other people have already pulled.

## Pull request {#term-12-18}

*PR / merge request / MR*

A proposal to merge one branch into another, with a place to discuss and review it first. Where code review, CI checks and approvals happen.

## Code review {#term-12-19}



Another engineer reading a change before it lands. The cheapest place to catch both bugs and security mistakes.

## Diff {#term-12-20}



The line-by-line difference between two versions — what was added, removed and changed. What you actually review, rather than the whole file.

## HEAD {#term-12-21}



A pointer to the commit you currently have checked out. `HEAD~1` is the one before it.

## Tag {#term-12-22}



A permanent name pinned to a specific commit, normally a release like v2.1.0. Unlike a branch, it does not move.

## Release {#term-12-23}



A tagged, packaged version handed to users, usually with notes and built artifacts attached.

## Revert {#term-12-24}



Creating a new commit that undoes an earlier one, leaving the history intact. The safe way to back out a change that is already public.

## Reset {#term-12-25}



Moving your branch pointer backwards, optionally throwing away work. Powerful locally, destructive if you force-push the result.

## Cherry-pick {#term-12-26}



Copying one specific commit onto another branch. How an urgent fix reaches a release branch without dragging everything else with it.

## Stash {#term-12-27}



Parking uncommitted changes temporarily so you can switch context, then bringing them back.

## .gitignore {#term-12-28}



A list of paths Git should never track — build output, local config, secrets. The first line of defence against committing a key by accident.

## Monorepo {#term-12-29}



Many projects in one repository, sharing tooling and history. Simpler coordination, heavier tooling; the alternative is many small repos.

## CI {#term-12-30}

*Continuous Integration*

Automatically building and testing every change as it is pushed, so problems surface in minutes rather than at release.

## CD {#term-12-31}

*Continuous Delivery / Deployment*

Delivery keeps every change releasable at a button press; deployment ships it automatically once checks pass. The two are often written as one and mean different things.

## Pipeline {#term-12-32}

*Workflow, GitHub Actions*

The scripted sequence that runs on a push — install, lint, test, build, scan, deploy. It holds real credentials, which makes it a genuine attack surface.

## Build {#term-12-33}



Turning source code into something runnable — compiled, bundled, containerised. A build that only works on one machine is a bug.

## Artifact {#term-12-34}



The output of a build: a binary, a container image, a zipped bundle. What actually gets deployed, as opposed to the source.

## Deploy {#term-12-35}

*Ship, release to production*

Putting a built version onto the servers where real users reach it. Small, frequent deploys are safer than big rare ones, because there is less to unpick when one goes wrong.

## Environment {#term-12-36}

*dev / staging / production*

Separate copies of the system for building, testing and real use. Staging should resemble production closely enough that passing there means something.

## Production {#term-12-37}

*Prod*

The live system real people depend on. Every rule about review, backups and change control exists because of what happens here.

## Rollback {#term-12-38}



Returning to the previous working version after a bad deploy. Knowing you can roll back in one step is what makes frequent deploys reasonable.

## Blue-green / canary deploy {#term-12-39}



Two ways to release safely: run two full environments and switch traffic, or send the new version to a small slice of users first and watch.

## Feature flag {#term-12-40}

*Toggle*

A switch that turns functionality on or off without a deploy. Separates releasing code from releasing the feature — and stale flags become their own mess.

## Hotfix {#term-12-41}



An urgent fix taken straight to production outside the normal cycle. Legitimate, and worth logging, because it skipped the usual checks.

## Semantic versioning {#term-12-42}

*SemVer*

MAJOR.MINOR.PATCH, where major means a breaking change, minor adds features, patch fixes bugs. It tells you how nervous to be about upgrading.

## Breaking change {#term-12-43}



A change that stops existing users' code or configuration working. It needs a major version bump and a note, not a quiet release.

## Dependency {#term-12-44}

*Package, library*

Third-party code your project relies on. Most of a modern application is dependencies, which is why supply chain security is a real concern.

## Package manager {#term-12-45}

*npm, pip, cargo, apt*

The tool that installs and updates dependencies. Also the channel a typosquatted or hijacked package arrives through.

## Lockfile {#term-12-46}

*package-lock.json, requirements.txt*

A record of the exact dependency versions installed, so every machine and every build gets the same ones. Commit it.

## Environment variable {#term-12-47}

*env var, .env*

Configuration passed to a program at runtime instead of written into the code. Where secrets belong in development — and `.env` belongs in `.gitignore`.

## Linter / formatter {#term-12-48}



Tools that flag likely mistakes and enforce consistent style automatically. They end style arguments and catch a surprising number of bugs.

## Unit / integration test {#term-12-49}



Unit tests check one piece in isolation; integration tests check the pieces working together. You need both, and integration tests are the ones people skip.

## Regression {#term-12-50}



Something that used to work and now does not. Regression tests exist so the same bug cannot come back twice unnoticed.

## Refactor {#term-12-51}



Restructuring code without changing what it does. If behaviour changed, it was not a refactor, and it needs reviewing as a real change.

## Technical debt {#term-12-52}



Shortcuts taken to ship faster that cost more later. Sometimes a good trade — but only if someone writes down that it was taken.

## API {#term-12-53}

*Application Programming Interface*

The defined way one piece of software talks to another. Everything in the library section of this site is reached through one.

## REST / GraphQL {#term-12-54}



Two API styles: REST exposes resources at URLs and you take what each returns; GraphQL exposes one endpoint and you ask for exactly the fields you want.

## API endpoint {#term-12-55}

*Route*

A specific URL an API exposes for one operation. Each one needs its own authorisation check — this is where broken access control usually lives.

## Webhook {#term-12-56}



A URL you register so another service can push events to you as they happen, instead of you polling. Verify the signature, or anyone can post to it.

## SDK / CLI {#term-12-57}

*Software Development Kit / Command Line Interface*

A library that wraps an API in your language, and a terminal tool that wraps it for humans and scripts. Usually easier and safer than hand-rolling HTTP calls.

## JSON / YAML {#term-12-58}



The two everyday data formats: JSON for APIs, YAML for configuration. YAML's indentation and loose typing cause more outages than they should.

## Rate limit {#term-12-59}

*Quota*

How many API calls you are allowed in a window. Read it before writing the loop, cache the responses, and handle the 429 rather than retrying blindly.

## Idempotent {#term-12-60}



An operation that gives the same result whether you run it once or five times. What makes safe retries possible.

## Observability {#term-12-61}

*Logs, metrics, traces*

Being able to tell what a running system is doing from the outside. Logs say what happened, metrics count it, traces follow one request across services.

## SLA / SLO {#term-12-62}

*Service Level Agreement / Objective*

The availability you promise contractually, and the internal target you actually manage to. The objective should be stricter than the agreement.

## Upstream / downstream {#term-12-63}



Upstream is the project or service you depend on; downstream is whoever depends on you. Vulnerabilities travel downstream, fixes come from upstream.

## Deprecation {#term-12-64}

*EOL notice*

Formal warning that something will be removed, with a date. The window in which to migrate calmly rather than in an incident.

## Documentation {#term-12-65}

*README, docs*

The instructions that let someone else run, use or fix the thing. A project without a README is a project only its author can operate.
