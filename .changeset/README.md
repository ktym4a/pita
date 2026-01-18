# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs.

## Adding a changeset

When you make changes that should be released, run:

```bash
pnpm changeset
```

This will prompt you to:

1. Select the type of change (patch/minor/major)
2. Write a summary of the changes

The changeset file will be created in this directory.

## Release process

1. Changesets are accumulated from merged PRs
2. The GitHub Action creates a "Version Packages" PR
3. When the Version PR is merged:
   - `package.json` version is updated
   - `CHANGELOG.md` is generated
   - Git tag is created
   - GitHub Release is published with zip file
   - Extension is submitted to Chrome Web Store

## Changeset types

- **patch**: Bug fixes, minor improvements (0.0.x)
- **minor**: New features, non-breaking changes (0.x.0)
- **major**: Breaking changes (x.0.0)
