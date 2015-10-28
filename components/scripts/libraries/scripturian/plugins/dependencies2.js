
document.require(
	'/sincerity/dependencies/maven/',
	'/sincerity/objects/')

importClass(
	com.threecrickets.sincerity.plugin.console.CommandCompleter,
	com.threecrickets.sincerity.util.ClassUtil)

function getInterfaceVersion() {
	return 1
}

function getCommands() {
	return ['install2']
}

function run(command) {
	switch (String(command.name)) {
		case 'install2':
			test(command)
			break
	}
}

function test(command) {
	command.parse = true

	var sincerity = command.sincerity
	
	var repository = new Sincerity.Dependencies.Maven.Repository({uri: 'file:/Depot/DevRepository/'})
	var id = new Sincerity.Dependencies.Maven.ModuleIdentifier('org.jsoup', 'jsoup', '1.8.1')
	var id2 = new Sincerity.Dependencies.Maven.ModuleIdentifier('org.jsoup', 'jsoup', '1.8.1')
	var specification = new Sincerity.Dependencies.Maven.ModuleSpecification('org.jsoup', 'jsoup', '1.8.1')
	var id3 = new Sincerity.Dependencies.Maven.ModuleIdentifier('com.github.sommeri:less4j:1.15.2')
	var resolver = new Sincerity.Dependencies.Resolver()
	
	// ForkJoin
	sincerity.out.println('forkJoin:')
	var pool = new java.util.concurrent.ForkJoinPool()

	pool.invoke(Sincerity.JVM.task(function() {
		sincerity.out.println('In task!')
	}, 'recursiveAction'))
	
	function sumTask(arr, lo, hi) {
		// Sums in chunks of 1000
		// See: http://homes.cs.washington.edu/~djg/teachingMaterials/spac/grossmanSPAC_forkJoinFramework.html
		return Sincerity.JVM.task(function() {
			if (hi - lo <= 1000) {
				var sum = 0
				for (var i = lo; i < hi; i++) {
					sum += arr[i]
				}
				return {value: sum} // returning dicts to avoid boxing by JavaScript engine
			}
			else {
				var mid = lo + Math.floor((hi - lo) / 2)
				var left = sumTask(arr, lo, mid)
				var right = sumTask(arr, mid, hi)
				left.fork()
				right = right.compute().value
				left = left.join().value
				return {value: left + right}
			}
		}, 'recursiveTask')
	}
	
	var arr = []
	for (var i = 0; i < 1000000; i++) {
		arr[i] = i
	}
	
	sincerity.out.println(pool.invoke(sumTask(arr, 0, arr.length)).value)
	sincerity.out.println()
	
	// matchSimple
	sincerity.out.println('matchSimple:')
	sincerity.out.println('true=' + 'This is the ? text'.matchSimple())
	sincerity.out.println('true=' + 'This is the ? text'.matchSimple(''))
	sincerity.out.println('true=' + 'This is the ? text'.matchSimple('*'))
	sincerity.out.println('true=' + 'This is the ? text'.matchSimple('This*'))
	sincerity.out.println('true=' + 'This is the ? text'.matchSimple('*the ? text*'))
	sincerity.out.println('true=' + 'This is the ? text'.matchSimple('*the \\? text*'))
	sincerity.out.println('true=' + 'This is the ! text'.matchSimple('*the ? text*'))
	sincerity.out.println('false=' + 'This is the ! text'.matchSimple('*the \\? text*'))
	sincerity.out.println()

	// toString
	sincerity.out.println(repository.toString())
	sincerity.out.println(id.toString())
	sincerity.out.println(id.isEqual(id2))
	sincerity.out.println(id3.toString())
	sincerity.out.println(specification.toString())
	sincerity.out.println(specification.allowsModuleIdentifier(id))
	sincerity.out.println()

	// Versions
	sincerity.out.println('Versions:')
	sincerity.out.println('0=' +  Sincerity.Dependencies.Maven.Versions.compare('', ''))
	sincerity.out.println('1=' +  Sincerity.Dependencies.Maven.Versions.compare('2', ''))
	sincerity.out.println('1=' +  Sincerity.Dependencies.Maven.Versions.compare('2', '1'))
	sincerity.out.println('-1=' + Sincerity.Dependencies.Maven.Versions.compare('1', '2'))
	sincerity.out.println('1=' +  Sincerity.Dependencies.Maven.Versions.compare('2.2', '2'))
	sincerity.out.println('1=' +  Sincerity.Dependencies.Maven.Versions.compare('2.2', '2.1'))
	sincerity.out.println('1=' +  Sincerity.Dependencies.Maven.Versions.compare('2.2', '2.2-b1'))
	sincerity.out.println('-1=' + Sincerity.Dependencies.Maven.Versions.compare('2.2-b1', '2.2-b2'))
	sincerity.out.println('-1=' + Sincerity.Dependencies.Maven.Versions.compare('2.2-alpha2', '2.2-beta1'))
	sincerity.out.println('1=' +  Sincerity.Dependencies.Maven.Versions.compare('2.2-2', '2.2-1'))
	sincerity.out.println('0=' +  Sincerity.Dependencies.Maven.Versions.compare('2.2-', '2.2'))
	sincerity.out.println()

	// URI
	sincerity.out.println('URI:')
	var uri = repository.getUri(id, 'pom')
	sincerity.out.println(uri)
	sincerity.out.println()
	
	// Fetch
	sincerity.out.println('Fetch:')
	repository.fetchModule(id, 'jsoup.jar')
	
	// POM
	sincerity.out.println('POM:')
	var pom = repository.getPom(id)
	sincerity.out.println(pom.moduleIdentifier.toString())
	
	var pom = repository.getPom(id3)
	sincerity.out.println(pom.moduleIdentifier.toString())
	for (var d in pom.dependencyModuleSpecifications) {
		sincerity.out.println('| ' + pom.dependencyModuleSpecifications[d].toString())
	}
	sincerity.out.println()
	
	// Metadata
	sincerity.out.println('MetaData:')
	var metadata = repository.getMetaData('com.github.sommeri', 'less4j')
	sincerity.out.println(metadata.moduleIdentifier.toString())
	for (var i in metadata.moduleIdentifiers) {
		var id = metadata.moduleIdentifiers[i]
		sincerity.out.println(id.toString())
	}
	sincerity.out.println()
	
	// Signatures
	sincerity.out.println('Signatures:')
	var signature = repository.getSignature(uri, 'pom')
	if (signature) {
		sincerity.out.println(signature.type + ':' + signature.content)
	}
	sincerity.out.println()
	
	// Resolve Module
	sincerity.out.println('Resolve Module:')
	var module = new Sincerity.Dependencies.Module()
	module.specification = new Sincerity.Dependencies.Maven.ModuleSpecification('com.github.sommeri:less4j:1.15.2')
	resolver.resolveModule(module, [repository], [], true)
	module.dump(sincerity.out, true)
	sincerity.out.println()

	// Resolve
	sincerity.out.println('Resolve:')

	var modules = [
		{group: 'com.github.sommeri', name: 'less4j'},
 		{group: 'org.jsoup', name: 'jsoup', version: '1.8.1'},
 		{group: 'com.fasterxml.jackson', name: 'jackson'},
 		{group: 'com.threecrickets.prudence', name: 'prudence'}
 	]
	
	var repositories = [
		{uri: 'file:/Depot/DevRepository/'}
	]
	
	var rules = [
 		{rule: 'exclude', name: '*annotations*'},
		{rule: 'excludeDependencies', group: 'org.apache.commons', name: 'commons-beanutils'},
   		//{rule: 'rewriteGroupName'},
  		{rule: 'rewriteVersion', group: 'com.beust', name: '*c?mmand*', newVersion: '1.35+'}
  	]
	
	var result = resolver.resolve(modules, repositories, rules)
	sincerity.out.println('Tree:')
	for (var m in result.roots) {
		result.roots[m].dump(sincerity.out, true)
	}
	sincerity.out.println('Resolved:')
	for (var m in result.resolved) {
		result.resolved[m].dump(sincerity.out)
	}
	sincerity.out.println('Unresolved:')
	for (var m in result.unresolved) {
		result.unresolved[m].dump(sincerity.out)
	}
	sincerity.out.println('resolveCacheHits: ' + resolver.resolvedCacheHits.get())
}