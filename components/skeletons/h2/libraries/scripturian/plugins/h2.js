
function getInterfaceVersion() {
	return 1
}

function getCommands() {
	return [
		'server',
		'console',
		'backup',
		'change-file-encryption',
		'compress',
		'convert-trace-file',
		'create-cluster',
		'csv',
		'delete-db-files',
		'multi-dimension',
		'recover',
		'restore',
		'run-script',
		'script',
		'shell'
	]
}

function run(command) {
	switch (String(command.name)) {
		case 'server':
			h2(command, 'org.h2.tools.Server', 'server')
			break
		case 'console':
			h2(command, 'org.h2.tools.Console', 'console')
			break
		case 'backup':
			h2(command, 'org.h2.tools.Backup', 'backup')
			break
		case 'change-file-encryption':
			h2(command, 'org.h2.tools.ChangeFileEncryption', 'change-file-encryption')
			break
		case 'compress':
			h2(command, 'org.h2.tools.CompressTool', 'compress')
			break
		case 'convert-trace-file':
			h2(command, 'org.h2.tools.ConvertTraceFile', 'convert-trace-file')
			break
		case 'create-cluster':
			h2(command, 'org.h2.tools.CreateCluster', 'create-cluster')
			break
		case 'csv':
			h2(command, 'org.h2.tools.Csv', 'csv')
			break
		case 'delete-db-files':
			h2(command, 'org.h2.tools.DeleteDbFiles', 'delete-db-files')
			break
		case 'multi-dimension':
			h2(command, 'org.h2.tools.MultiDimension', 'multi-dimension')
			break
		case 'recover':
			h2(command, 'org.h2.tools.Recover', 'recover')
			break
		case 'restore':
			h2(command, 'org.h2.tools.Restore', 'restore')
			break
		case 'run-script':
			h2(command, 'org.h2.tools.RunScript', 'run-script')
			break
		case 'script':
			h2(command, 'org.h2.tools.Script', 'script')
			break
		case 'shell':
			h2(command, 'org.h2.tools.Shell', 'shell')
			break
	}
}

function h2(command, className, confName) {
	var arguments = [className]

	var file = command.sincerity.container.getConfigurationFile('h2', confName + '.conf')
	if (file.exists()) {
		var reader = new java.io.BufferedReader(new java.io.FileReader(file))
		try {
			while (null !== (line = reader.readLine())) {
				if ((line.length() == 0) || line.startsWith('#')) {
					continue
				}
				arguments.push(line)
			}
		}
		finally {
			reader.close()
		}
	}

	if ((confName == 'server') || (confName == 'console')) {
		arguments.push('-baseDir')
		arguments.push(command.sincerity.container.getFile('data'))
	}

	for (var i in command.arguments) {
		arguments.push(command.arguments[i])
	}
	
	try {
		command.sincerity.run('logging:logging')
	} catch(x) {}
	
	command.sincerity.run('delegate:main', arguments)
}
