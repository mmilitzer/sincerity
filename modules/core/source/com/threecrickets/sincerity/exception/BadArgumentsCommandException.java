package com.threecrickets.sincerity.exception;

public class BadArgumentsCommandException extends CommandException
{
	//
	// Construction
	//

	public BadArgumentsCommandException( String command, String... argumentDescriptions )
	{
		super( command, createMessage( command, argumentDescriptions ) );
	}

	// //////////////////////////////////////////////////////////////////////////
	// Private

	private static final long serialVersionUID = 1L;

	private static String createMessage( String command, String[] argumentDescriptions )
	{
		StringBuilder s = new StringBuilder( "Command " );
		s.append( '"' );
		s.append( command );
		s.append( "\" requires: " );
		for( int length = argumentDescriptions.length, i = 0; i < length; i++ )
		{
			s.append( '[' );
			s.append( argumentDescriptions[i] );
			s.append( ']' );
			if( i < length - 1 )
				s.append( ' ' );
		}
		return s.toString();
	}
}
