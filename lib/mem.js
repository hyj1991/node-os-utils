/**
 * author       : Sunil Wang
 * createTime   : 2017/7/9 21:49
 * description  :
 */
var bucket = require('./bucket')
var cp = require('child_process')
var os = require('os')

var darwinMem = {
  PAGE_SIZE: 4096,
  physicalMemory: function () {
    var res = cp.execSync('sysctl hw.memsize').toString()
    res = res.trim().split(' ')[1]
    return parseInt(res)
  },
  vmStats: function () {
    var mappings = {
      'Anonymous pages': 'app',
      'Pages wired down': 'wired',
      'Pages active': 'active',
      'Pages inactive': 'inactive',
      'Pages occupied by compressor': 'compressed'
    }

    var ret = {}
    var res = cp.execSync('vm_stat').toString()
    var lines = res.split('\n')
    lines = lines.filter(x => x !== '')

    lines.forEach(x => {
      var parts = x.split(':')
      var key = parts[0]
      var val = parts[1].replace('.', '').trim()
      if (mappings[key]) {
        var k = mappings[key]
        ret[k] = val * darwinMem.PAGE_SIZE
      }
    })
    return ret
  },
  memory: function () {
    var total = darwinMem.physicalMemory()
    var stats = darwinMem.vmStats()
    // This appears to be contested
    // not clear what apple is using for "Memory Used" in app
    var used = (stats.wired + stats.active + stats.inactive)
    return { used: used, total: total }
  }
}

bucket.mem = {
  info: function () {
    return new Promise(function (resolve) {
      var totalMem = null
      var freeMem = null

      cp.exec('cat /proc/meminfo | head -5', function (err, out) {
        if (err || !out) {
          totalMem = os.totalmem() / 1024
          freeMem = os.freemem() / 1024
          if (os.platform() === 'darwin') {
            var mem = darwinMem.memory()

            totalMem = mem.total
            freeMem = mem.total - mem.used
          }
        } else {
          var resultMemory = (out.match(/\d+/g))

          totalMem = resultMemory[0]
          freeMem = parseInt(resultMemory[1]) + (parseInt(resultMemory[3]) + parseInt(resultMemory[4]))
        }

        var totalMemGb = parseFloat((totalMem / 1024 / 1024).toFixed(2))
        var usedMemGb = parseFloat(((totalMem - freeMem) / 1024 / 1024).toFixed(2))
        var freeMemGb = parseFloat((totalMemGb - usedMemGb).toFixed(2))
        var freeMemPercentage = parseFloat((100 * (freeMem / totalMem)).toFixed(2))

        return resolve({
          totalMemGb: totalMemGb,
          usedMemGb: usedMemGb,
          freeMemGb: freeMemGb,
          freeMemPercentage: freeMemPercentage
        })
      })
    })
  },
  free: function () {
    var self = this

    return self.info().then(function (res) {
      return Promise.resolve({
        totalMemGb: res.totalMemGb,
        freeMemGb: res.freeMemGb
      })
    })
  },
  used: function () {
    var self = this

    return self.info().then(function (res) {
      return Promise.resolve({
        totalMemGb: res.totalMemGb,
        usedMemGb: res.usedMemGb
      })
    })
  }
}