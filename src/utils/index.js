const fs = require('fs')
const mkdirp = require('mkdirp')

module.exports.ensureDirectoriesExist = function(dirnames) {
    if (!Array.isArray(dirnames)) {
        dirnames = [dirnames]
    }
    dirnames.forEach(dirname => {
        if (fs.existsSync(dirname)) {
            return true
        }
        mkdirp.sync(dirname)
    })
}

module.exports.writeWithAcc = function({path, md, addAcc}) {
    let acc = 0
    let tryPath = path

    const filename = path.split('.').slice(0, -1).join('.')
    if (addAcc) {
        while (fs.existsSync(tryPath)) {
            acc += 1
            tryPath = `${filename}-${acc}.md`
        }
    }
    fs.writeFileSync(tryPath, md, {
        encoding: 'utf8',
    })
    return
}
