# Release Notes - v3.1.6

Release date: 2026-04-11  
Status: Published patch

## Highlights

- Added automated GitHub Release publishing for tag-driven or manually dispatched release asset uploads.
- Added a slim portable release builder that emits:
  - `signaler-<version>-portable.zip`
- Updated install and upgrade flows to extract the portable bundle first and install runtime dependencies during setup.
- Kept direct global launchers for:
  - `signaler`
  - `signalar`

## Quick Start (Global Install)

```powershell
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
signaler --version
```

After install:

```bash
signaler --version
signalar --version
signaler upgrade
signaler uninstall --global
```

## Notes

- GitHub Releases are the primary global distribution channel for Signaler.
- The release installer expects a `*-portable.zip` asset on the GitHub Release page.
- JSR remains supported for publishing and package consumption, but it is not the primary global bootstrap path.
