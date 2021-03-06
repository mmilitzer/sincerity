/**
 * Copyright 2011-2017 Three Crickets LLC.
 * <p>
 * The contents of this file are subject to the terms of the LGPL version 3.0:
 * http://www.gnu.org/copyleft/lesser.html
 * <p>
 * Alternatively, you can obtain a royalty free commercial license with less
 * limitations, transferable or non-transferable, directly from Three Crickets
 * at http://threecrickets.com/
 */

package com.threecrickets.sincerity.plugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.PrintWriter;

import com.threecrickets.sincerity.Command;
import com.threecrickets.sincerity.Container;
import com.threecrickets.sincerity.Plugin1;
import com.threecrickets.sincerity.Sincerity;
import com.threecrickets.sincerity.console.CommandCompleter;
import com.threecrickets.sincerity.exception.NoContainerException;
import com.threecrickets.sincerity.exception.SincerityException;
import com.threecrickets.sincerity.exception.UnknownCommandException;
import com.threecrickets.sincerity.plugin.swing.Console;
import com.threecrickets.sincerity.plugin.swing.Frame;
import com.threecrickets.sincerity.plugin.swing.Splash;
import com.threecrickets.sincerity.plugin.swing.SwingUtil;
import com.threecrickets.sincerity.util.ClassUtil;
import com.threecrickets.sincerity.util.IoUtil;

import jline.console.ConsoleReader;
import jline.console.UserInterruptException;
import jline.console.history.FileHistory;

/**
 * The shell plugin supports the following commands:
 * <ul>
 * <li><b>console</b>: starts the Sincerity console, which is a simple REPL
 * through which Sincerity commands can be run interactively.</li>
 * <li><b>gui</b>: starts the Sincerity GUI, using all available plugins. Note
 * that this command can either run with a container or without one, in which
 * case it would prompt the user to create a new container. Use the --ui=
 * property to change the Look-and-Feel. Some options are "native", "nimbus",
 * "metal", "gtk+" and "cde/motif".</li>
 * </ul>
 * 
 * @author Tal Liron
 * @see Plugin1#gui(Command)
 */
public class ShellPlugin implements Plugin1
{
	//
	// Plugin
	//

	public int getInterfaceVersion()
	{
		return 1;
	}

	public String getName()
	{
		return "shell";
	}

	public String[] getCommands()
	{
		return new String[]
		{
			"console", "gui"
		};
	}

	public void run( final Command command ) throws SincerityException
	{
		String commandName = command.getName();
		Sincerity sincerity = Sincerity.getCurrent();

		if( "console".equals( commandName ) )
		{
			command.setParse( true );
			String scriptString = command.getProperties().get( "script" );
			File script = null;
			if( scriptString != null )
				script = new File( scriptString );

			if( script != null )
			{
				try
				{
					for( String line : IoUtil.readLines( new FileInputStream( script ) ) )
					{
						line = line.trim();
						if( line.isEmpty() || ( line.startsWith( "#" ) ) )
							continue;
						ClassUtil.main( sincerity, Sincerity.class.getCanonicalName(), line.split( " " ) );
					}
					return;
				}
				catch( IOException x )
				{
					throw new SincerityException( x );
				}
			}

			JLineConsole console;
			try
			{
				console = new JLineConsole();
			}
			catch( IOException x )
			{
				sincerity.getErr().println( "Could not access terminal" );
				if( sincerity.getVerbosity() >= 2 )
					x.printStackTrace( sincerity.getErr() );
				return;
			}

			try
			{
				console.controlSequence( "34m" );
				console.out.println( "Sincerity console " + sincerity.getVersion().get( "version" ) );

				Container<?, ?> container = null;
				try
				{
					container = sincerity.getContainer();
					console.out.println( "Container: " + container.getRoot() );
				}
				catch( NoContainerException x )
				{
				}

				console.controlSequence( "0m" );

				FileHistory history = null;
				if( container != null )
				{
					history = new FileHistory( container.getCacheFile( "shell", "console.history" ) );
					console.setHistory( history );
				}

				while( true )
				{
					String line = console.readLine();
					if( line == null )
						break;

					if( history != null )
					{
						try
						{
							history.flush();
						}
						catch( IOException x )
						{
						}
					}

					if( "exit".equals( line ) )
						break;
					else if( "reset".equals( line ) )
					{
						if( history != null )
						{
							try
							{
								history.purge();
								console.controlSequence( "34m" );
								console.out.println( "History reset!" );
								console.controlSequence( "0m" );
							}
							catch( IOException x )
							{
							}
						}
					}

					ClassUtil.main( sincerity, Sincerity.class.getCanonicalName(), line.split( " " ) );
				}
			}
			catch( UserInterruptException x )
			{
			}
			catch( IOException x )
			{
				console.controlSequence( "31m" );
				console.out.println( "Console error" );
				if( sincerity.getVerbosity() >= 2 )
					x.printStackTrace( console.out );
				console.controlSequence( "0m" );
			}
			finally
			{
				console.controlSequence( "34m" );
				console.out.println( "Bye!" );
				console.controlSequence( "0m" );
				console.out.flush();

				try
				{
					if( console != null )
						console.getTerminal().reset();
				}
				catch( Exception x )
				{
					console.controlSequence( "31m" );
					console.out.println( "Could not reset terminal" );
					if( sincerity.getVerbosity() >= 2 )
						x.printStackTrace( console.out );
					console.controlSequence( "0m" );
				}
			}
		}
		else if( "gui".equals( commandName ) )

		{
			// Don't show GUI while console is up
			if( Console.getCurrent() != null )
				return;

			command.setParse( true );

			String ui = command.getProperties().get( "ui" );
			if( ui == null )
				ui = "native";
			SwingUtil.initLookAndFeel( ui );

			new Splash( new Runnable()
			{
				public void run()
				{
					try
					{
						Sincerity sincerity = command.getSincerity();
						Frame frame = sincerity.getFrame();
						if( frame != null )
							frame.dispose();
						frame = new Frame( sincerity );
						sincerity.setFrame( frame );

						for( Plugin1 plugin : sincerity.getPlugins().values() )
						{
							try
							{
								plugin.gui( command );
							}
							catch( NoContainerException x )
							{
							}
						}

						frame.run();
					}
					catch( SincerityException x )
					{
						SwingUtil.error( x );
					}
				}
			} );
		}
		else
			throw new UnknownCommandException( command );

	}

	public void gui( Command command ) throws SincerityException
	{
	}

	// //////////////////////////////////////////////////////////////////////////
	// Private

	private static class JLineConsole extends ConsoleReader
	{
		//
		// Construction
		//

		public JLineConsole() throws IOException
		{
			super();
			ansi = getTerminal().isAnsiSupported();
			out = new PrintWriter( getOutput(), true );
			setPrompt( ansi ? CSI + "32m" + ">" + CSI + "0m" + " " : "> " );
			addCompleter( new CommandCompleter() );
			setHandleUserInterrupt( true );
			setCopyPasteDetection( true );
			setExpandEvents( false );
		}

		//
		// Attributes
		//

		public final PrintWriter out;

		//
		// Operations
		//

		public void controlSequence( CharSequence... args )
		{
			if( !ansi )
				return;
			for( CharSequence c : args )
			{
				out.print( CSI );
				out.print( c );
			}
		}

		// //////////////////////////////////////////////////////////////////////////
		// Private

		/**
		 * ANSI CSI (Control Sequence Introducer).
		 */
		private static final String CSI = "\033[";

		private final boolean ansi;
	}
}
