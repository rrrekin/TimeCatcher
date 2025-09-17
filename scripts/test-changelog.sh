#!/bin/bash
#
# Simple Test for generate-changelog.sh
#
# This script performs basic validation of the changelog generation script
# with conventional commit formats.
#
# Usage:
#   ./test-changelog.sh [--verbose]
#

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly CHANGELOG_SCRIPT="$SCRIPT_DIR/generate-changelog.sh"
readonly TEST_REPO_DIR="$SCRIPT_DIR/test-repo"
readonly TEST_OUTPUT_DIR="$SCRIPT_DIR/test-output"

VERBOSE=0
TESTS_PASSED=0
TESTS_FAILED=0

# Parse arguments
if [[ $# -gt 0 ]] && [[ "$1" == "--verbose" || "$1" == "-v" ]]; then
    VERBOSE=1
fi

log_info() {
    echo "INFO: $*"
}

log_success() {
    echo "✓ $*"
}

log_error() {
    echo "✗ $*"
}

log_verbose() {
    [[ $VERBOSE -eq 1 ]] && echo "DEBUG: $*"
}

# Setup test repository
setup_test_repo() {
    log_info "Setting up test repository..."

    rm -rf "$TEST_REPO_DIR" "$TEST_OUTPUT_DIR"
    mkdir -p "$TEST_OUTPUT_DIR"

    git init "$TEST_REPO_DIR"
    cd "$TEST_REPO_DIR"

    git config user.name "Test User"
    git config user.email "test@example.com"

    # Create initial commit
    echo "Initial commit" > README.md
    git add README.md
    git commit -m "Initial commit"

    # Add test commits
    echo "Feature 1" > feature1.txt
    git add feature1.txt
    git commit -m "feat: add user authentication"

    echo "Fix 1" > fix1.txt
    git add fix1.txt
    git commit -m "fix: resolve memory leak"

    echo "Breaking change" > breaking.txt
    git add breaking.txt
    git commit -m "feat!: redesign API structure"

    echo "Docs" > docs.txt
    git add docs.txt
    git commit -m "docs: update API documentation"

    log_verbose "Created test repository with conventional commits"
}

# Test basic functionality
test_basic_functionality() {
    log_info "Testing basic changelog generation..."

    cd "$TEST_REPO_DIR"

    local initial_commit=$(git rev-list --max-parents=0 HEAD)
    local range="${initial_commit}..HEAD"
    local output_file="$TEST_OUTPUT_DIR/basic_test.md"

    if "$CHANGELOG_SCRIPT" "$range" "$output_file" > /dev/null 2>&1; then
        if [[ -f "$output_file" ]] && [[ -s "$output_file" ]]; then
            log_success "Basic changelog generation"
            ((TESTS_PASSED++))
            [[ $VERBOSE -eq 1 ]] && cat "$output_file"
        else
            log_error "Basic changelog generation - output file empty or missing"
            ((TESTS_FAILED++))
        fi
    else
        log_error "Basic changelog generation - script failed"
        ((TESTS_FAILED++))
    fi
}

# Test breaking changes detection
test_breaking_changes() {
    log_info "Testing breaking changes detection..."

    cd "$TEST_REPO_DIR"

    local initial_commit=$(git rev-list --max-parents=0 HEAD)
    local range="${initial_commit}..HEAD"
    local output_file="$TEST_OUTPUT_DIR/breaking_test.md"

    if "$CHANGELOG_SCRIPT" "$range" "$output_file" > /dev/null 2>&1; then
        if grep -q "💥 BREAKING CHANGES" "$output_file"; then
            log_success "Breaking changes detection"
            ((TESTS_PASSED++))
        else
            log_error "Breaking changes detection - no breaking changes section found"
            ((TESTS_FAILED++))
        fi
    else
        log_error "Breaking changes detection - script failed"
        ((TESTS_FAILED++))
    fi
}

# Test section generation
test_sections() {
    log_info "Testing section generation..."

    cd "$TEST_REPO_DIR"

    local initial_commit=$(git rev-list --max-parents=0 HEAD)
    local range="${initial_commit}..HEAD"
    local output_file="$TEST_OUTPUT_DIR/sections_test.md"

    if "$CHANGELOG_SCRIPT" "$range" "$output_file" > /dev/null 2>&1; then
        local sections_found=0

        if grep -q "🚀 Features" "$output_file"; then
            ((sections_found++))
        fi

        if grep -q "🐛 Bug Fixes" "$output_file"; then
            ((sections_found++))
        fi

        if grep -q "📚 Documentation" "$output_file"; then
            ((sections_found++))
        fi

        if [[ $sections_found -ge 3 ]]; then
            log_success "Section generation - found $sections_found sections"
            ((TESTS_PASSED++))
        else
            log_error "Section generation - only found $sections_found sections"
            ((TESTS_FAILED++))
        fi
    else
        log_error "Section generation - script failed"
        ((TESTS_FAILED++))
    fi
}

# Test debug mode
test_debug_mode() {
    log_info "Testing debug mode..."

    cd "$TEST_REPO_DIR"

    local initial_commit=$(git rev-list --max-parents=0 HEAD)
    local range="${initial_commit}..HEAD"
    local output_file="$TEST_OUTPUT_DIR/debug_test.md"

    local debug_output
    if debug_output=$(DEBUG=1 "$CHANGELOG_SCRIPT" "$range" "$output_file" 2>&1); then
        if echo "$debug_output" | grep -q "DEBUG:"; then
            log_success "Debug mode"
            ((TESTS_PASSED++))
            log_verbose "Debug output captured successfully"
        else
            log_error "Debug mode - no debug output found"
            ((TESTS_FAILED++))
        fi
    else
        log_error "Debug mode - script failed"
        ((TESTS_FAILED++))
    fi
}

# Cleanup
cleanup() {
    log_info "Cleaning up..."
    rm -rf "$TEST_REPO_DIR"
    if [[ $VERBOSE -eq 0 ]]; then
        rm -rf "$TEST_OUTPUT_DIR"
    else
        log_info "Test output preserved in: $TEST_OUTPUT_DIR"
    fi
}

# Print summary
print_summary() {
    echo
    echo "=========================================="
    echo "              TEST SUMMARY"
    echo "=========================================="
    echo "Tests passed: $TESTS_PASSED"
    echo "Tests failed: $TESTS_FAILED"
    echo

    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo "🎉 All tests passed!"
        return 0
    else
        echo "❌ Some tests failed."
        return 1
    fi
}

# Main execution
main() {
    echo "Starting changelog generation tests..."
    echo

    if [[ ! -f "$CHANGELOG_SCRIPT" ]]; then
        log_error "Changelog script not found: $CHANGELOG_SCRIPT"
        exit 1
    fi

    chmod +x "$CHANGELOG_SCRIPT"

    setup_test_repo
    test_basic_functionality
    test_breaking_changes
    test_sections
    test_debug_mode
    cleanup
    print_summary
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi