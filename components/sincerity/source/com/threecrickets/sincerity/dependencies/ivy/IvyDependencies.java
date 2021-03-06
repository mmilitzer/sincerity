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

package com.threecrickets.sincerity.dependencies.ivy;

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.ListIterator;
import java.util.Map;
import java.util.Set;

import org.apache.ivy.Ivy;
import org.apache.ivy.core.LogOptions;
import org.apache.ivy.core.cache.ResolutionCacheManager;
import org.apache.ivy.core.module.descriptor.DefaultDependencyDescriptor;
import org.apache.ivy.core.module.descriptor.DefaultExcludeRule;
import org.apache.ivy.core.module.descriptor.DefaultModuleDescriptor;
import org.apache.ivy.core.module.descriptor.DependencyDescriptor;
import org.apache.ivy.core.module.descriptor.ExcludeRule;
import org.apache.ivy.core.module.descriptor.OverrideDependencyDescriptorMediator;
import org.apache.ivy.core.module.id.ArtifactId;
import org.apache.ivy.core.module.id.ModuleId;
import org.apache.ivy.core.module.id.ModuleRevisionId;
import org.apache.ivy.core.report.ArtifactDownloadReport;
import org.apache.ivy.core.report.ResolveReport;
import org.apache.ivy.core.resolve.ResolveOptions;
import org.apache.ivy.plugins.matcher.ExactPatternMatcher;
import org.apache.ivy.plugins.matcher.MapMatcher;
import org.apache.ivy.plugins.matcher.PatternMatcher;
import org.apache.ivy.plugins.parser.ModuleDescriptorParser;
import org.apache.ivy.plugins.parser.ModuleDescriptorParserRegistry;
import org.apache.ivy.plugins.parser.xml.XmlModuleDescriptorWriter;
import org.apache.ivy.plugins.report.XmlReportParser;
import org.apache.ivy.plugins.repository.url.URLResource;

import com.threecrickets.sincerity.Container;
import com.threecrickets.sincerity.dependencies.Dependencies;
import com.threecrickets.sincerity.dependencies.Module;
import com.threecrickets.sincerity.dependencies.Modules;
import com.threecrickets.sincerity.exception.SincerityException;
import com.threecrickets.sincerity.packaging.Artifact;
import com.threecrickets.sincerity.packaging.ArtifactManager;
import com.threecrickets.sincerity.packaging.Package;
import com.threecrickets.sincerity.packaging.Packages;
import com.threecrickets.sincerity.util.XmlUtil;

/**
 * The Ivy configuration is stored in
 * "/configuration/sincerity/dependencies.conf". For low-level access to the Ivy
 * descriptors, see {@link #getDependencyDescriptors()}.
 * 
 * @author Tal Liron
 */
public class IvyDependencies extends Dependencies<IvyModule>
{
	//
	// Attributes
	//

	/**
	 * The Ivy {@link DependencyDescriptor} instances for the explicit
	 * dependencies.
	 * 
	 * @return The dependency descriptors
	 */
	public DependencyDescriptor[] getDependencyDescriptors()
	{
		return moduleDescriptor.getDependencies();
	}

	/**
	 * The Ivy resolution report file, from the last {@link #resolve()}.
	 * 
	 * @return The resolution report file
	 */
	public File getResolutionReportFile()
	{
		ivy.pushContext();
		ResolutionCacheManager resolutionCache;
		try
		{
			resolutionCache = ivy.getResolutionCacheManager();
		}
		finally
		{
			ivy.popContext();
		}
		String resolveId = ResolveOptions.getDefaultResolveId( moduleDescriptor );
		return resolutionCache.getConfigurationResolveReportInCache( resolveId, "default" );
	}

	//
	// Dependencies
	//

	@Override
	public boolean hasExplicitDependency( String group, String name, String version )
	{
		for( DependencyDescriptor dependency : moduleDescriptor.getDependencies() )
		{
			ModuleRevisionId id = dependency.getDependencyRevisionId();
			if( group.equals( id.getOrganisation() ) && name.equals( id.getName() ) && ( ( version == null ) || ( version.equals( id.getRevision() ) ) ) )
				return true;
		}
		return false;
	}

	@Override
	public Modules<IvyModule> getModules() throws SincerityException
	{
		if( modules == null )
			modules = new IvyModules( this );
		return modules;
	}

	@Override
	public Set<Artifact> getArtifacts( boolean install, boolean overwrite, boolean verify ) throws SincerityException
	{
		HashSet<Artifact> artifacts = new HashSet<Artifact>();
		Container<?, ?> container = getContainer();
		Packages packages = getPackages();
		ArtifactManager artifactManager = getArtifactManager();

		try
		{
			for( ArtifactDownloadReport downloadReport : getDownloadReports() )
			{
				if( downloadReport.getLocalFile() != null )
				{
					Artifact artifact = new Artifact( downloadReport.getLocalFile().getAbsoluteFile(), null, false, container.createPackagingContext() );
					artifacts.add( artifact );
					artifactManager.add( artifact, true, null );
				}
			}

			for( Package pack : packages )
			{
				for( Artifact artifact : pack )
				{
					if( install )
						artifactManager.add( artifact, true, artifact.unpack( artifactManager, overwrite, verify ) );
					else
						artifactManager.add( artifact, false, null );

					artifacts.add( artifact );
				}
			}
		}
		finally
		{
			artifactManager.save();
		}

		if( install )
			for( Package pack : packages )
				pack.install();

		return artifacts;
	}

	@Override
	public List<File> getClasspaths( boolean includeSystem ) throws SincerityException
	{
		List<File> classpaths = super.getClasspaths( includeSystem );

		// Downloaded artifacts
		for( ArtifactDownloadReport artifact : getDownloadReports() )
		{
			if( "jar".equals( artifact.getType() ) )
			{
				File file = artifact.getLocalFile();
				if( file != null )
				{
					file = file.getAbsoluteFile();
					if( !classpaths.contains( file ) )
						classpaths.add( file );
				}
			}
		}

		// for( File f : classpaths )
		// System.out.println( f );

		return classpaths;
	}

	@Override
	public void reset() throws SincerityException
	{
		ivy.pushContext();
		try
		{
			moduleDescriptor = DefaultModuleDescriptor.newDefaultInstance( moduleDescriptor.getModuleRevisionId() );
			File resolutionReport = getResolutionReportFile();
			if( resolutionReport.exists() )
				resolutionReport.delete();
		}
		finally
		{
			ivy.popContext();
		}
		save();
	}

	@Override
	public boolean addExplicitDependency( String group, String name, String version, boolean force, boolean transitive ) throws SincerityException
	{
		if( hasExplicitDependency( group, name ) )
			return false;

		ModuleRevisionId id = ModuleRevisionId.newInstance( group, name, version );
		DefaultDependencyDescriptor dependency = new DefaultDependencyDescriptor( moduleDescriptor, id, force, false, transitive );
		dependency.addDependencyConfiguration( "default", "*" );
		moduleDescriptor.addDependency( dependency );

		save();

		return true;
	}

	@Override
	public boolean reviseExplicitDependency( String group, String name, String newVersion ) throws SincerityException
	{
		List<DependencyDescriptor> dependencies = new ArrayList<DependencyDescriptor>( Arrays.asList( moduleDescriptor.getDependencies() ) );
		boolean changed = false;
		for( ListIterator<DependencyDescriptor> i = dependencies.listIterator(); i.hasNext(); )
		{
			DependencyDescriptor dependency = i.next();
			ModuleRevisionId id = dependency.getDependencyRevisionId();
			if( group.equals( id.getOrganisation() ) && name.equals( id.getName() ) && !newVersion.equals( id.getRevision() ) )
			{
				i.remove();
				i.add( dependency );
				changed = true;
				break;
			}
		}

		if( !changed )
			return false;

		ivy.pushContext();
		try
		{
			moduleDescriptor = DefaultModuleDescriptor.newDefaultInstance( moduleDescriptor.getModuleRevisionId() );
			for( DependencyDescriptor dependency : dependencies )
				moduleDescriptor.addDependency( dependency );
		}
		finally
		{
			ivy.popContext();
		}

		save();

		return true;
	}

	@Override
	public boolean removeExplicitDependency( String group, String name ) throws SincerityException
	{
		List<DependencyDescriptor> dependencies = new ArrayList<DependencyDescriptor>( Arrays.asList( moduleDescriptor.getDependencies() ) );
		boolean removed = false;
		for( Iterator<DependencyDescriptor> i = dependencies.iterator(); i.hasNext(); )
		{
			ModuleRevisionId id = i.next().getDependencyRevisionId();
			if( group.equals( id.getOrganisation() ) && name.equals( id.getName() ) )
			{
				i.remove();
				removed = true;
				break;
			}
		}

		if( !removed )
			return false;

		ivy.pushContext();
		try
		{
			moduleDescriptor = DefaultModuleDescriptor.newDefaultInstance( moduleDescriptor.getModuleRevisionId() );
			for( DependencyDescriptor dependency : dependencies )
				moduleDescriptor.addDependency( dependency );
		}
		finally
		{
			ivy.popContext();
		}

		save();

		return true;
	}

	@Override
	public boolean excludeDependency( String group, String name ) throws SincerityException
	{
		for( ExcludeRule exclude : moduleDescriptor.getExcludeRules( CONFIGURATIONS ) )
		{
			ModuleId id = exclude.getId().getModuleId();
			if( group.equals( id.getOrganisation() ) && name.equals( id.getName() ) )
				return false;
		}

		ArtifactId id = new ArtifactId( new ModuleId( group, name ), PatternMatcher.ANY_EXPRESSION, PatternMatcher.ANY_EXPRESSION, PatternMatcher.ANY_EXPRESSION );
		DefaultExcludeRule exclude = new DefaultExcludeRule( id, new ExactPatternMatcher(), null );
		exclude.addConfiguration( "default" );
		moduleDescriptor.addExcludeRule( exclude );

		save();

		return true;
	}

	@Override
	public boolean overrideDependency( String group, String name, String version ) throws SincerityException
	{
		@SuppressWarnings("unchecked")
		Map<MapMatcher, Object> rules = moduleDescriptor.getAllDependencyDescriptorMediators().getAllRules();
		for( MapMatcher matcher : rules.keySet() )
		{
			String matcherGroup = (String) matcher.getAttributes().get( "organisation" );
			String matcherName = (String) matcher.getAttributes().get( "module" );
			if( group.equals( matcherGroup ) && name.equals( matcherName ) )
				return false;
		}

		moduleDescriptor.addDependencyDescriptorMediator( new ModuleId( group, name ), new ExactPatternMatcher(), new OverrideDependencyDescriptorMediator( null, version ) );
		save();
		return true;
	}

	@Override
	public void freezeVersions() throws SincerityException
	{
		Container<?, ?> container = getContainer();
		if( container.getSincerity().getVerbosity() >= 1 )
			container.getSincerity().getOut().println( "Freezing versions of all installed dependencies" );

		for( IvyModule module : getModules() )
			freezeVersions( module );
	}

	@Override
	public void install( boolean overwrite, boolean verify ) throws SincerityException
	{
		Container<?, ?> container = getContainer();
		int installations = container.getInstallations();
		if( installations == 0 )
			container.getSincerity().getOut().println( "Making sure all dependencies are installed and upgraded..." );

		container.initializeProgress();

		// Resolve
		if( resolve().hasChanged() )
			container.setChanged( true );

		/*
		 * for( ResolvedDependency r : getResolvedDependencies().getAll() ) {
		 * System.out.println(r.descriptor.getRevision()); }
		 */

		/*
		 * for( DependencyDescriptor dependencyDescriptor : getDescriptors() ) {
		 * if( "python".equals(
		 * dependencyDescriptor.getDependencyId().getOrganisation() ) )
		 * System.out.println( dependencyDescriptor + " " +
		 * dependencyDescriptor.getExtraAttribute( "installed" ) ); }
		 */

		if( container.hasChanged() )
		{
			container.updateBootstrap();

			// Install and prune unnecessary artifacts
			getArtifactManager().prune( getArtifacts( true, overwrite, verify ) );

			if( container.hasFinishedInstalling() )
				printDisclaimer( container.getSincerity().getOut() );
		}
		else
		{
			// Just handle artifact installations
			getArtifacts( true, overwrite, verify );

			if( container.hasFinishedInstalling() )
				container.getSincerity().getOut().println( "Dependencies have not changed since last install" );
		}

		container.updateBootstrap();

		container.addInstallation();
	}

	// //////////////////////////////////////////////////////////////////////////
	// Protected

	/**
	 * Parses the Ivy module descriptor, and loads the managed artifacts
	 * database.
	 * 
	 * @param ivyFile
	 *        The Ivy module descriptor file (usually
	 *        "/configuration/sincerity/dependencies.conf")
	 * @param artifactsFile
	 *        The managed artifacts database file (usually
	 *        "/configuration/sincerity/artifacts.conf")
	 * @param container
	 *        The container
	 * @throws SincerityException
	 *         In case of an error
	 */
	protected IvyDependencies( File ivyFile, File artifactsFile, IvyContainer container ) throws SincerityException
	{
		super( artifactsFile, container );
		this.ivyFile = ivyFile;
		ivy = container.getIvy();

		// Module
		if( ivyFile.exists() )
		{
			ivy.pushContext();
			try
			{
				URL ivyUrl = ivyFile.toURI().toURL();
				URLResource resource = new URLResource( ivyUrl );
				ModuleDescriptorParser parser = ModuleDescriptorParserRegistry.getInstance().getParser( resource );
				moduleDescriptor = (DefaultModuleDescriptor) parser.parseDescriptor( ivy.getSettings(), ivyUrl, true );
			}
			catch( MalformedURLException x )
			{
				throw new RuntimeException( x );
			}
			catch( ParseException x )
			{
				throw new SincerityException( "Could not parse dependencies configuration: " + ivyFile, x );
			}
			catch( IOException x )
			{
				throw new SincerityException( "Could not read dependencies configuration: " + ivyFile, x );
			}
			finally
			{
				ivy.popContext();
			}
		}
		else
		{
			ivy.pushContext();
			try
			{
				moduleDescriptor = DefaultModuleDescriptor.newDefaultInstance( ModuleRevisionId.newInstance( "threecrickets", "sincerity-container", "working" ) );
			}
			finally
			{
				ivy.popContext();
			}
		}

		// Default resolve options
		defaultResolveOptions = new ResolveOptions();
		defaultResolveOptions.setResolveMode( ResolveOptions.RESOLVEMODE_DYNAMIC );
		defaultResolveOptions.setConfs( CONFIGURATIONS );
		defaultResolveOptions.setCheckIfChanged( true );
		defaultResolveOptions.setLog( container.getSincerity().getVerbosity() >= 1 ? LogOptions.LOG_DEFAULT : LogOptions.LOG_QUIET );
	}

	// //////////////////////////////////////////////////////////////////////////
	// Private

	private static final String[] CONFIGURATIONS = new String[]
	{
		"default"
	};

	private final File ivyFile;

	private final Ivy ivy;

	private final ResolveOptions defaultResolveOptions;

	private DefaultModuleDescriptor moduleDescriptor;

	private IvyModules modules;

	/**
	 * Ivy resolve: checks explicit dependencies' metadata, resolves implicit
	 * dependency tree, downloads new dependencies, removes unused dependencies,
	 * creates resolution report.
	 * 
	 * @return The resolve report
	 * @throws SincerityException
	 *         In case of an error
	 */
	private ResolveReport resolve() throws SincerityException
	{
		ivy.pushContext();
		try
		{
			ResolveReport report = ivy.resolve( moduleDescriptor, defaultResolveOptions );
			if( report.hasError() )
				throw new SincerityException( "Some dependencies could not be installed" );
			return report;

		}
		catch( ParseException x )
		{
			throw new SincerityException( "Parsing error while resolving dependencies", x );
		}
		catch( IOException x )
		{
			throw new SincerityException( "I/O error while resolving dependencies", x );
		}
		finally
		{
			ivy.popContext();
		}
	}

	/**
	 * Sets the required versions of all explicit and implicit dependencies to
	 * the those that were last resolved.
	 * 
	 * @param module
	 *        The resolved dependency
	 * @throws SincerityException
	 *         In case of an error
	 */
	private void freezeVersions( IvyModule module ) throws SincerityException
	{
		Container<?, ?> container = getContainer();
		if( module.isEvicted() )
		{
			if( container.getSincerity().getVerbosity() >= 2 )
				container.getSincerity().getOut().println( "Not freezing: " + module );
			return;
		}

		if( module.isExplicitDependency() )
		{
			if( container.getSincerity().getVerbosity() >= 2 )
				container.getSincerity().getOut().println( "Freezing explicit: " + module );
			reviseExplicitDependency( module.getGroup(), module.getName(), module.getVersion() );
		}
		else
		{
			if( container.getSincerity().getVerbosity() >= 2 )
				container.getSincerity().getOut().println( "Freezing implicit: " + module );
			overrideDependency( module.getGroup(), module.getName(), module.getVersion() );
		}

		for( Module child : module.getChildren() )
			freezeVersions( (IvyModule) child );
	}

	/**
	 * Saves the Ivy module descriptor file (usually
	 * "/configuration/sincerity/dependencies.conf").
	 * 
	 * @throws SincerityException
	 *         In case of an error
	 */
	private void save() throws SincerityException
	{
		try
		{
			XmlModuleDescriptorWriter.write( moduleDescriptor, XmlUtil.COMMENT_FULL, ivyFile );
		}
		catch( IOException x )
		{
			throw new SincerityException( "Could not write to dependencies configuration: " + ivyFile, x );
		}
	}

	/**
	 * Parses the Ivy resolution report from the last {@link #resolve()}.
	 * 
	 * @return The report parser
	 * @throws SincerityException
	 *         In case of an error
	 * @see #getResolutionReportFile()
	 */
	private XmlReportParser getParsedResolutionReport() throws SincerityException
	{
		File reportFile = getResolutionReportFile();
		if( reportFile.exists() )
		{
			XmlReportParser parser = new XmlReportParser();
			try
			{
				parser.parse( reportFile );
			}
			catch( ParseException x )
			{
				throw new SincerityException( "Could not parse resolution report: " + reportFile, x );
			}
			return parser;
		}
		return null;
	}

	/**
	 * The Ivy download reports from the last {@link #resolve()}.
	 * 
	 * @return The download reports
	 * @throws SincerityException
	 *         In case of an error
	 */
	private Set<ArtifactDownloadReport> getDownloadReports() throws SincerityException
	{
		HashSet<ArtifactDownloadReport> artifacts = new HashSet<ArtifactDownloadReport>();
		XmlReportParser parser = getParsedResolutionReport();
		if( parser != null )
			artifacts.addAll( Arrays.asList( parser.getArtifactReports() ) );
		return artifacts;
	}
}
