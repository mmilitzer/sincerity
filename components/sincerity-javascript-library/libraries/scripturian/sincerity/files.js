//
// This file is part of the Sincerity Foundation Library
//
// Copyright 2011-2017 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.require(
	'/sincerity/io/',
	'/sincerity/jvm/',
	'/sincerity/objects/')

var Sincerity = Sincerity || {}

/**
 * High-performance, robust utilities to work with files.
 *  
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 */
Sincerity.Files = Sincerity.Files || function() {
	/** @exports Public as Sincerity.Files */
    var Public = {}
    
    /**
     * Builds a JVM File object, where the first argument is treated as the path
     * root, and the rest of the arguments are treated as path segments. Arguments may
     * also be themselves arrays, in which case they are unpacked and their elements
     * treated as path segments (this effect is recursive).
     * <p>
     * The ".." and "." strings are treated specially: the first is used to move back
     * in the path, the second is ignored.
     * <p>
     * The first argument can be a File object or a string.
     * 
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>}
     */
    Public.build = function(/* arguments */) {
    	var length = arguments.length 
    	if (length == 0) {
    		return null
    	}
    	
    	var file = arguments[0]
		file = Sincerity.IO.asFile(file)
		for (var a = 1; a < length; a++) {
			file = add(file, arguments[a])
		}
		
		function add(file, argument) {
			if (Sincerity.Objects.isArray(argument)) {
				for (var a in argument) {
					file = add(file, argument[a])
				}
			}
			else {
				argument = String(argument)
				if (argument == '..') {
					file = file.parentFile
				}
				else if (argument != '.') {
					file = new java.io.File(file, argument)
				}
			}
			return file
    	}
		
    	return file.absoluteFile
    }

	/**
	 * Deletes a file or a directory.
	 * 
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>} file The file or directory or its path
	 * @param {Boolean} [recursive=false] True to recursively delete a directory
	 * @returns {Boolean} True if the file or directory was completely deleted, or if it
	 *          didn't exist in the first place;
	 *          note that false could mean that parts of the delete succeeded
	 */
	Public.remove = function(file, recursive) {
		file = Sincerity.IO.asFile(file).canonicalFile

		if (!file.exists()) {
			return true
		}

		if (recursive && file.directory) {
			var files = file.listFiles()
			for (var f in files) {
				if (!Public.remove(files[f], true)) {
					return false
				}
			}
		}

		return file['delete']()
	}
	
	/**
	 * Copies a file or directory. Directories are always copied recursively.
	 * 
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>} fromFile The source file or directory or its path
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>} toFile The destination file or directory or its path
	 * @returns {Boolean} True if the file or directory was completely copied;
	 *          note that false could mean that parts of the copy succeeded
	 */
	Public.copy = function(fromFile, toFile) {
		fromFile = Sincerity.IO.asFile(fromFile).canonicalFile
		toFile = Sincerity.IO.asFile(toFile).canonicalFile

		if (!fromFile.exists()) {
			return false
		}

		if (fromFile.directory) {
			if (!toFile.directory) {
				if (!toFile.mkdirs()) {
					return false
				}
			}
			
			var fromFiles = fromFile.listFiles()
			for (var f in fromFiles) {
				fromFile = fromFiles[f]
				if (!Public.copy(fromFile, new java.io.File(toFile, fromFile.name))) {
					return false
				}
			}
			
			return true
		}
		if (!toFile.exists()) {
			if (!toFile.createNewFile()) {
				return false
			}
		}
		
		var fromChannel = new java.io.FileInputStream(fromFile).channel
		try {
			var toChannel = new java.io.FileOutputStream(toFile).channel
			try {
				var size = fromChannel.size()
				return toChannel.transferFrom(fromChannel, 0, size) == size
			}
			finally {
				toChannel.close()
			}
		}
		finally {
			fromChannel.close()
		}
	}
	
	/**
	 * Moves a file or directory. Does a simple, fast rename if the source and destination
	 * are in the same filesystem, otherwise does a full copy-and-remove.
	 * 
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>} fromFile The source file or directory or its path
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>} toFile The destination file or directory or its path
	 * @param {Boolean} [recursive=false] True to recursively copy a directory and its files
	 * @returns {Boolean} True if the file or directory was moved;
	 *          note that false could mean that parts of the move succeeded
	 */
	Public.move = function(fromFile, toFile, recursive) {
		fromFile = Sincerity.IO.asFile(fromFile).canonicalFile
		toFile = Sincerity.IO.asFile(toFile).canonicalFile

		if (!fromFile.exists()) {
			return false
		}
		
		// This will work only if the source and destination are in the same filesystem
		if (fromFile.renameTo(toFile)) {
			return true
		}
		
		if (!Public.copy(fromFile, toFile)) {
			return false
		}
		
		return Public.remove(fromFile, recursive)
	}
	
	/**
	 * Erases the contents of a file, effectively setting its length to 0.
	 * 
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>} file The file or its path
	 */
	Public.erase = function(file) {
		file = Sincerity.IO.asFile(file).canonicalFile
		new java.io.FileWriter(file).close()		
	}
	
	/**
	 * Turns on the file's executable permission.
	 * <p>
	 * Implementation note: on Windows works only from JVM version 6 and upward.
	 * 
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>} file The file or its path
	 */
	Public.makeExecutable = function(file) {
		file = Sincerity.IO.asFile(file).canonicalFile
		
		if (file.exists()) {
			if (undefined !== file.executable) { // JVM6+ only
				file.executable = true
			}
			else {
				// TODO: can we be more non-portable? :(
				Sincerity.JVM.exec('chmod', ['+x', String(file)])
			}
		}
	}
	
	/**
	 * Creates a temporary file in the operating system's default temporary file directory with
	 * a unique temporary filename. The file will be deleted when the JVM shuts down.
	 * 
	 * @param {String} prefix Must be at least 3 characters long
	 * @param {String} [suffix='.tmp']
	 * @returns {String} The file path
	 */
	Public.temporary = function(prefix, suffix) {
		var file = java.io.File.createTempFile(prefix, suffix)
		file.deleteOnExit()
		return String(file)
	}
	
	/**
	 * Opens a file for writing text, optionally with gzip compression.
	 * 
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>} file The file or its path
	 * @param {Boolean} [gzip=false] True to gzip the output
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/PrintWriter.html">java.io.PrintWriter</a>}
	 */
	Public.openForTextWriting = function(file, gzip) {
		file = Sincerity.IO.asFile(file).canonicalFile

		var stream = new java.io.FileOutputStream(file)
		if (gzip) {
			stream = new java.util.zip.GZIPOutputStream(stream)
		}

		var writer = new java.io.OutputStreamWriter(stream)
		writer = new java.io.BufferedWriter(writer)
		writer = new java.io.PrintWriter(writer)
		
		return writer
    }

	/**
	 * Opens a file for reading text, optionally with gzip decompression.
	 * 
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>} file The file or its path
	 * @param {Boolean} [gzip=false] True to gunzip the input
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/Reader.html">java.io.Reader</a>}
	 */
	Public.openForTextReading = function(file, gzip) {
		file = Sincerity.IO.asFile(file).canonicalFile

		var stream = new java.io.FileInputStream(file)
		if (gzip) {
			stream = new java.util.zip.GZIPInputStream(stream)
		}

		var reader = new java.io.InputStreamReader(stream)
		reader = new java.io.BufferedReader(reader)
		
		return reader
    }

	/**
	 * Fast loading of text contents of very large files, using the underlying operating system's
	 * file-to-memory mapping facilities.
	 * <p>
	 * Note that it does not return a string, but a buffer (which can be cast to a JavaScript
	 * String if required).
	 * <p> 
	 * Note: There is no way to force the release of a MappedByteBuffer. Unfortunately, under
	 * Windows this causes the file to remain locked against writing.
	 * <p>
	 * See: http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4724038
	 * 
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>} file The file or its path
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/nio/charset/Charset.html">java.nio.charset.Charset</a>} [charset=default encoding (most likely UTF-8)] The charset in which the file is encoded
	 * @returns {<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/nio/CharBuffer.html">java.nio.CharBuffer</a>}
	 */
	Public.loadText = function(file, charset) {
		file = Sincerity.IO.asFile(file).canonicalFile
		charset = Sincerity.JVM.asCharset(charset)
		
		var input = new java.io.FileInputStream(file)
		var channel = input.channel
		try {
			var buffer = channel.map(java.nio.channels.FileChannel.MapMode.READ_ONLY, 0, channel.size())
			return charset.decode(buffer)
		}
		finally {
			channel.close()
		}
	}

	/**
	 * Fast grep from file to file.
	 * 
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>} inputFile The input file or its path
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>} outputFile The output file or its path (will be overwritten)
	 * @param {RegExp} pattern Only include lines that match this pattern
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/nio/charset/Charset.html">java.nio.charset.Charset</a>} [charset=default encoding (most likely UTF-8)] The charset in which the file is encoded
	 */
	Public.grep = function(inputFile, outputFile, pattern, charset) {
		inputFile = Sincerity.IO.asFile(inputFile).canonicalFile
		outputFile = Sincerity.IO.asFile(outputFile).canonicalFile
		charset = Sincerity.JVM.asCharset(charset)

		var buffer = Public.loadText(inputFile, charset)

		var output = new java.io.FileOutputStream(outputFile)
		output = Sincerity.Objects.exists(charset) ? new java.io.OutputStreamWriter(output, charset) : new java.io.OutputStreamWriter(output)
		output = new java.io.BufferedWriter(output)
		try {
			var lineMatcher = linePattern.matcher(buffer)
			while (lineMatcher.find()) {
				var line = String(lineMatcher.group())
				if (line.search(pattern) != -1) {
					output.write(line)
				}
			}
		}
		finally {
			output.close()
		}
	}
	
	/**
	 * Fast tail.
	 * 
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/io/File.html">java.io.File</a>} file The file or its path
	 * @param {Number} position Position in the file at which to start
	 * @param {Boolean} forward True to go forward from position, false to go backward
	 * @param {Number} count Number of lines
	 * @param {String|<a href="http://docs.oracle.com/javase/6/docs/api/index.html?java/nio/charset/Charset.html">java.nio.charset.Charset</a>} [charset=default encoding (most likely UTF-8)] The charset in which the file is encoded
	 */
	Public.tail = function(file, position, forward, count, charset) {
		file = Sincerity.IO.asFile(file).canonicalFile
		
		var randomAccessFile = new java.io.RandomAccessFile(file, 'r')
		var position = Sincerity.Objects.exists(position) ? position : randomAccessFile.length() - 1
		var start, end

		try {
			// Find start and end of section
			if (forward) {
				if (position > 0) {
					randomAccessFile.seek(position - 1)

					// This will work for Unicode, too, because Unicode reserves newline codes!
					if (randomAccessFile.readByte() == 10) {
						// We are at the beginning of a line
						start = position
					}
					else {
						randomAccessFile.readLine()

						start = randomAccessFile.filePointer
					}
				}

				// Go forward 'count' number of newlines
				var newlines = count
				while (newlines-- > 0) {
					var line = randomAccessFile.readLine()

					if (line == null) {
						// Not enough lines reading forward, so read backward from end
						return Public.tail(file, null, false, count)
					}
				}

				end = randomAccessFile.filePointer - 1
			}
			else {
				end = position - 1
				
				// Go back 'count' number of newlines
				start = end - 1
				if (start < 0) {
					return {
						start: 0,
						end: 0,
						text: ''
					}
				}
				
				var newlines = count
				while ((newlines > 0) && (start > 0)) {
					randomAccessFile.seek(--start)

					// This will work for Unicode, too, because Unicode reserves newline codes!
					if (randomAccessFile.readByte() == 10) {
						newlines--
					}
				}
				
				start++
				randomAccessFile.seek(start)
			}
			
			// Read bytes into text
			var bytes = Sincerity.JVM.newArray(end - start + 1, 'byte')
			randomAccessFile.seek(start)
			randomAccessFile.read(bytes)
			var text = Sincerity.JVM.fromBytes(bytes, charset)
			
			return {
				start: start,
				end: end,
				text: text
			}
		}
		finally {
			randomAccessFile.close()
		}
	}
	
	//
	// Initialization
	//

	var linePattern = java.util.regex.Pattern.compile('.*\r?\n')
	
	return Public
}()
