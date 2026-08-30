<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/agentic-behavior-observatory.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 06. Using it, and extending it {#use}

The dashboard runs the analysis in the browser. Two calls to the GitHub API for metadata and the file tree, then file bodies from the raw content host, which is CORS-open and not rate limited: roughly thirty repositories an hour with no token at all. Results stay in the browser and are marked live. Downloading the JSON is how one joins the shared corpus.

The command-line analyzer writes the committed corpus. It has no dependencies beyond the Python standard library, clones nothing, and picks up a GitHub token from the environment or from the gh CLI if one is available.

**Teaching it a framework.** The taxonomy is one file. Adding a simulation framework is one tuple naming its axis, key, kind, pattern, weight and label. The build step exports the same taxonomy to the browser, so a single edit updates both runtimes and no score can differ between them.

Analyzing the CoLab's own corpus exposed three defects in the taxonomy, all since fixed: HTML and JSX source was not being read at all, the file size cap excluded single-file applications, and the agent-detection patterns assumed agents are called agents rather than members, families, or residents. Any repository analyzed before those fixes scored misleadingly low, which is the argument for versioning a taxonomy the way one versions a model.
