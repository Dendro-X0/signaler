# GitHub Releases Cleanup Guide

## 🧹 Why Clean Up Releases?

The current GitHub Releases show v1.0.9 as "Latest" which is misleading since we're now at v2.0.0 and using JSR-only distribution.

## 🎯 Cleanup Strategy

### Option 1: Delete All Releases (Recommended)
Since we're moving to JSR-only distribution, we can delete all GitHub Releases:

1. Go to: https://github.com/Dendro-X0/signaler/releases
2. For each release (starting with oldest):
   - Click on the release
   - Click "Edit release" 
   - Click "Delete release"
   - Confirm deletion

### Option 2: Keep Tags, Delete Releases
If you want to keep the git tags but remove the GitHub Release pages:

1. Delete the release pages (as above)
2. Keep the git tags in the repository
3. This maintains version history without the confusing "Latest" labels

### Option 3: Create Single v2.0.0 Release (Not Recommended)
If you want one GitHub Release for v2.0.0:

1. Delete all old releases
2. Create a new v2.0.0 release with JSR-only instructions
3. But this goes against our JSR-only strategy

## 📋 Releases to Clean Up

Current releases that should be deleted:
- v1.0.12
- v1.0.11  
- v1.0.10
- v1.0.9 (currently marked as "Latest")
- v1.0.8
- v1.0.7
- v1.0.2
- v1.0.1
- v0.2.8
- v0.2.7
- And all other v0.x releases

## ✅ After Cleanup

After deleting releases:
- ✅ No confusing "Latest" version labels
- ✅ Users directed to JSR for installation
- ✅ Cleaner repository presentation
- ✅ No outdated download links

## 🚀 JSR-Only Message

Consider adding a note to the repository description or README that says:
> "Install via JSR: `npx jsr add @signaler/cli` - No GitHub Releases needed!"

This makes it clear that JSR is the only distribution method.

---

**Recommendation**: Delete all GitHub Releases and rely exclusively on JSR for distribution. This eliminates confusion and provides a single source of truth.