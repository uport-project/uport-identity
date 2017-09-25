#!/usr/bin/env node

const dirTree = require('directory-tree')
const fs = require('fs')


function createArtifactIndex () {
  const tree = dirTree('./build/contracts/')
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
  console.log(latestBuilds)
  console.log(artifactIndex)
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
        outStream.write(`    ${artifact}: '${object[artifact]}')\n`)
      } else {
        outStream.write(`    ${artifact}: require('./${object[artifact]}')\n`)
      }
    }
    outStream.write(`  }${last?'':','}\n`)
  }
}

const index = createArtifactIndex()

writeArtifactIndex(index, 'artifact-index.js')
