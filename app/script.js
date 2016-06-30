const {remote} = require('electron')
const {app, dialog, shell} = remote
const renderer = require('../renderer.js')
const async = require('async')

var confFile = ''
var appConf = {}
var serverUrl = ''

document.getElementById('tools-footer').innerHTML = app.getVersion()

async.waterfall([
    function (callback) {
        files = dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                {name: 'Yaml files', extensions: ['yaml']}
            ]
        })
        if(!files) { app.quit() }
        callback(null, files[0])
    },
    function (file, callback) {
        confFile = file
        renderer.openConfFile(confFile, callback)
    },
], function (err, conf) {
    if(err) {
        dialog.showMessageBox({
            type: 'error',
            message: err.toString(),
            buttons: ['OK']
        }, function () {
            app.quit()
        })
    } else {
        appConf = conf
        document.getElementById('title').innerHTML = confFile.replace(app.getPath('home'), '~')
        document.getElementById('source').innerHTML = appConf.source.replace(app.getPath('home'), '~')
        document.getElementById('build').innerHTML = appConf.build.replace(app.getPath('home'), '~')

        renderer.startServer(function (err) {
            if (err) {
                addLogError(
                    err.event,
                    err.source,
                    `javascript:shell.openExternal('${serverUrl+err.source}')`,
                    err.error.toString().trim()
                )
            } else {
                serverUrl = `http://localhost:${appConf.port}`
                document.getElementById('preview').innerHTML = serverUrl

                let myNotification = new Notification('Entu CMS', {
                    body: `Server started at ${serverUrl}`
                })
                myNotification.onclick = () => {
                    shell.openExternal(serverUrl)
                }
            }

        })

        renderer.watchFiles(function (err, data) {
            if (err) {
                addLogError(
                    err.event,
                    err.source,
                    `javascript:shell.showItemInFolder('${appConf.source+err.source}')`,
                    err.error.toString().trim()
                )
            } else {
                for (var i = 0; i < data.build.length; i++) {
                    addLog(
                        data.event,
                        data.source,
                        `javascript:shell.showItemInFolder('${appConf.source+data.source}')`,
                        data.build[i].replace('/index.html', ''),
                        `javascript:shell.openExternal('${serverUrl+data.build[i].replace('index.html', '')}')`
                    )
                }
            }
        })
    }
})

document.addEventListener('keydown', function (e) {
	if (e.which === 123) {
		remote.getCurrentWindow().toggleDevTools()
	} else if (e.which === 116) {
		location.reload()
	}
})

var clearLog = function () {
    document.getElementById('log-table').innerHTML = ''
}

var addLogError = function (event, source, sourceLink, error) {
    document.getElementById('log-table').innerHTML = document.getElementById('log-table').innerHTML + `
        <tr class="error">
            <td>${event}</td>
            <td colspan="3">
                <a href="${sourceLink}">${source}</a><br>
                <pre>${error}</pre>
            </td>
        </tr>
    `
    document.getElementById('log').scrollTop = document.getElementById('log').scrollHeight
}

var addLog = function (event, source, sourceLink, build, buildLink) {
    document.getElementById('log-table').innerHTML = document.getElementById('log-table').innerHTML + `
        <tr class="log">
            <td>${event}</td>
            <td><a href="${sourceLink}">${source}</a></td>
            <td><a href="${buildLink}">${build}</a></td>
            <td width="100%"></td>
        </tr>
    `
    document.getElementById('log').scrollTop = document.getElementById('log').scrollHeight
}