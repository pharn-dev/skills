# Repository settings

These files describe the target configuration for `pharn-dev/skills`.
Committing them does not configure GitHub. Apply them after the community-files
PR is merged, from an up-to-date `main` checkout, using an account with repository
administration access. Check the [live rules](https://github.com/pharn-dev/skills/rules)
for current enforcement.

## Two rulesets

- [main.json](main.json) requires a PR, resolved review threads, an up-to-date
  branch, and the five PR checks. It blocks deletion and force push and has no
  bypass actors, including administrators.
- [main-review.json](main-review.json) requires one code-owner approval and
  dismisses stale approvals after code changes. Its only bypass actor is
  `PrzemekGalarowicz` (GitHub user ID `7968018`), in `pull_request` mode.

The GitHub Actions checks use application ID `15368`; Socket uses `156372`.
The post-merge skills.sh job is not a PR requirement.

The Argus rename changes the CI contexts to `Phargus (Node 22.18.0)` and
`Phargus (Node 24)`. If the live required checks include the old Argus names,
replace them when the rename PR starts reporting the Phargus checks; otherwise
GitHub will wait for the obsolete checks. Use the new names when activating this ruleset.
Changing main.json in Git does not update the live ruleset.

GitHub [applies all matching rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets).
The review exception therefore does not bypass the separate PR and CI rules.
GitHub does not allow authors to approve their own PRs. The exception permits
the maintainer to merge those PRs and also applies to software using the
maintainer's credentials.

## Apply after merge

First confirm that the merged `main` contains these files and
`.github/CODEOWNERS`, and that the five named checks report on PRs. Save the live
rulesets and repository/Actions settings before changing them so configuration
can be compared or restored deliberately.

The existing `main` ruleset is ID `24857002`. Verify its name and repository
before updating it. Create `main-review` first; on a repeat deployment, update
the existing repository ruleset with that name instead of creating a duplicate:

```bash
review_ruleset_id="$(gh api 'repos/pharn-dev/skills/rulesets?includes_parents=false' \
  --jq '.[] | select(.name == "main-review") | .id')"
if [ -n "$review_ruleset_id" ]; then
  gh api --method PUT "repos/pharn-dev/skills/rulesets/$review_ruleset_id" \
    --input .github/rulesets/main-review.json
else
  gh api --method POST repos/pharn-dev/skills/rulesets \
    --input .github/rulesets/main-review.json
fi

gh api --method PUT repos/pharn-dev/skills/rulesets/24857002 \
  --input .github/rulesets/main.json
```

Enable the native security features:

```bash
gh api --method PUT repos/pharn-dev/skills/private-vulnerability-reporting
gh api --method PUT repos/pharn-dev/skills/vulnerability-alerts
gh api --method PUT repos/pharn-dev/skills/automated-security-fixes
gh api --method PATCH repos/pharn-dev/skills --input - <<'JSON'
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
JSON
```

Require full action SHAs while preserving the current allowed-actions policy:

```bash
gh api repos/pharn-dev/skills/actions/permissions \
  --jq '{enabled, allowed_actions, sha_pinning_required: true}' |
  gh api --method PUT repos/pharn-dev/skills/actions/permissions --input -
```

Keep the default workflow token read-only, workflow review approval disabled,
and automatic merge disabled. Dependabot's version-update schedule is in
[dependabot.yml](../dependabot.yml): npm in `/src/phargus`, GitHub Actions in `/`,
weekly, with at most five open version-update PRs per ecosystem. Versions
embedded in commands such as `npx skills@...` are updated deliberately.

## Verify activation

Read back the effective rules and each repository ruleset, including its bypass
list. The base rules must have no bypass; the review rules must have exactly the
single PR-only user exception. Confirm five checks with their application IDs,
strict branch freshness, code-owner approval, stale-review dismissal, resolved
threads, and blocked deletion/force push.

```bash
gh api repos/pharn-dev/skills/rules/branches/main
gh api 'repos/pharn-dev/skills/rulesets?includes_parents=false'
gh api repos/pharn-dev/skills/rulesets/24857002
gh api repos/pharn-dev/skills/private-vulnerability-reporting
gh api repos/pharn-dev/skills/automated-security-fixes
gh api repos/pharn-dev/skills --jq .security_and_analysis
gh api repos/pharn-dev/skills/actions/permissions
gh api repos/pharn-dev/skills/actions/permissions/workflow
gh api 'repos/pharn-dev/skills/codeowners/errors?ref=main'
```

Confirm that GitHub recognizes the issue forms, CODEOWNERS, and the private
reporting link. For a PR from another account, the merge panel must require the
code owner's approval. For a maintainer PR, the review exception must still leave
the five checks, branch freshness, and resolved threads enforced. Use rule
configuration and GitHub's merge panel to verify enforcement without attempting
to write a test commit to `main`.

If GitHub rejects a setting or feature, stop that configuration step, retain the
versioned target, and report the actual API error. Verify successfully applied
settings separately rather than treating file validation as live activation.
