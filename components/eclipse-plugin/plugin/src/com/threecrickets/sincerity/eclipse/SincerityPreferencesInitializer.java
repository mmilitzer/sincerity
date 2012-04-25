package com.threecrickets.sincerity.eclipse;

import org.eclipse.core.runtime.preferences.AbstractPreferenceInitializer;

public class SincerityPreferencesInitializer extends AbstractPreferenceInitializer
{
	//
	// AbstractPreferenceInitializer
	//

	@Override
	public void initializeDefaultPreferences()
	{
		String home = System.getProperty( HOME_PROPERTY );
		if( home == null )
			home = System.getenv( HOME_VARIABLE );
		if( home != null )
			SincerityPlugin.getDefault().getPreferenceStore().setDefault( SincerityPlugin.SINCERITY_HOME_ATTRIBUTE, home );
	}

	// //////////////////////////////////////////////////////////////////////////
	// Private

	private static final String HOME_PROPERTY = "sincerity.home";

	private static final String HOME_VARIABLE = "SINCERITY_HOME";
}