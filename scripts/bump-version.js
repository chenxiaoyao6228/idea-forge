const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/*
    patch: minor version, 0.0.1 -> 0.0.2
    minor: major version, 0.0.1 -> 0.1.0
    major: major version, 0.0.1 -> 1.0.0
*/
const SEMVER_TYPES = ['major', 'minor', 'patch'];


function bumpVersion() {
    // read version type from command line
    const type = process.argv[2];
    
    if (!SEMVER_TYPES.includes(type)) {
      console.error('Please specify version type: major, minor, or patch');
      process.exit(1);
    }
  
    try {
      // read current package.json
      const packagePath = path.resolve(process.cwd(), 'package.json');
      const pkg = require(packagePath);
      const currentVersion = pkg.version;
  
      // update version first
      execSync(`npm version ${type} --no-git-tag-version`);
      
      // read the new version immediately after updating
      const updatedPkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const newVersion = updatedPkg.version;
  
      // generate changelog
      execSync('conventional-changelog -p angular -i CHANGELOG.md -s');
  
      // git operations with the correct new version
      execSync('git add package.json pnpm-lock.yaml CHANGELOG.md');
      execSync(`git commit -m "chore(release): v${newVersion}"`);
      execSync(`git tag -a v${newVersion} -m "v${newVersion}"`);
  
      console.log(`✨ Successfully bumped version from ${currentVersion} to ${newVersion}`);
      console.log('📝 Updated CHANGELOG.md');
      console.log(`🏷️  Created tag v${newVersion}`);
      console.log('\nNext steps:');
      console.log('  git push origin master');
      console.log(`  git push origin v${newVersion}`);
  
    } catch (error) {
      console.error('Error during version bump:', error.message);
      process.exit(1);
    }
  }
  
bumpVersion();