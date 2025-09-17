#!/bin/bash
#
# Generate Changelog from Git Commits
#
# This script generates a structured changelog from git commits using
# Conventional Commits format. It categorizes commits by type and generates
# sections with emojis for better readability.
#
# FEATURES:
# - Parses conventional commit messages (type(scope): description)
# - Detects breaking changes via ! syntax and BREAKING CHANGE footer
# - Categorizes commits into sections with emoji indicators
# - Supports scoped commits with bold formatting
# - Configurable commit type inclusion (main types vs all types)
# - Debug mode for troubleshooting
# - Bash 3.x compatible (works on older macOS systems)
#
# USAGE:
#   ./generate-changelog.sh <git-range> [output-file]
#
# ARGUMENTS:
#   git-range    Git range to analyze (e.g., "v1.0.0..HEAD", "abc123..def456")
#   output-file  Output file path (default: CHANGELOG.md)
#
# ENVIRONMENT VARIABLES:
#   DEBUG=1      Enable debug output showing parsing details
#   INCLUDE_ALL=1 Include all commit types (default: only main types)
#
# EXAMPLES:
#   # Generate changelog from last tag to HEAD
#   ./generate-changelog.sh "v1.0.0..HEAD" CHANGELOG.md
#
#   # Generate changelog from repository start
#   ./generate-changelog.sh "$(git rev-list --max-parents=0 HEAD)..HEAD"
#
#   # Debug mode with all commit types
#   DEBUG=1 INCLUDE_ALL=1 ./generate-changelog.sh "v1.0.0..HEAD"
#
# CONVENTIONAL COMMIT FORMAT:
#   <type>[optional scope]: <description>
#
#   [optional body]
#
#   [optional footer(s)]
#
# SUPPORTED COMMIT TYPES:
#   feat     - New features (🚀 Features)
#   fix      - Bug fixes (🐛 Bug Fixes)
#   perf     - Performance improvements (⚡ Performance Improvements)
#   docs     - Documentation changes (📚 Documentation)
#   style    - Code style changes (🎨 Code Style)
#   refactor - Code refactoring (♻️ Refactoring)
#   test     - Testing changes (✅ Testing)
#   build    - Build system changes (🏗️ Build System)
#   ci       - CI/CD changes (⚙️ CI/CD)
#   chore    - Other changes (🔧 Other Changes)
#
# BREAKING CHANGES:
#   - Type with ! (e.g., "feat!: remove legacy API")
#   - Commit with "BREAKING CHANGE:" footer
#
# OUTPUT FORMAT:
#   # What's Changed
#
#   ## 💥 BREAKING CHANGES
#   - remove legacy API
#
#   ## 🚀 Features
#   - **scope**: description
#   - description without scope
#
#   ## 🐛 Bug Fixes
#   - fix description
#
# COMPATIBILITY:
#   - Requires bash 3.2+ (compatible with macOS default bash)
#   - Uses git commands available in git 1.8+
#   - No external dependencies beyond git and standard POSIX utilities

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly DEFAULT_OUTPUT="CHANGELOG.md"

# Commit type configuration (using functions for bash 3.x compatibility)
get_commit_type_title() {
    case "$1" in
        "feat") echo "🚀 Features" ;;
        "fix") echo "🐛 Bug Fixes" ;;
        "perf") echo "⚡ Performance Improvements" ;;
        "docs") echo "📚 Documentation" ;;
        "style") echo "🎨 Code Style" ;;
        "refactor") echo "♻️ Refactoring" ;;
        "test") echo "✅ Testing" ;;
        "build") echo "🏗️ Build System" ;;
        "ci") echo "⚙️ CI/CD" ;;
        "chore") echo "🔧 Other Changes" ;;
        *) echo "" ;;
    esac
}

# Check if commit type is valid
is_valid_commit_type() {
    case "$1" in
        "feat"|"fix"|"perf"|"docs"|"style"|"refactor"|"test"|"build"|"ci"|"chore") return 0 ;;
        *) return 1 ;;
    esac
}

# Main commit types (always included)
readonly MAIN_TYPES=("feat" "fix" "perf" "docs")

# Enhanced regex patterns
readonly CONVENTIONAL_COMMIT_PATTERN='^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\([^)]*\))?(!)?:[[:space:]]*(.*)'
readonly BREAKING_EXCLAMATION_PATTERN='^[a-z]+(\([^)]*\))?!:[[:space:]]'
readonly BREAKING_FOOTER_PATTERN='BREAKING[[:space:]]CHANGE:[[:space:]]'

# Global variables
RANGE=""
OUTPUT_FILE=""
DEBUG=${DEBUG:-0}
INCLUDE_ALL=${INCLUDE_ALL:-0}

# Logging functions
log_debug() {
    [[ $DEBUG -eq 1 ]] && echo "DEBUG: $*" >&2
}

log_error() {
    echo "ERROR: $*" >&2
}

log_info() {
    echo "INFO: $*" >&2
}

# Usage information
usage() {
    cat << EOF
Usage: $0 <git-range> [output-file]

Generate a structured changelog from git commits using Conventional Commits format.

Arguments:
  git-range    Git range to analyze (e.g., "v1.0.0..HEAD")
  output-file  Output file path (default: CHANGELOG.md)

Environment Variables:
  DEBUG=1      Enable debug output
  INCLUDE_ALL=1 Include all commit types (default: only main types)

Examples:
  $0 "v1.0.0..HEAD"
  $0 "v1.0.0..HEAD" RELEASE.md
  DEBUG=1 $0 "\$(git rev-list --max-parents=0 HEAD)..HEAD"

Supported commit types:
EOF
    echo "  feat: 🚀 Features"
    echo "  fix: 🐛 Bug Fixes"
    echo "  perf: ⚡ Performance Improvements"
    echo "  docs: 📚 Documentation"
    echo "  style: 🎨 Code Style"
    echo "  refactor: ♻️ Refactoring"
    echo "  test: ✅ Testing"
    echo "  build: 🏗️ Build System"
    echo "  ci: ⚙️ CI/CD"
    echo "  chore: 🔧 Other Changes"
}

# Parse conventional commit message
parse_conventional_commit() {
    local commit_msg="$1"
    local type="" scope="" breaking="" description=""

    if [[ $commit_msg =~ $CONVENTIONAL_COMMIT_PATTERN ]]; then
        type="${BASH_REMATCH[1]}"
        scope="${BASH_REMATCH[2]#(}"  # Remove opening paren
        scope="${scope%)*}"           # Remove closing paren
        breaking="${BASH_REMATCH[3]}"
        description="${BASH_REMATCH[4]}"

        log_debug "Parsed commit: type='$type', scope='$scope', breaking='$breaking', desc='$description'"

        echo "$type|$scope|$breaking|$description"
        return 0
    fi

    log_debug "Failed to parse conventional commit: $commit_msg"
    return 1
}

# Clean and format commit message for changelog
clean_commit_message() {
    local commit_msg="$1"
    local parsed

    if parsed=$(parse_conventional_commit "$commit_msg"); then
        IFS='|' read -r type scope breaking description <<< "$parsed"

        # Format the cleaned message
        if [[ -n $scope ]]; then
            echo "- **$scope**: $description"
        else
            echo "- $description"
        fi
    else
        # Fallback for non-conventional commits
        if [[ "$commit_msg" == *": "* ]]; then
            echo "- ${commit_msg#*: }"
        else
            echo "- $commit_msg"
        fi
    fi
}

# Detect breaking changes using multiple patterns
detect_breaking_changes() {
    local range="$1"
    local breaking_commits=()

    log_debug "Detecting breaking changes in range: $range"

    # Method 1: Exclamation mark syntax (feat!:, fix(scope)!:)
    while IFS= read -r commit; do
        if [[ $commit =~ $BREAKING_EXCLAMATION_PATTERN ]]; then
            breaking_commits+=("$commit")
            log_debug "Found breaking change (exclamation): $commit"
        fi
    done < <(git log --no-merges --pretty=format:'%s' "$range" 2>/dev/null || true)

    # Method 2: BREAKING CHANGE footer
    while IFS= read -r commit; do
        if [[ $commit =~ $BREAKING_FOOTER_PATTERN ]]; then
            breaking_commits+=("$commit")
            log_debug "Found breaking change (footer): $commit"
        fi
    done < <(git log --no-merges --grep="BREAKING CHANGE" --pretty=format:'%s' "$range" 2>/dev/null || true)

    # Remove duplicates and return
    printf '%s\n' "${breaking_commits[@]}" | sort -u
}

# Get commits by type with improved filtering
get_commits_by_type() {
    local type="$1"
    local range="$2"

    log_debug "Getting commits of type '$type' in range: $range"

    git log --no-merges \
        --grep="^$type" \
        --pretty=format:'%s' \
        "$range" 2>/dev/null || true
}

# Generate a changelog section
generate_changelog_section() {
    local type="$1"
    local title="$2"
    local commits="$3"
    local output_file="$4"

    if [[ -z "$commits" ]]; then
        log_debug "No commits found for type: $type"
        return 1
    fi

    log_debug "Generating section for $type with title: $title"

    echo "## $title" >> "$output_file"
    echo >> "$output_file"

    while IFS= read -r commit; do
        if [[ -n "$commit" ]]; then
            clean_commit_message "$commit" >> "$output_file"
        fi
    done <<< "$commits"

    echo >> "$output_file"
    return 0
}

# Main changelog generation function
generate_changelog() {
    local range="$1"
    local output_file="$2"

    log_info "Generating changelog for range: $range"
    log_info "Output file: $output_file"

    # Initialize changelog with header
    echo "# What's Changed" > "$output_file"
    echo >> "$output_file"

    # Generate breaking changes section first (highest priority)
    local breaking_changes
    breaking_changes=$(detect_breaking_changes "$range")

    if [[ -n "$breaking_changes" ]]; then
        log_info "Found breaking changes, adding section"
        generate_changelog_section "breaking" "💥 BREAKING CHANGES" "$breaking_changes" "$output_file"
    fi

    # Determine which commit types to include
    local types_to_process=()
    if [[ $INCLUDE_ALL -eq 1 ]]; then
        types_to_process=("feat" "fix" "perf" "docs" "style" "refactor" "test" "build" "ci" "chore")
    else
        types_to_process=("${MAIN_TYPES[@]}")
    fi

    # Generate sections for each commit type
    local sections_added=0
    for type in "${types_to_process[@]}"; do
        if is_valid_commit_type "$type"; then
            local commits
            local title
            commits=$(get_commits_by_type "$type" "$range")
            title=$(get_commit_type_title "$type")

            if generate_changelog_section "$type" "$title" "$commits" "$output_file"; then
                ((sections_added++))
                log_debug "Added section for: $type"
            fi
        fi
    done

    # Add fallback if no sections were generated
    if [[ $sections_added -eq 0 ]] && [[ -z "$breaking_changes" ]]; then
        log_info "No categorized commits found, adding fallback section"
        echo "## 🔧 Changes" >> "$output_file"
        echo >> "$output_file"
        echo "- Various improvements and fixes" >> "$output_file"
        echo >> "$output_file"
    fi

    log_info "Changelog generation completed. Sections added: $sections_added"
}

# Validate git range
validate_git_range() {
    local range="$1"

    if ! git rev-list --quiet "$range" 2>/dev/null; then
        log_error "Invalid git range: $range"
        return 1
    fi

    local commit_count
    commit_count=$(git rev-list --count "$range" 2>/dev/null || echo "0")
    log_debug "Found $commit_count commits in range: $range"

    if [[ $commit_count -eq 0 ]]; then
        log_error "No commits found in range: $range"
        return 1
    fi

    return 0
}

# Main function
main() {
    # Parse arguments
    if [[ $# -lt 1 ]] || [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
        usage
        exit 0
    fi

    RANGE="$1"
    OUTPUT_FILE="${2:-$DEFAULT_OUTPUT}"

    # Validate inputs
    if [[ -z "$RANGE" ]]; then
        log_error "Git range is required"
        usage
        exit 1
    fi

    if ! validate_git_range "$RANGE"; then
        exit 1
    fi

    # Generate changelog
    if generate_changelog "$RANGE" "$OUTPUT_FILE"; then
        log_info "Changelog written to: $OUTPUT_FILE"

        if [[ $DEBUG -eq 1 ]]; then
            log_debug "Generated changelog content:"
            cat "$OUTPUT_FILE" >&2
        fi

        exit 0
    else
        log_error "Failed to generate changelog"
        exit 1
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi