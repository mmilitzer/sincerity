package com.threecrickets.sincerity;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.threecrickets.sincerity.exception.NoContainerException;
import com.threecrickets.sincerity.exception.SincerityException;

public class Command
{
	//
	// Constants
	//

	public static final String GREEDY_POSTFIX = "!";

	public static final int GREEDY_POSTFIX_LENGTH = GREEDY_POSTFIX.length();

	public static final String SWITCH_PREFIX = "--";

	public static final int SWITCH_PREFIX_LENGTH = SWITCH_PREFIX.length();

	public static final String PROPERTY_SEPARATOR = "=";

	public static final String COMMANDS_SEPARATOR = ":";

	public static final String PLUGIN_COMMAND_SEPARATOR = ":";

	//
	// Construction
	//

	public Command( String plugin, String name, boolean isGreedy, Sincerity sincerity )
	{
		this.plugin = plugin;
		this.name = name;
		this.isGreedy = isGreedy;
		this.sincerity = sincerity;
	}

	public Command( String name, boolean isGreedy, Sincerity sincerity )
	{
		String[] split = name.split( COMMANDS_SEPARATOR, 2 );
		if( split.length == 2 )
		{
			plugin = split[0];
			this.name = split[1];
		}
		else
			this.name = name;

		this.isGreedy = isGreedy;
		this.sincerity = sincerity;
	}

	//
	// Attributes
	//

	public String getName()
	{
		return name;
	}

	public Sincerity getSincerity()
	{
		return sincerity;
	}

	public String[] getArguments() throws SincerityException
	{
		if( arguments == null )
		{
			if( parse )
				parse();
			else
				arguments = rawArguments.toArray( new String[rawArguments.size()] );
		}
		return arguments;
	}

	public Set<String> getSwitches() throws SincerityException
	{
		if( switches == null )
		{
			if( parse )
				parse();
			else
				switches = Collections.emptySet();
		}
		return switches;
	}

	public Map<String, String> getProperties() throws SincerityException
	{
		if( properties == null )
		{
			if( parse )
				parse();
			else
				properties = Collections.emptyMap();
		}
		return properties;
	}

	public boolean getParse()
	{
		return parse;
	}

	public void setParse( boolean parse )
	{
		this.parse = parse;
	}

	public String[] toArguments()
	{
		String[] arguments = new String[rawArguments.size() + 1];
		arguments[0] = toString();
		if( isGreedy )
			arguments[0] += GREEDY_POSTFIX;
		int i = 1;
		for( String argument : rawArguments )
			arguments[i++] = argument;
		return arguments;
	}

	public void remove()
	{
		sincerity.commands.remove( this );
	}

	//
	// Object
	//

	@Override
	public String toString()
	{
		if( plugin == null )
			return name;
		return plugin + PLUGIN_COMMAND_SEPARATOR + name;
	}

	// //////////////////////////////////////////////////////////////////////////
	// Protected

	protected String plugin;

	protected final List<String> rawArguments = new ArrayList<String>();

	// //////////////////////////////////////////////////////////////////////////
	// Private

	private final String name;

	private final boolean isGreedy;

	private final Sincerity sincerity;

	private boolean parse;

	private String[] arguments;

	private Set<String> switches;

	private Map<String, String> properties;

	private void parse() throws SincerityException
	{
		ArrayList<String> arguments = new ArrayList<String>();
		switches = new HashSet<String>();
		properties = new HashMap<String, String>();

		for( String argument : rawArguments )
		{
			if( argument.startsWith( SWITCH_PREFIX ) )
			{
				argument = argument.substring( SWITCH_PREFIX_LENGTH );
				if( argument.length() > 0 )
					switches.add( argument );
			}
			else
			{
				try
				{
					sincerity.getContainer().getShortcuts().addArgument( argument, arguments );
				}
				catch( NoContainerException x )
				{
					arguments.add( argument );
				}
			}
		}

		for( String theSwitch : switches )
		{
			String[] split = theSwitch.split( PROPERTY_SEPARATOR, 2 );
			if( split.length == 2 )
				properties.put( split[0], split[1] );
		}

		this.arguments = arguments.toArray( new String[arguments.size()] );
	}
}
