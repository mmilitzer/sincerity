//
// This file is part of the Sincerity Foundation Library
//
// Copyright 2011-2014 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.require('/sincerity/objects/')

var Sincerity = Sincerity || {}

/**
 * Utilities to work with JVM types and classes.
 * <p>
 * Note: This library modifies the String prototype.
 *  
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.1
 */
Sincerity.JVM = Sincerity.JVM || function() {
	/** @exports Public as Sincerity.JVM */
    var Public = {}

	/**
	 * Loads a JVM class, using the current thread context.
	 * 
	 * @param {String} name The class name
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/lang/Class.html">java.lang.Class</a>} The class or null if not found
	 */
	Public.getClass = function(name) {
    	var classLoader = java.lang.Thread.currentThread().contextClassLoader
		try {
			return classLoader.loadClass(name)
		}
		catch (x) {
			return null
		}
	}
    
	/**
	 * Opens a JVM resource for input, using the current thread context.
	 * 
	 * @param {String} name The resource name
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/InputStream.html">java.io.InputStream</a>} The stream or null if not found
	 */
    Public.getResourceAsStream = function(name) {
    	var classLoader = java.lang.Thread.currentThread().contextClassLoader
		try {
			return classLoader.getResourceAsStream(name)
		}
		catch (x) {
			return null
		}
    }
	
	/**
	 * True if the value is an instance of the JVM class (or its sub-classes). 
	 * 
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/lang/Class.html">java.lang.Class</a>} The JVM class or its name
	 * @returns {Boolean}
	 */
	Public.instanceOf = function(value, theClass) {
		if (value.getClass) {
			theClass = Sincerity.Objects.isString(theClass) ? Public.getClass(theClass) : theClass
			return value.getClass() === theClass
		}
		return false
	}
	
	/**
	 * Creates an instance of a JVM class.
	 * 
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/lang/Class.html">java.lang.Class</a>} The JVM class or its name
	 * @returns An instance
	 */
	Public.newInstance = function(theClass) {
		theClass = Sincerity.Objects.isString(theClass) ? Public.getClass(theClass) : theClass
		return theClass ? theClass.newInstance() : null
	}
	
	/**
	 * Creates a JVM array.
	 * 
	 * @param {Number} length The array length
	 * @param {String} [type='object'] The array element type: can be a primitive ('int', 'byte', etc.) or a full class name
	 * @returns A JVM array
	 */
	Public.newArray = function(length, type) {
		type = type || 'object'
		if (Sincerity.Objects.isString(type)) {
			var theClass = primitiveTypes[String(type)]
			if (!theClass) {
				theClass = Public.getClass(type)
			}
			type = theClass
		}
		return java.lang.reflect.Array.newInstance(theClass, length)
	}
	
	/**
	 * Converts a JavaScript array into a new JVM array.
	 */
	Public.toArray = function(array, type) {
		var jvmArray = Public.newArray(array.length, type)
		for (var a in array) {
			jvmArray[a] = array[a]
		}
		return jvmArray
	}
	
	/**
	 * Converts a JVM array into a JavaScript array.
	 */
	Public.fromArray = function(array) {
		var jsArray = []
		for (var a in array) {
			jsArray.push(array[a])
		}
		return jsArray
	}
	
	/**
	 * Creates a JVM ArrayList (not thread-safe) or a CopyOnWriteArrayList (thread-safe).
	 * 
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/util/List.html">java.util.List</a>}
	 */
	Public.newList = function(threadSafe, initialCapacity) {
		if (initialCapacity) {
			return threadSafe ? new java.util.concurrent.CopyOnWriteArrayList() : new java.util.ArrayList(initialCapacity)
		}
		else {
			// CopyOnWriteArrayList does not support initial capacity
			return threadSafe ? new java.util.concurrent.CopyOnWriteArrayList() : new java.util.ArrayList()
		}
	}
	
	/**
	 * Creates a JVM HashSet (not thread-safe) or a CopyOnWriteArraySet (thread-safe).
	 * 
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/util/Set.html">java.util.Set</a>}
	 */
	Public.newSet = function(threadSafe, initialCapacity) {
		if (initialCapacity) {
			return threadSafe ? new java.util.concurrent.CopyOnWriteArraySet() : new java.util.HashSet(initialCapacity)
		}
		else {
			// Weird: CopyOnWriteArraySet does not support initial capacity
			return threadSafe ? new java.util.concurrent.CopyOnWriteArraySet() : new java.util.HashSet()
		}
	}
	
	/**
	 * Converts a JavaScript array into a new JVM ArrayList (not thread-safe) or a CopyOnWriteArrayList (thread-safe).
	 * 
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/util/List.html">java.util.List</a>}
	 */
	Public.toList = function(array, threadSafe) {
		var list = Public.newList(threadSafe, array.length)
		for (var a in array) {
			list.add(array[a])
		}
		return list
	}
	
	/**
	 * Converts a JVM Collection into a new JavaScript array.
	 * 
	 * @returns {Array}
	 */
	Public.fromCollection = function(collection) {
		return Public.fromArray(collection.toArray())
	}
	
	/**
	 * Creates a JVM HashMap (not thread-safe) or a ConcurrentHashMap (thread-safe).
	 * 
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/util/Map.html">java.util.Map</a>}
	 */
	Public.newMap = function(threadSafe, initialCapacity) {
		if (initialCapacity) {
			return threadSafe ? new java.util.concurrent.ConcurrentHashMap(initialCapacity) : new java.util.HashMap(initialCapacity)
		}
		else {
			return threadSafe ? new java.util.concurrent.ConcurrentHashMap() : new java.util.HashMap()
		}
	}

	/**
	 * Converts a JavaScript dict into a new JVM HashMap (not thread-safe) or a ConcurrentHashMap (thread-safe).
	 * 
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/util/Map.html">java.util.Map</a>}
	 */
	Public.toMap = function(dict, threadSafe) {
		var map = Public.newMap(threadSafe)
		for (var k in dict) {
			map.put(k, dict[k])
		}
		return map
	}
	
	/**
	 * Converts a JVM Map into a new JavaScript dict.
	 * 
	 * @returns {Object}
	 */
	Public.fromMap = function(map) {
		var dict = {}
		for (var i = map.entrySet().iterator(); i.hasNext(); ) {
			var entry = i.next()
			dict[entry.key] = entry.value
		}
		return dict
	}
	
	/**
	 * Creates a JVM Lock.
	 * 
	 * @param {Boolean} [readWrite=false] True to create a read-write lock
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/util/concurrent/locks/ReentrantLock.html">java.util.concurrent.locks.ReentrantLock</a>|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/util/concurrent/locks/ReentrantReadWriteLock.html">java.util.concurrent.locks.ReentrantReadWriteLock</a>}
	 */
	Public.newLock = function(readWrite) {
		return readWrite ? new java.util.concurrent.locks.ReentrantReadWriteLock() : java.util.concurrent.locks.ReentrantLock()
	}
	
	/**
	 * Returns a JVM charset.
	 * 
	 * @param {String} [name] Leave empty to get default charset (most likely UTF-8)
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/nio/charset/Charset.html">java.nio.charset.Charset</a>}
	 */
	Public.getCharset = function(name) {
		return Sincerity.Objects.exists(name) ? java.nio.charset.Charset.forName(name) : java.nio.charset.Charset.defaultCharset()
	}

	/**
	 * Converts a JVM byte array into a JavaScript string.
	 * 
	 * @param {byte[]} The bytes
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/nio/charset/Charset.html">java.nio.charset.Charset</a>} [charset=default encoding (most likely UTF-8)] The charset in which the bytes are encoded
	 * @returns {String}
	 * @see #getCharset
	 */
	Public.fromBytes = function(bytes, charset) {
		charset = Sincerity.Objects.isString(charset) ? Public.getCharset(charset) : null
		return null !== charset ? String(new java.lang.String(bytes, charset)) : String(new java.lang.String(bytes))
	}
	
	/**
	 * Converts a JVM byte array into an array of JavaScript strings, each representing a line.
	 * 
	 * @param {byte[]} The bytes
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/nio/charset/Charset.html">java.nio.charset.Charset</a>} [charset=default encoding (most likely UTF-8)] The charset in which the bytes are encoded
	 * @returns {String[]}
	 * @see #getCharset
	 */
	Public.linesFromBytes = function(bytes, charset) {
		charset = Sincerity.Objects.isString(charset) ? Public.getCharset(charset) : null
				
		var input = new java.io.ByteArrayInputStream(bytes)
		input = Objects.exists(charset) ? new java.io.InputStreamReader(input, charset) : new java.io.InputStreamReader(input)
		input = new java.io.BufferedReader(input)
		
		var lines = []
		var line = input.readLine()
		while (line != null) {
			lines.push(String(line))
			line = input.readLine()
		}

		return lines
	}
	
	/**
	 * Converts a string into a JVM byte array.
	 * 
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/nio/charset/Charset.html">java.nio.charset.Charset</a>} [charset=default encoding (most likely UTF-8)] The charset in which the bytes are to be encoded
	 * @see #getCharset
	 */
	Public.toByteArray = function(string, charset) {
		charset = Sincerity.Objects.isString(charset) ? Public.getCharset(charset) : null
		return null !== charset ? new java.lang.String(string).getBytes(charset) : new java.lang.String(string).bytes
	}
	
	/**
	 * Converts a JavaScript dict into a JVM Properties sheet.
	 * 
	 * @param {Object} dict The dictionary
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/util/Properties.html">java.util.Properties</a>}
	 */
	Public.toProperties = function(dict) {
		var properties = new java.util.Properties()
		for (var d in dict) {
			properties.put(d, dict[d])
		}
		return properties
	}
	
	/**
	 * Converts a JVM Properties sheet into a new JavaScript dict.
	 * 
	 * @param {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/util/Properties.html">java.util.Properties</a>} properties The properties sheet
	 * @returns {Object}
	 */
	Public.fromProperties = function(properties) {
		var dict = {}
		for (var e = properties.propertyNames(); e.hasMoreElements(); ) {
			var name = e.nextElement()
			dict[name] = String(properties.get(name))
		}
		return dict
	}

	/**
	 * Loads a JVM Properties sheet from a file.
	 * 
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>} file The file or its path
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/util/Properties.html">java.util.Properties</a>}
	 */
	Public.loadProperties = function(file) {
		file = (Sincerity.Objects.isString(file) ? new java.io.File(file) : file).canonicalFile
		var properties = new java.util.Properties()
		var reader = new java.io.BufferedReader(java.io.FileReader(file))
		try {
			properties.load(reader)
		}
		finally {
			reader.close()
		}
		return properties
	}

	/**
	 * Loads a resource as a JVM Properties sheet.
	 * 
	 * @param {String} name The resource name
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/util/Properties.html">java.util.Properties</a>}
	 */
	Public.getResourceAsProperties = function(name) {
		var properties = new java.util.Properties()
		var stream = Public.getResourceAsStream(name)
		if (null !== stream) {
			try {
				properties.load(stream)
			}
			finally {
				stream.close()
			}
		}
		return properties
	}
	
	/**
	 * Converts JVM Locale into a JavaScript dict.
	 * 
	 * @param {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/util/Locale.html">java.util.Locale</a>} locale The JVM locale
	 * @returns {Object} In the form {language: 'code' ,country: 'code', variant: 'code'}
	 */
	Public.fromLocale = function(locale) {
		var r = {}
		if (locale.language.length()) {
			r.language = String(locale.language).toLowerCase()
		}
		if (locale.country.length()) {
			r.country = String(locale.country).toLowerCase()
		}
		if (locale.variant.length()) {
			r.variant = String(locale.variant).toLowerCase()
		}
		return r
	}
	
	/**
	 * Converts a special JavaScript dict into a JVM Locale.
	 * 
	 * @param {Object|String} value A string is interpreted as {language: value}
	 * @param {String} value.language The language code
	 * @param {String} [value.country] The country code
	 * @param {String} [value.variant] The variant code
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/util/Locale.html">java.util.Locale</a>}
	 */
	Public.toLocale = function(value) {
		if (value) {
			if (Sincerity.Objects.isString(value)) {
				return new java.util.Locale(value)
			}
			if (value.variant && value.country && value.language) {
				return new java.util.Locale(value.language, value.country, value.variant)
			}
			if (value.country && value.language) {
				return new java.util.Locale(value.language, value.country)
			}
			if (value.language) {
				return new java.util.Locale(value.language)
			}
		}
		
		return null
	}
	
	/**
	 * Returns the system locale as a special JavaScript dict.
	 */
	Public.getSystemLocale = function() {
		return Public.fromLocale(java.util.Locale.getDefault())
	}
	
	/**
	 * Returns the JVM stack trace for a JVM exception.
	 * 
	 * @returns {String} The stack trace (multi-line, human-readable)
	 */
	Public.getStackTrace = function(exception) {
		var string = new java.io.StringWriter()
		var writer = new java.io.PrintWriter(string)
		exception.printStackTrace(writer)
		writer.close()
		return String(string)
	}
	
	/**
	 * Sweet dreams! Zzzzzzz. 
	 * 
	 * @param {Number} duration Duration in milliseconds
	 */
	Public.sleep = function(duration) {
		java.lang.Thread.sleep(duration)
	}
	
	/**
	 * Executes an OS command, returning its results.
	 * 
	 * @param {String} command The command (an alias or its path location)
	 * @param {String[]} [args] Optional arguments to the command
	 * @param [environment] An optional dict of environment vars to set for executing the command
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>} [directory] The directory (or its path) in which to execute the command
	 * @returns {String[]} The command's output, line by line
	 */
	Public.exec = function(command, args, environment, directory) {
		if (Sincerity.Objects.exists(directory)) {
			directory = (Sincerity.Objects.isString(directory) ? new java.io.File(directory) : directory).canonicalFile
		}
		
		if (Sincerity.Objects.exists(environment)) {
			var environmentArray = []
			for (var e in environment) {
				environmentArray.push(e + '=' + environment[e])
			}
			environment = environmentArray
		}
		
		command = [command].concat(args)
		var runtime = java.lang.Runtime.runtime
		var process = runtime.exec(command, environment || null, directory || null)
		
		var lines = []

		// Get process' output
		var reader = new java.io.BufferedReader(new java.io.InputStreamReader(process.getInputStream()))
		try {
			while (true) {
				var line = reader.readLine()
				if (!Sincerity.Objects.exists(line)) {
					break
				}
				lines.push(String(line))
			}
		}
		finally {
			reader.close()
		}
		
		return lines
	}
	
	Public.kill = function(pid) {
		var os = java.lang.System.getProperty('os.name')
		if (os == 'Windows') {
			// TODO
		}
		else {
			Public.exec('kill', [pid])
		}
	}

	Public.getProcessState = function(pid) {
		var os = java.lang.System.getProperty('os.name')
		if (os == 'Windows') {
			return null
		}
		else {
			var lines = Public.exec('ps', ['h', '-o', 'state', pid])
			return lines.length > 0 ? lines[0] == 'S' : false
		}
	}

	//
	// Initialization
	//
	
	var primitiveTypes = {
		'object': Public.getClass('java.lang.Object'),
		'bool': java.lang.Boolean.TYPE,
		'byte': java.lang.Byte.TYPE,
		'char': java.lang.Character.TYPE,
		'int': java.lang.Integer.TYPE,
		'short': java.lang.Short.TYPE,
		'long': java.lang.Long.TYPE,
		'float': java.lang.Float.TYPE,
		'double': java.lang.Double.TYPE
	}
	
	return Public
}()

/**
 * Converts a string into a JVM byte array.
 * 
 * @methodOf String#
 * @param {String|java.nio.charset.Charset} [charset=default encoding (most likely UTF-8)] The charset in which the bytes are to be encoded
 * @see Sincerity.JVM#getCharset
 * @see Sincerity.JVM#toByteArray
 */ 
String.prototype.toByteArray = String.prototype.toBytes || function(charset) {
	return Sincerity.JVM.toByteArray(this, charset)
}
