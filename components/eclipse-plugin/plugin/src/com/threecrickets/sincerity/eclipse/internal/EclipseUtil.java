package com.threecrickets.sincerity.eclipse.internal;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import org.eclipse.core.resources.ICommand;
import org.eclipse.core.resources.IProject;
import org.eclipse.core.resources.IProjectDescription;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IAdaptable;
import org.eclipse.core.runtime.ILog;
import org.eclipse.core.runtime.IStatus;
import org.eclipse.core.runtime.NullProgressMonitor;
import org.eclipse.core.runtime.Status;
import org.eclipse.debug.core.ILaunchManager;
import org.eclipse.debug.core.Launch;
import org.eclipse.jdt.core.IClasspathContainer;
import org.eclipse.jdt.core.IClasspathEntry;
import org.eclipse.jdt.core.IJavaProject;
import org.eclipse.jdt.core.JavaCore;
import org.eclipse.jdt.core.JavaModelException;
import org.eclipse.jdt.launching.IVMInstall;
import org.eclipse.jdt.launching.IVMRunner;
import org.eclipse.jdt.launching.VMRunnerConfiguration;
import org.eclipse.jface.viewers.ISelection;
import org.eclipse.jface.viewers.IStructuredSelection;
import org.eclipse.swt.SWT;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Combo;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Group;
import org.eclipse.swt.widgets.Shell;

import com.threecrickets.sincerity.eclipse.SincerityClasspathContainer;

public abstract class EclipseUtil
{
	public static List<IProject> getSelectedProjects( ISelection selection, boolean hasNature, String nature ) throws CoreException
	{
		ArrayList<IProject> projects = new ArrayList<IProject>();
		if( selection instanceof IStructuredSelection )
		{
			for( Iterator<?> i = ( (IStructuredSelection) selection ).iterator(); i.hasNext(); )
			{
				Object object = i.next();
				if( object instanceof IAdaptable )
				{
					IProject project = (IProject) ( (IAdaptable) object ).getAdapter( IProject.class );
					if( ( project != null ) && ( ( nature == null ) || ( hasNature ? project.getNature( nature ) != null : project.getNature( nature ) == null ) ) )
						projects.add( project );
				}
			}
		}
		return projects;
	}

	public static void addNature( IProject project, String id ) throws CoreException
	{
		IProjectDescription projectDescription = project.getDescription();
		String[] natureIds = projectDescription.getNatureIds();
		String[] newNatureIds = new String[natureIds.length + 1];
		System.arraycopy( natureIds, 0, newNatureIds, 0, natureIds.length );
		newNatureIds[natureIds.length] = id;
		projectDescription.setNatureIds( newNatureIds );
		project.setDescription( projectDescription, null );
	}

	public static void removeNature( IProject project, String id ) throws CoreException
	{
		IProjectDescription projectDescription = project.getDescription();
		String[] natureIds = projectDescription.getNatureIds();
		for( int i = 0, length = natureIds.length; i < length; i++ )
		{
			if( natureIds[i].equals( id ) )
			{
				String[] newNatureIds = new String[length - 1];
				System.arraycopy( natureIds, 0, newNatureIds, 0, i );
				System.arraycopy( natureIds, i + 1, newNatureIds, i, length - i - 1 );
				projectDescription.setNatureIds( newNatureIds );
				project.setDescription( projectDescription, null );
				return;
			}
		}
	}

	public static void addBuilder( IProject project, String id ) throws CoreException
	{
		IProjectDescription projectDescription = project.getDescription();

		ICommand[] commands = projectDescription.getBuildSpec();
		for( ICommand command : commands )
		{
			if( command.getBuilderName().equals( id ) )
				return;
		}

		ICommand[] newCommands = new ICommand[commands.length + 1];
		System.arraycopy( commands, 0, newCommands, 0, commands.length );
		ICommand command = projectDescription.newCommand();
		command.setBuilderName( id );
		newCommands[newCommands.length - 1] = command;
		projectDescription.setBuildSpec( newCommands );
		project.setDescription( projectDescription, null );
	}

	public static void removeBuilder( IProject project, String id ) throws CoreException
	{
		IProjectDescription projectDescription = project.getDescription();

		ICommand[] commands = projectDescription.getBuildSpec();
		for( int i = 0, length = commands.length; i < length; i++ )
		{
			if( commands[i].getBuilderName().equals( id ) )
			{
				ICommand[] newCommands = new ICommand[length - 1];
				System.arraycopy( commands, 0, newCommands, 0, i );
				System.arraycopy( commands, i + 1, newCommands, i, length - i - 1 );
				projectDescription.setBuildSpec( newCommands );
				project.setDescription( projectDescription, null );
				return;
			}
		}
	}

	public static void addClasspathContainer( IJavaProject project, IClasspathContainer container ) throws JavaModelException
	{
		IClasspathEntry[] entries = project.getRawClasspath();

		for( IClasspathEntry entry : entries )
			if( ( entry.getEntryKind() == IClasspathEntry.CPE_CONTAINER ) && ( entry.getPath().equals( container.getPath() ) ) )
				return;

		JavaCore.setClasspathContainer( SincerityClasspathContainer.ID, new IJavaProject[]
		{
			project
		}, new IClasspathContainer[]
		{
			container
		}, null );

		IClasspathEntry[] newEntries = new IClasspathEntry[entries.length + 1];
		System.arraycopy( entries, 0, newEntries, 0, entries.length );
		newEntries[entries.length] = JavaCore.newContainerEntry( container.getPath() );

		project.setRawClasspath( newEntries, new NullProgressMonitor() );
	}

	public static void log( ILog log, String id, int severity, Throwable x )
	{
		log.log( new Status( severity, id, IStatus.OK, x.getMessage(), x ) );
	}

	public static void log( ILog log, String id, int severity, String message )
	{
		log.log( new Status( severity, id, IStatus.OK, message, null ) );
	}

	public static Composite createComposite( Composite parent, int columns, int hspan, boolean grabExcessHorizontalSpace, boolean grabExcessVerticalSpace )
	{
		Composite composite = new Composite( parent, SWT.NONE );
		GridLayout layout = new GridLayout( columns, false );
		composite.setLayout( layout );
		composite.setFont( parent.getFont() );
		GridData data = new GridData( SWT.BEGINNING, SWT.BEGINNING, grabExcessHorizontalSpace, grabExcessVerticalSpace );
		data.horizontalSpan = hspan;
		composite.setLayoutData( data );
		return composite;
	}

	public static Composite createComposite( Composite parent )
	{
		return createComposite( parent, 1, 1, false, false );
	}

	public static Group createGroup( Composite parent, String text, int columns, int hspan, boolean grabExcessHorizontalSpace, boolean grabExcessVerticalSpace )
	{
		Group group = new Group( parent, SWT.NONE );
		GridLayout layout = new GridLayout( columns, false );
		group.setLayout( layout );
		group.setText( text );
		group.setFont( parent.getFont() );
		GridData data = new GridData( SWT.BEGINNING, SWT.BEGINNING, grabExcessHorizontalSpace, grabExcessVerticalSpace );
		data.horizontalSpan = hspan;
		group.setLayoutData( data );
		return group;
	}

	public static Combo createCombo( Composite parent, int style, int hspan, int fill, String[] items )
	{
		Combo combo = new Combo( parent, style );
		combo.setFont( parent.getFont() );
		GridData data = new GridData( fill );
		data.horizontalSpan = hspan;
		combo.setLayoutData( data );
		if( items != null )
			combo.setItems( items );
		combo.select( 0 );
		return combo;
	}

	public static void run( IVMInstall install, String[] classpath, String mainClass, String... arguments ) throws CoreException
	{
		IVMRunner runner = install.getVMRunner( ILaunchManager.RUN_MODE );
		VMRunnerConfiguration configuration = new VMRunnerConfiguration( mainClass, classpath );
		configuration.setProgramArguments( arguments );
		Launch launch = new Launch( null, ILaunchManager.RUN_MODE, null );
		runner.run( configuration, launch, new NullProgressMonitor() );
	}

	public static void waitUntilDisposed( Shell shell )
	{
		while( !shell.isDisposed() )
			if( !shell.getDisplay().readAndDispatch() )
				shell.getDisplay().sleep();
	}

	// //////////////////////////////////////////////////////////////////////////
	// Private

	private EclipseUtil()
	{
	}
}
