#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const THRESHOLDS = {
  lines: 80,
  branches: 85,
  functions: 75,
  statements: 80
};

function getChangedFiles() {
  // Determine the base branch (prefer GitHub PR base, fall back to origin/main)
  const baseBranch = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main';
  
  function filterSourceFiles(files) {
    return files
      .split('\n')
      .filter(file => file.trim())
      .filter(file => file.startsWith('src/'))
      .filter(file => file.endsWith('.ts') || file.endsWith('.vue'))
      .filter(file => !file.includes('.test.') && !file.includes('.spec.'))
      .filter(file => !file.endsWith('.d.ts')) // Exclude TypeScript declaration files
      .filter(file => !file.startsWith('src/main/')); // Exclude main process files (not covered by frontend tests)
  }
  
  function tryGitDiff(base) {
    try {
      console.log(`Attempting to get changed files compared to ${base}...`);
      const result = execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf-8', stdio: 'pipe' });
      return filterSourceFiles(result);
    } catch (error) {
      console.log(`Git diff failed: ${error.message}`);
      return null;
    }
  }
  
  // First attempt: try git diff with the determined base branch
  let changedFiles = tryGitDiff(baseBranch);
  if (changedFiles !== null) {
    console.log(`Found ${changedFiles.length} changed source files`);
    return changedFiles;
  }
  
  // Second attempt: fetch refs and try again
  try {
    console.log('Fetching remote refs to ensure base branch is available...');
    execSync('git fetch --no-tags origin +refs/heads/*:refs/remotes/origin/*', { stdio: 'pipe' });
    changedFiles = tryGitDiff(baseBranch);
    if (changedFiles !== null) {
      console.log(`Found ${changedFiles.length} changed source files after fetch`);
      return changedFiles;
    }
  } catch (fetchError) {
    console.log(`Git fetch failed: ${fetchError.message}`);
  }
  
  // Final fallback: return all tracked source files
  try {
    console.log('Git diff unavailable, falling back to checking all tracked source files...');
    const allFiles = execSync('git ls-files', { encoding: 'utf-8', stdio: 'pipe' });
    const sourceFiles = filterSourceFiles(allFiles);
    console.log(`Fallback: checking all ${sourceFiles.length} tracked source files`);
    return sourceFiles;
  } catch (error) {
    console.error(`❌ FATAL: Failed to enumerate source files for coverage check`);
    console.error(`Git ls-files failed: ${error.message}`);
    console.error('Cannot proceed with coverage validation without file list');
    process.exit(1);
  }
}

function parseLcovFile() {
  const lcovPath = path.join(__dirname, '../coverage/lcov.info');
  
  if (!fs.existsSync(lcovPath)) {
    console.error('❌ Coverage report not found. Run tests with coverage first.');
    process.exit(1);
  }

  // Get repository root dynamically
  let repoRoot;
  try {
    repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch (error) {
    console.error(`Failed to get repository root: ${error.message}`);
    process.exit(1);
  }

  function normalizeFilePath(absolutePath) {
    // Convert absolute path to relative from repo root
    const relativePath = path.relative(repoRoot, absolutePath);
    // Normalize path separators to forward slashes for consistency
    return relativePath.replace(/\\/g, '/');
  }

  const lcovContent = fs.readFileSync(lcovPath, 'utf-8');
  const files = {};
  
  const sections = lcovContent.split('end_of_record');
  
  sections.forEach(section => {
    const lines = section.trim().split('\n');
    let currentFile = null;
    
    lines.forEach(rawLine => {
      // Trim line to handle CRLF and other whitespace
      const line = rawLine.trim();
      
      if (line.startsWith('SF:')) {
        const absolutePath = line.substring(3);
        currentFile = normalizeFilePath(absolutePath);
        files[currentFile] = {
          lines: { hit: 0, found: 0 },
          branches: { hit: 0, found: 0 },
          functions: { hit: 0, found: 0 },
          statements: { hit: 0, found: 0 }
        };
      } else if (currentFile && line.startsWith('LH:')) {
        files[currentFile].lines.hit = parseInt(line.substring(3));
      } else if (currentFile && line.startsWith('LF:')) {
        files[currentFile].lines.found = parseInt(line.substring(3));
      } else if (currentFile && line.startsWith('BRH:')) {
        files[currentFile].branches.hit = parseInt(line.substring(4));
      } else if (currentFile && line.startsWith('BRF:')) {
        files[currentFile].branches.found = parseInt(line.substring(4));
      } else if (currentFile && line.startsWith('FNH:')) {
        files[currentFile].functions.hit = parseInt(line.substring(4));
      } else if (currentFile && line.startsWith('FNF:')) {
        files[currentFile].functions.found = parseInt(line.substring(4));
      }
    });
    
    // In V8 coverage, statements coverage is the same as lines coverage
    if (currentFile && files[currentFile]) {
      files[currentFile].statements.hit = files[currentFile].lines.hit;
      files[currentFile].statements.found = files[currentFile].lines.found;
    }
  });
  
  return files;
}

function calculateCoverage(hit, found) {
  return found === 0 ? null : Math.round((hit / found) * 100);
}

function formatCoverage(coverage) {
  return coverage !== null ? `${coverage}%` : 'N/A';
}

function formatCoverageWithStatus(coverage, threshold, passed, found = null) {
  const formattedCoverage = formatCoverage(coverage);
  const status = passed ? 'PASS' : 'FAIL';
  
  let reason;
  if (coverage === null && found === 0) {
    reason = 'no items to measure';
  } else if (coverage === null) {
    reason = 'no metrics available';
  } else {
    reason = `need ${threshold}%`;
  }
  
  return `${formattedCoverage} (${status} - ${reason})`;
}

function checkCoverage() {
  const changedFiles = getChangedFiles();
  const coverageData = parseLcovFile();
  
  console.log('\n📊 Coverage Check for Changed Files\n');
  
  if (changedFiles.length === 0) {
    console.log('ℹ️  No changed source files detected or not in a PR context.');
    console.log('✅ Coverage check passed (no files to check).\n');
    return;
  }
  
  console.log(`🔍 Checking coverage for ${changedFiles.length} changed file(s):\n`);
  
  let allPassed = true;
  const results = [];
  
  changedFiles.forEach(file => {
    const coverage = coverageData[file];
    
    if (!coverage) {
      console.log(`⚠️  ${file}: No coverage data found (possibly not covered by tests)`);
      results.push({
        file,
        lines: null,
        branches: null,
        functions: null,
        statements: null,
        passed: false,
        reason: 'No coverage data'
      });
      allPassed = false;
      return;
    }
    
    const linesCoverage = calculateCoverage(coverage.lines.hit, coverage.lines.found);
    const branchesCoverage = calculateCoverage(coverage.branches.hit, coverage.branches.found);
    const functionsCoverage = calculateCoverage(coverage.functions.hit, coverage.functions.found);
    const statementsCoverage = calculateCoverage(coverage.statements.hit, coverage.statements.found);
    
    // Lines and statements are always required if they exist
    const linesPassed = linesCoverage !== null && linesCoverage >= THRESHOLDS.lines;
    const statementsPassed = statementsCoverage !== null && statementsCoverage >= THRESHOLDS.statements;
    
    // Branches and functions are only required if they exist (found > 0)
    // If no branches/functions exist, treat as N/A and passing
    const branchesPassed = coverage.branches.found === 0 || (branchesCoverage !== null && branchesCoverage >= THRESHOLDS.branches);
    const functionsPassed = coverage.functions.found === 0 || (functionsCoverage !== null && functionsCoverage >= THRESHOLDS.functions);
    
    // Build list of required checks (only include metrics that have items to measure)
    const requiredChecks = [];
    if (coverage.lines.found > 0) requiredChecks.push(linesPassed);
    if (coverage.statements.found > 0) requiredChecks.push(statementsPassed);
    if (coverage.branches.found > 0) requiredChecks.push(branchesPassed);
    if (coverage.functions.found > 0) requiredChecks.push(functionsPassed);
    
    // File passes if all required checks pass (or no checks are required)
    const filePassed = requiredChecks.length === 0 || requiredChecks.every(check => check);
    
    const status = filePassed ? '✅' : '❌';
    console.log(`${status} ${file}:`);
    console.log(`   Lines: ${formatCoverageWithStatus(linesCoverage, THRESHOLDS.lines, linesPassed, coverage.lines.found)}`);
    console.log(`   Branches: ${formatCoverageWithStatus(branchesCoverage, THRESHOLDS.branches, branchesPassed, coverage.branches.found)}`);
    console.log(`   Functions: ${formatCoverageWithStatus(functionsCoverage, THRESHOLDS.functions, functionsPassed, coverage.functions.found)}`);
    console.log(`   Statements: ${formatCoverageWithStatus(statementsCoverage, THRESHOLDS.statements, statementsPassed, coverage.statements.found)}`);
    console.log('');
    
    results.push({
      file,
      lines: linesCoverage,
      branches: branchesCoverage,
      functions: functionsCoverage,
      statements: statementsCoverage,
      passed: filePassed
    });
    
    if (!filePassed) {
      allPassed = false;
    }
  });
  
  console.log('📋 Summary:');
  console.log(`   Files checked: ${changedFiles.length}`);
  console.log(`   Files passed: ${results.filter(r => r.passed).length}`);
  console.log(`   Files failed: ${results.filter(r => !r.passed).length}`);
  
  if (allPassed) {
    console.log('\n🎉 All changed files meet the coverage requirements!');
  } else {
    console.log('\n💥 Some changed files do not meet the coverage requirements.');
    console.log('   Please add tests to improve coverage before merging.');
    process.exit(1);
  }
}

checkCoverage();