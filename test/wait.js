module.exports = function (seconds) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, seconds * 1000)
  })
}
