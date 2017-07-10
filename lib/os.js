/**
 * author       : Sunil Wang
 * createTime   : 2017/7/10 10:36
 * description  :
 */
var bucket = require('./bucket')
var cp = require('child_process')
var fs = require('fs')
var os = require('os')

var originalOperatingSystem = {
  checkLastResort: function () {
    return new Promise(function (resolve) {
      cp.exec('uname -sr', { shell: true }, function (err, out) {
        if (err && !out) {
          return resolve(bucket.options.NOT_SUPPORTED_VALUE)
        }
        return resolve(out)
      })
    })
  },
  darwin: function () {
    var self = this

    return new Promise(function (resolve) {
      cp.exec('sw_vers', { shell: true }, function (err, out) {
        if (err && !out) {
          return self.checkLastResort().then(resolve)
        }

        var version = out.match(/[\n\r].*ProductVersion:\s*([^\n\r]*)/)[1]
        var distribution = out.match(/.*ProductName:\s*([^\n\r]*)/)[1]
        var resultOs = distribution + ' ' + version

        return resolve(resultOs)
      })
    })
  },
  linux: function () {
    var self = this

    // Debian, Ubuntu, CentOS
    return new Promise(function (resolve) {
      fs.readFile('/etc/issue', function (err, out) {
        if (err) {
          return self.checkLastResort(resolve)
        }
        out = out.toString()
        var version = out.match(/[\d]+(\.[\d][\d]?)?/)

        if (version !== null) {
          version = version[0]
        }
        var distribution = out.match(/[\w]*/)[0]

        if (version !== null && distribution !== null) {
          var resultOs = distribution + ' ' + version
          return resolve(resultOs)
        } else if (distribution !== null && distribution !== '') {
          return resolve(distribution)
        } else if (version === null) {
          fs.readFile('/etc/redhat-release', function (err, out) {
            if (err) {
              return self.checkLastResort(resolve)
            }

            out = out.toString()
            version = out.match(/[\d]+(\.[\d][\d]?)?/)

            if (version !== null) {
              version = version[0]
            }

            var resultOs = 'Red Hat ' + version
            return resolve(resultOs)
          })
        }
      })
    })
  }
}

bucket.os = {
  oos: function () {
    var platform = os.platform()

    if (platform === 'linux') {
      return originalOperatingSystem.linux()
    }

    if (platform === 'darwin') {
      return originalOperatingSystem.darwin()
    }

    return originalOperatingSystem.checkLastResort()
  },
  platform: function () {
    return os.platform()
  },
  uptime: function () {
    // seconds
    return os.uptime()
  },
  ip: function () {
    var interfaces = os.networkInterfaces()
    var ip = ''

    for (var i in interfaces) {
      var item = interfaces[i]
      for (var j in item) {
        if (item[j]['internal'] === false && item[j]['family'] === 'IPv4') {
          ip = item[j]['address']
          break
        }
      }
    }

    return ip
  },
  hostname: function () {
    return os.hostname()
  },
  type: function () {
    return os.type()
  },
  arch: function () {
    return os.arch()
  }
}