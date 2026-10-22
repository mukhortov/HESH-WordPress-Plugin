#!/usr/bin/env bash
#
# Release HTML Editor Syntax Highlighter to GitHub and/or WordPress.org.
#
# Usage: scripts/release.sh [all|github|wordpress] [options]
#
#   all          GitHub first, then WordPress.org (default)
#   github       commit the build to the `release` branch, tag vX.Y.Z and create the GitHub release
#   wordpress    commit the build to WordPress.org SVN trunk and tags/X.Y.Z
#
# Options:
#   --dry-run       build and show what would be published, without publishing anything
#   --yes           don't ask for confirmation before publishing
#   --assets        also copy assets/ (banners, icons, screenshots) to the WordPress.org /assets folder
#   --title TEXT    GitHub release title (default: "Version X.Y.Z")
#   --skip-install  build with the existing node_modules instead of running `npm ci`
#   -h, --help      show this help
#
# The version is read from the plugin header. It must match HESH_VERSION, the readme Stable tag and
# package.json, have a "= X.Y.Z =" entry in readme.txt, and be newer than the latest release.
# A pre-release version like 3.0.0-dev or 3.0.0-beta.1 is never released.
# A target that already has this version is skipped, so after a failure the script can simply be re-run.
#
# WordPress.org asks for your username and then your SVN password (generate it on your
# WordPress.org profile: Account & Security > SVN credentials). The GitHub Actions workflow passes
# them in SVN_USERNAME and SVN_PASSWORD instead.
#
# For testing against a sandbox: GIT_REMOTE (default "origin") and SVN_URL (default the plugin's repo).

set -euo pipefail

SLUG=html-editor-syntax-highlighter
MAIN_FILE=html-editor-syntax-highlighter.php
README_FILE=readme.txt
CHANGELOG_FILE=ChangeLog.md
MAIN_BRANCH=master
RELEASE_BRANCH=release
GIT_REMOTE=${GIT_REMOTE:-origin}
SVN_URL=${SVN_URL:-https://plugins.svn.wordpress.org/$SLUG}

target=all
dry_run=false
assume_yes=false
sync_assets=false
skip_install=false
title=""

die() { printf '\nError: %s\n' "$*" >&2; exit 1; }
step() { printf '\n==> %s\n' "$*"; }
info() { printf '    %s\n' "$*"; }
usage() { sed -n '3,29p' "$0" | sed 's/^# \{0,1\}//'; }

while [ $# -gt 0 ]; do
	case "$1" in
		all|github|wordpress) target=$1 ;;
		--dry-run) dry_run=true ;;
		--yes|-y) assume_yes=true ;;
		--assets) sync_assets=true ;;
		--skip-install) skip_install=true ;;
		--title)
			[ $# -ge 2 ] || die "--title needs a value"
			title=$2
			shift
			;;
		-h|--help) usage; exit 0 ;;
		*) die "Unknown argument: $1 (see --help)" ;;
	esac
	shift
done

want_github=false
want_wordpress=false
case $target in
	all) want_github=true; want_wordpress=true ;;
	github) want_github=true ;;
	wordpress) want_wordpress=true ;;
esac

cd "$(dirname "$0")/.."
[ -f "$MAIN_FILE" ] || die "Run this from the plugin repository ($MAIN_FILE not found)"

need() { command -v "$1" >/dev/null 2>&1 || die "$1 is required. $2"; }
need git ""
need node "Install Node.js."
need npm "Install Node.js."
need rsync ""
$want_github && need gh "Install the GitHub CLI: brew install gh"
$want_wordpress && need svn "Install Subversion: brew install subversion"

# prints the highest X.Y.Z read from stdin (one per line), or nothing
latest_version() {
	node -e '
		const versions = require("fs").readFileSync(0, "utf8").split(/\s+/).filter(v => /^\d+(\.\d+)*$/.test(v));
		const cmp = (a, b) => { a = a.split(".").map(Number); b = b.split(".").map(Number);
			for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
		if (versions.length) console.log(versions.sort(cmp).pop());'
}

# true if version $1 is newer than $2
version_gt() { [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$1" "$2" | latest_version)" = "$1" ]; }

# --- version ------------------------------------------------------------------

step "Checking the version"

version=$(sed -n 's/^[[:space:]]*\*[[:space:]]*Version:[[:space:]]*\([^[:space:]]*\).*/\1/p' "$MAIN_FILE" | head -1)
const_version=$(sed -n "s/.*define( *'HESH_VERSION', *'\([^']*\)'.*/\1/p" "$MAIN_FILE" | head -1)
stable_tag=$(sed -n 's/^Stable tag:[[:space:]]*\([^[:space:]]*\).*/\1/p' "$README_FILE" | head -1)
package_version=$(node -p 'require("./package.json").version')

# master carries a pre-release version (X.Y.Z-dev) between releases
if printf '%s' "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+-'; then
	step "Pre-release version $version, nothing to release"
	exit 0
fi
printf '%s' "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || die "Version '$version' in $MAIN_FILE is not X.Y.Z"
[ "$const_version" = "$version" ] || die "HESH_VERSION is '$const_version' but the plugin header says $version"
[ "$stable_tag" = "$version" ] || die "Stable tag in $README_FILE is '$stable_tag' but the plugin header says $version"
[ "$package_version" = "$version" ] || die "package.json version is '$package_version' but the plugin header says $version"
grep -qx "= $version =" "$README_FILE" || die "$README_FILE has no '= $version =' changelog entry"
info "Version $version (plugin header, HESH_VERSION, readme Stable tag and package.json agree)"

# release notes: the ChangeLog.md section, or the readme.txt one
notes=$(awk -v heading="## $version" '$0 == heading { found = 1; next } found && /^## / { exit } found' "$CHANGELOG_FILE" 2>/dev/null || true)
if [ -z "$(printf '%s' "$notes" | tr -d '[:space:]')" ]; then
	notes=$(awk -v heading="= $version =" '$0 == heading { found = 1; next } found && /^=/ { exit } found' "$README_FILE")
fi
notes=$(printf '%s\n' "$notes" | sed -e '/./,$!d' | sed -e ':a' -e '/^\n*$/{$d;N;ba' -e '}')
[ -n "$notes" ] || die "No changelog entry for $version"
[ -n "$title" ] || title="Version $version"

# --- repository state ---------------------------------------------------------

step "Checking the repository"

[ -z "$(git status --porcelain --untracked-files=no)" ] || die "You have uncommitted changes. Commit or stash them first."
git fetch --quiet --tags "$GIT_REMOTE" "$MAIN_BRANCH" "$RELEASE_BRANCH"
remote_main=$(git rev-parse "$GIT_REMOTE/$MAIN_BRANCH")
if [ -n "${GITHUB_ACTIONS:-}" ]; then
	git merge-base --is-ancestor HEAD "$remote_main" || die "HEAD is not on $GIT_REMOTE/$MAIN_BRANCH"
else
	[ "$(git rev-parse HEAD)" = "$remote_main" ] ||
		die "Check out $MAIN_BRANCH and make it match $GIT_REMOTE/$MAIN_BRANCH (git checkout $MAIN_BRANCH && git pull) before releasing"
fi
info "Releasing $(git rev-parse --short HEAD), the tip of $GIT_REMOTE/$MAIN_BRANCH"

# --- what is already released -------------------------------------------------

do_github=false
github_tag_exists=false
do_wordpress=false

if $want_github; then
	gh auth status >/dev/null 2>&1 || die "The GitHub CLI is not logged in. Run: gh auth login"
	github_repo=${GH_REPO:-$(git remote get-url "$GIT_REMOTE" | sed -E 's#^(git@|https://)github\.com[:/]##; s#\.git$##')}
	github_tags=$(git ls-remote --tags --refs "$GIT_REMOTE" 'refs/tags/v*' | sed -n 's#.*refs/tags/v##p')
	if gh release view "v$version" --repo "$github_repo" >/dev/null 2>&1; then
		info "GitHub: v$version is already released, skipping"
	elif printf '%s\n' "$github_tags" | grep -qx "$version"; then
		# an earlier run pushed the tag but didn't get to create the release
		do_github=true
		github_tag_exists=true
		info "GitHub: tag v$version exists without a release, will only create the release"
	else
		latest=$(printf '%s\n' "$github_tags" | latest_version)
		[ -z "$latest" ] || version_gt "$version" "$latest" || die "GitHub: $version is not newer than the latest release v$latest"
		do_github=true
		info "GitHub: will release v$version (latest is v${latest:-none})"
	fi
fi

if $want_wordpress; then
	wordpress_tags=$(svn ls --non-interactive "$SVN_URL/tags" 2>/dev/null) || die "Can't read $SVN_URL/tags"
	wordpress_tags=$(printf '%s\n' "$wordpress_tags" | tr -d '/')
	if printf '%s\n' "$wordpress_tags" | grep -qx "$version"; then
		info "WordPress.org: $version is already released, skipping"
	else
		latest=$(printf '%s\n' "$wordpress_tags" | latest_version)
		[ -z "$latest" ] || version_gt "$version" "$latest" || die "WordPress.org: $version is not newer than the latest release $latest"
		do_wordpress=true
		info "WordPress.org: will release $version (latest is ${latest:-none})"
	fi
fi

if ! $do_github && ! $do_wordpress; then
	step "Nothing to release: $version is already published"
	exit 0
fi

destinations=$( { $do_github && printf 'GitHub'; $do_github && $do_wordpress && printf ' and '; $do_wordpress && printf 'WordPress.org'; } || true)

# svn commit reads the password from stdin
if $do_wordpress && ! $dry_run; then
	svn_minor=$(svn --version --quiet | awk -F. '{ print $1 * 100 + $2 }')
	[ "$svn_minor" -ge 110 ] || die "Subversion 1.10 or later is required"
	if [ -z "${SVN_USERNAME:-}" ] || [ -z "${SVN_PASSWORD:-}" ]; then
		[ -z "${GITHUB_ACTIONS:-}" ] ||
			die "Add the SVN_USERNAME and SVN_PASSWORD repository secrets to release to WordPress.org"
		step "WordPress.org login"
		printf '    WordPress.org username: '
		read -r SVN_USERNAME || die "No username given"
		printf '    WordPress.org SVN password: '
		read -r -s SVN_PASSWORD || die "No password given"
		printf '\n'
		[ -n "$SVN_USERNAME" ] && [ -n "$SVN_PASSWORD" ] || die "The username and password can't be empty"
	fi
fi

# --- build --------------------------------------------------------------------

work=$(mktemp -d "${TMPDIR:-/tmp}/hesh-release.XXXXXX")
build="$work/build"
release_tree="$work/release"
svn_copy="$work/svn"

cleanup() {
	if [ -d "$release_tree" ]; then git worktree remove --force "$release_tree" >/dev/null 2>&1 || true; fi
	rm -rf "$work"
}
trap cleanup EXIT

step "Building $version"
if ! $skip_install; then
	npm ci --no-audit --no-fund --loglevel=error
fi
HESH_DIST="$build" npm run --silent package >/dev/null
[ -f "$build/$SLUG.php" ] || die "The build did not produce $SLUG.php (npm run package must honour HESH_DIST)"
! grep -q '!DEV!' "$build/$SLUG.php" "$build/readme.txt" || die "The build still has the !DEV! marker"
grep -Eq "^[[:space:]]*\*[[:space:]]*Version:[[:space:]]*$version\$" "$build/$SLUG.php" || die "The built plugin is not version $version"
info "Built into $build"
(cd "$build" && find . -type f ! -path './assets/*' | sed 's#^\./#    #' | sort)

# --- prepare GitHub -----------------------------------------------------------

if $do_github && ! $github_tag_exists; then
	step "GitHub: preparing the $RELEASE_BRANCH branch"
	git worktree add --quiet --detach "$release_tree" "$GIT_REMOTE/$RELEASE_BRANCH"
	rsync -a --delete --exclude '/.git' --exclude '/.gitignore' "$build/" "$release_tree/"
	git -C "$release_tree" add -A
	if git -C "$release_tree" diff --cached --quiet; then
		info "The $RELEASE_BRANCH branch already has this build"
	else
		git -C "$release_tree" commit --quiet -m "updating to v$version"
		git -C "$release_tree" --no-pager diff --stat HEAD~1 HEAD | sed 's/^/   /'
	fi
fi

if $do_github; then
	printf '%s\n' "$notes" > "$work/notes.md"
	info "Release \"$title\" (v$version) with these notes:"
	sed 's/^/      /' "$work/notes.md"
fi

# --- prepare WordPress.org ----------------------------------------------------

if $do_wordpress; then
	step "WordPress.org: preparing SVN"
	svn checkout --quiet --non-interactive --depth immediates "$SVN_URL" "$svn_copy"
	svn update --quiet --non-interactive --set-depth infinity "$svn_copy/trunk"
	rsync -a --delete --exclude '.svn' --exclude '/assets/' "$build/" "$svn_copy/trunk/"
	if $sync_assets && [ -d "$build/assets" ]; then
		svn update --quiet --non-interactive --set-depth infinity "$svn_copy/assets"
		rsync -a "$build/assets/" "$svn_copy/assets/"
	fi
	(
		cd "$svn_copy"
		svn status | while IFS= read -r line; do
			path=$(printf '%s' "$line" | cut -c9-)
			case "$line" in
				'?'*)
					svn add --quiet "$path"
					case "$path" in
						*.png) svn propset --quiet svn:mime-type image/png "$path" ;;
						*.jpg|*.jpeg) svn propset --quiet svn:mime-type image/jpeg "$path" ;;
						*.gif) svn propset --quiet svn:mime-type image/gif "$path" ;;
						*.svg) svn propset --quiet svn:mime-type image/svg+xml "$path" ;;
					esac
					;;
				'!'*) svn delete --quiet "$path" ;;
			esac
		done
		svn copy --quiet trunk "tags/$version"
		svn status | sed 's/^/    /'
	)
fi

# --- publish ------------------------------------------------------------------

if $dry_run; then
	step "Dry run: nothing was published"
	if $do_github; then
		if $github_tag_exists; then info "Would create the GitHub release for the existing tag v$version"
		else info "Would push the $RELEASE_BRANCH branch, tag v$version and create the GitHub release"; fi
	fi
	if $do_wordpress; then info "Would commit trunk and tags/$version to $SVN_URL"; fi
	exit 0
fi

if ! $assume_yes; then
	printf '\nPublish %s to %s? [y/N] ' "$version" "$destinations"
	read -r reply || reply=""
	case "$reply" in y|Y|yes|YES) ;; *) die "Cancelled, nothing was published" ;; esac
fi

if $do_github; then
	step "GitHub: publishing v$version"
	if ! $github_tag_exists; then
		git -C "$release_tree" tag "v$version"
		git -C "$release_tree" push --quiet "$GIT_REMOTE" "HEAD:refs/heads/$RELEASE_BRANCH" "refs/tags/v$version"
	fi
	gh release create "v$version" --repo "$github_repo" --verify-tag --title "$title" --notes-file "$work/notes.md" ||
		die "Creating the GitHub release failed. The tag v$version is pushed; fix the problem, then run: scripts/release.sh $target"
fi

if $do_wordpress; then
	step "WordPress.org: committing $version"
	if ! printf '%s' "$SVN_PASSWORD" | svn commit "$svn_copy" --quiet -m "Release $version" \
		--username "$SVN_USERNAME" --password-from-stdin --no-auth-cache --non-interactive; then
		$do_github && info "GitHub is already released. Fix the problem, then run: scripts/release.sh wordpress"
		die "The WordPress.org commit failed"
	fi
	svn ls --non-interactive "$SVN_URL/tags/$version" >/dev/null || die "tags/$version is missing on WordPress.org after the commit"
	info "Committed. WordPress.org usually shows the new version within a few minutes:"
	info "https://wordpress.org/plugins/$SLUG/"
fi

step "Released $version"
