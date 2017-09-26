#!/usr/bin/env node

const assert = require('assert')
const dirTree = require('directory-tree')
const fs = require('fs')

const CONTRACT_DIR = './build/contracts/'
const VERSIONS_DIR = CONTRACT_DIR + 'versions/'

function createArtifactIndex () {
  const tree = dirTree(CONTRACT_DIR)
  let artifactIndex = { legacy: {} }
  let latestBuilds = {}

  for (const child of tree.children) {
    if (child.type === 'file') {
      const name = child.name.slice(0, -5)
      latestBuilds[name] = child.path
      // check if new deployment
    } else if (child.type === 'directory') {
      if (child.name === 'legacy') {
        addLegacy(child)
      } else if (child.name === 'versions') {
        addVersions(child)
      }
    }
  }
  artifactIndex = checkAndUpdateNewVersions(artifactIndex, latestBuilds)
  return artifactIndex

  function addLegacy (folder) {
    for (const child of folder.children) {
      if (child.type === 'file') {
        const name = child.name.slice(0, -5)
        artifactIndex.legacy[name] = child.path
      }
    }
  }

  function addVersions (folder) {
    for (const child of folder.children) {
      if (child.type === 'directory') {
        addVersion(child)
      }
    }
  }

  function addVersion (folder) {
    const version = folder.name
    for (const child of folder.children) {
      const name = child.name.slice(0, -5)
      if (version === 'v1') {
        artifactIndex[name] = {}
      }
      artifactIndex[name].latestVersion = version
      artifactIndex[name][version] = child.path
    }
  }
}

function checkAndUpdateNewVersions (artifactIndex, latestBuilds) {
  for (const build in latestBuilds) {
    // ignore builds of artifacts we are not versioning
    if (artifactIndex[build]) {
      if (!isLatestVersion(build)) {
        addNewVersion(build)
      }
    }
  }
  return artifactIndex

  function addNewVersion (build) {
    const newVersion = nextVersion(artifactIndex[build].latestVersion)
    // create version dir if not present
    const versionPath = VERSIONS_DIR + newVersion
    if (!fs.existsSync(versionPath)) {
      fs.mkdirSync(versionPath, '755')
    }
    // make a copy of the file to the correct version dir
    const newArtifactPath = versionPath + `/${build}.json`
    fs.copyFileSync('./' + latestBuilds[build], newArtifactPath)
    // update artifactIndex
    artifactIndex[build][newVersion] = newArtifactPath.slice(2)
    artifactIndex[build].latestVersion = newVersion
  }

  function isLatestVersion (build) {
    const buildArtifact = require('../' + latestBuilds[build])
    const version = artifactIndex[build].latestVersion
    const lvArtifact = require('../' + artifactIndex[build][version])

    if (!isEqual(buildArtifact.abi, lvArtifact.abi)) return false

    for (network in buildArtifact.networks) {
      if (!lvArtifact.networks[network]) return false

      if (buildArtifact.networks[network].address !== lvArtifact.networks[network].address) return false
    }
    return true
  }

  function isEqual (a, b) {
    try {
      assert.deepEqual(a,b)
    } catch (e) {
      return false
    }
    return true
  }

  function nextVersion(v) {
    v = parseInt(v.slice(1))
    return 'v' + ++v
  }
}

function writeArtifactIndex(index, filename) {
  let outStream = fs.createWriteStream(__dirname + '/../' + filename)

  outStream.write('module.exports = {\n')
  let numParts = Object.keys(index).length
  for (const part in index) {
    writePart(part, index[part], !--numParts)
  }
  outStream.write('}')

  function writePart(name, object, last = false) {
    outStream.write(`  ${name}: {\n`)
    for (const artifact in object) {
      if (artifact === 'latestVersion') {
        outStream.write(`    ${artifact}: '${object[artifact]}',\n`)
      } else {
        outStream.write(`    ${artifact}: require('./${object[artifact]}'),\n`)
      }
    }
    outStream.write(`  }${last?'':','}\n`)
  }
}

const index = createArtifactIndex()

writeArtifactIndex(index, 'artifact-index.js')
