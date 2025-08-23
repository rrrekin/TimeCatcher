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
  try {
    // Get changed files compared to main branch
    const result = execSync('git diff --name-only origin/main...HEAD', { encoding: 'utf-8' });
    return result
      .split('\n')
      .filter(file => file.trim())
      .filter(file => file.startsWith('src/'))
      .filter(file => file.endsWith('.ts') || file.endsWith('.vue'))
      .filter(file => !file.includes('.test.') && !file.includes('.spec.'));
  } catch (error) {
    console.log('Could not get changed files, checking all files');
    return [];
  }
}

function parseLcovFile() {
  const lcovPath = path.join(__dirname, '../coverage/lcov.info');
  
  if (!fs.existsSync(lcovPath)) {
    console.error('❌ Coverage report not found. Run tests with coverage first.');
    process.exit(1);
  }

  const lcovContent = fs.readFileSync(lcovPath, 'utf-8');
  const files = {};
  
  const sections = lcovContent.split('end_of_record');
  
  sections.forEach(section => {
    const lines = section.trim().split('\n');
    let currentFile = null;
    
    lines.forEach(line => {
      if (line.startsWith('SF:')) {
        currentFile = line.substring(3);
        // Convert absolute path to relative
        if (currentFile.includes('/TimeCatcher/')) {
          currentFile = currentFile.split('/TimeCatcher/')[1];
        }
        files[currentFile] = {
          lines: { hit: 0, found: 0 },
          branches: { hit: 0, found: 0 },
          functions: { hit: 0, found: 0 }
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
  });
  
  return files;
}

function calculateCoverage(hit, found) {
  return found === 0 ? 100 : Math.round((hit / found) * 100);
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
        lines: 0,
        branches: 0,
        functions: 0,
        passed: false,
        reason: 'No coverage data'
      });
      allPassed = false;
      return;
    }
    
    const linesCoverage = calculateCoverage(coverage.lines.hit, coverage.lines.found);
    const branchesCoverage = calculateCoverage(coverage.branches.hit, coverage.branches.found);
    const functionsCoverage = calculateCoverage(coverage.functions.hit, coverage.functions.found);
    
    const linesPassed = linesCoverage >= THRESHOLDS.lines;
    const branchesPassed = branchesCoverage >= THRESHOLDS.branches;
    const functionsPassed = functionsCoverage >= THRESHOLDS.functions;
    
    const filePassed = linesPassed && branchesPassed && functionsPassed;
    
    const status = filePassed ? '✅' : '❌';
    console.log(`${status} ${file}:`);
    console.log(`   Lines: ${linesCoverage}% (${linesPassed ? 'PASS' : 'FAIL'} - need ${THRESHOLDS.lines}%)`);
    console.log(`   Branches: ${branchesCoverage}% (${branchesPassed ? 'PASS' : 'FAIL'} - need ${THRESHOLDS.branches}%)`);
    console.log(`   Functions: ${functionsCoverage}% (${functionsPassed ? 'PASS' : 'FAIL'} - need ${THRESHOLDS.functions}%)`);
    console.log('');
    
    results.push({
      file,
      lines: linesCoverage,
      branches: branchesCoverage,
      functions: functionsCoverage,
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