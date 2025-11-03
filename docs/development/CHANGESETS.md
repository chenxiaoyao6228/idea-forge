# Changesets Guide

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs in our monorepo.

## What are Changesets?

Changesets is a tool that helps manage versions and changelogs for multi-package repositories (monorepos). It allows you to:

- Track which packages need version bumps
- Generate changelogs automatically
- Coordinate releases across multiple packages
- Ensure proper semantic versioning

## When to Create a Changeset

Create a changeset when you make changes that should be reflected in the package version:

- ✅ **New features** (minor version bump)
- ✅ **Bug fixes** (patch version bump)
- ✅ **Breaking changes** (major version bump)
- ✅ **API changes** that affect consumers
- ❌ **Internal refactoring** without user-facing changes
- ❌ **Documentation-only** changes
- ❌ **Test updates** without code changes

## How to Use Changesets

### 1. Create a Changeset

When you make changes that require a version bump, create a changeset:

```bash
pnpm changeset
```

This will:
1. Prompt you to select which packages have changed
2. Ask whether the change is a major, minor, or patch
3. Request a summary of the changes (this will appear in the changelog)
4. Create a new changeset file in `.changeset/`

**Example workflow:**
```bash
# After making your changes
git add .
pnpm changeset
# Follow the prompts
# Select packages: @idea/api, @idea/contracts
# Select bump type: patch
# Enter summary: "Fix notification cancellation for comment replies"
git add .changeset/
git commit -m "feat: fix notification cancellation for comments"
```

### 2. Version Packages

When you're ready to release, consume all changesets and bump package versions:

```bash
pnpm changeset:version
```

This will:
1. Update version numbers in package.json files
2. Update CHANGELOG.md files
3. Remove consumed changeset files
4. Update pnpm-lock.yaml with new versions

**After running this:**
```bash
git add .
git commit -m "chore: version packages"
```

### 3. Publish (Optional)

If publishing to npm (currently this project doesn't publish packages):

```bash
pnpm changeset:publish
```

## Changeset File Format

Changeset files are created in `.changeset/` with a random name. They look like this:

```markdown
---
"@idea/api": patch
"@idea/contracts": patch
---

Fix notification cancellation for comment replies

This change ensures that when a comment is deleted, any pending notification
jobs for replies to that comment are properly cancelled.
```

## Semantic Versioning

Follow [Semantic Versioning](https://semver.org/):

- **Major (x.0.0)**: Breaking changes
  - Removing features
  - Changing API contracts
  - Renaming/removing exports

- **Minor (0.x.0)**: New features (backward compatible)
  - Adding new features
  - Adding new optional parameters
  - Deprecating features (without removal)

- **Patch (0.0.x)**: Bug fixes (backward compatible)
  - Fixing bugs
  - Performance improvements
  - Documentation updates

## Best Practices

### Writing Good Changeset Summaries

**❌ Bad:**
```
Fix bug
Update code
Refactor
```

**✅ Good:**
```
Fix notification delivery for workspace members

Previously, workspace members wouldn't receive notifications for documents
they had permission to view. This change ensures notifications are properly
delivered based on the user's effective permissions.
```

### Multiple Changes in One PR

If your PR contains multiple logical changes, create separate changesets:

```bash
# First feature
pnpm changeset
# Select: minor for @idea/api
# Summary: "Add public document sharing"

# Second feature (separate changeset)
pnpm changeset
# Select: minor for @idea/client
# Summary: "Add share link UI components"
```

### Coordinating Releases

If changes in one package require changes in another:

```bash
pnpm changeset
# Select BOTH packages: @idea/api AND @idea/client
# This ensures they're released together
```

## Available Scripts

- `pnpm changeset` - Create a new changeset
- `pnpm changeset:version` - Consume changesets and update versions
- `pnpm changeset:publish` - Publish packages to npm (if configured)

## GitHub Workflow (CI/CD)

This project has automated changeset handling via GitHub Actions (`.github/workflows/changesets.yml`).

### How it Works

When you push commits with changesets to the `master` branch:

1. **If changesets exist**:
   - The workflow creates/updates a "Version Packages" PR
   - This PR contains all version bumps and CHANGELOG updates
   - The PR stays open accumulating changes until you're ready to release
   - When you merge this PR, versions are officially released

2. **Workflow triggers**:
   - Runs on every push to `master`
   - Uses concurrency control to prevent overlapping runs
   - Requires `GITHUB_TOKEN` (automatically provided)

### The Version PR

The automated "Version Packages" PR will:
- Update all package.json versions
- Generate/update CHANGELOG.md files
- Delete consumed changeset files
- Update pnpm-lock.yaml with new versions

**Example PR title**: `chore: version packages`

### Developer Workflow with CI

```bash
# 1. Create feature branch
git checkout -b feat/new-feature

# 2. Make changes and create changeset
pnpm changeset
git add .
git commit -m "feat: add new feature"

# 3. Push and create PR to master
git push origin feat/new-feature
# Create PR on GitHub

# 4. After PR is merged to master
# → GitHub Action automatically runs
# → Creates/updates "Version Packages" PR

# 5. When ready to release (maintainer)
# → Review and merge "Version Packages" PR
# → Versions are officially released
```

### Manual Override

If you need to version manually (bypassing CI):

```bash
pnpm changeset:version
git add .
git commit -m "chore: version packages"
git push
```

### Workflow Permissions

The workflow requires these permissions (already configured):
- `contents: write` - To create commits and tags
- `pull-requests: write` - To create/update version PRs

## Configuration

Changeset configuration is in `.changeset/config.json`:

```json
{
  "baseBranch": "master",
  "updateInternalDependencies": "patch",
  "access": "restricted"
}
```

- **baseBranch**: The branch changesets compares against (master for this project)
- **updateInternalDependencies**: How to bump internal dependencies
- **access**: Package access level (restricted = private, public = public)

## Example Workflow

**Scenario**: You fixed a bug in the API and updated types in contracts

```bash
# 1. Make your changes
# ... edit files ...

# 2. Create a changeset
pnpm changeset
# ✓ Select packages: @idea/api, @idea/contracts
# ✓ Select bump: patch (it's a bug fix)
# ✓ Enter summary: "Fix permission inheritance for subspace documents"

# 3. Commit with your changes
git add .
git commit -m "fix: correct permission inheritance for subspace documents"

# 4. Later, when ready to release (done by maintainer)
pnpm changeset:version
git add .
git commit -m "chore: version packages"
git push
```

## FAQ

**Q: Do I need a changeset for every PR?**
A: No, only for changes that affect package functionality. Documentation, tests, and internal refactoring usually don't need changesets.

**Q: Can I edit a changeset file after creating it?**
A: Yes! Changeset files are just markdown. Edit them in `.changeset/` before committing.

**Q: What if I forget to create a changeset?**
A: You can create one later using `pnpm changeset` and commit it separately or amend your commit.

**Q: How do I know which packages to select?**
A: Select packages that have user-facing changes. If you changed code in `apps/api`, select `@idea/api`. If you changed types that both api and client use, select both.

**Q: Will the Version PR be created automatically?**
A: Yes! When changesets are merged to `master`, the GitHub Action automatically creates or updates a "Version Packages" PR. You don't need to run `changeset:version` manually.

**Q: Can I merge multiple feature PRs before releasing?**
A: Absolutely! The "Version Packages" PR accumulates all changesets. Merge as many feature PRs as you want, and the version PR will keep updating until you're ready to release it.

**Q: What happens if the GitHub Action fails?**
A: Check the Actions tab in GitHub. Common issues: missing dependencies, build failures. You can always run `pnpm changeset:version` manually as a fallback.

**Q: Do I need to close the old Version PR when creating a new one?**
A: No! The workflow reuses the same Version PR, updating it with new changesets. It won't create duplicate PRs.

## Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [Writing Good Changelogs](https://keepachangelog.com/)
