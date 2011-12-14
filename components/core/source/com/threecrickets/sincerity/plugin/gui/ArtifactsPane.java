package com.threecrickets.sincerity.plugin.gui;

import java.awt.GridLayout;

import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTree;
import javax.swing.tree.DefaultMutableTreeNode;

import com.threecrickets.sincerity.Dependencies;
import com.threecrickets.sincerity.ResolvedDependency;
import com.threecrickets.sincerity.exception.SincerityException;

public class ArtifactsPane extends JPanel
{
	public ArtifactsPane( Dependencies dependencies ) throws SincerityException
	{
		super( new GridLayout( 1, 1 ) );

		DefaultMutableTreeNode root = new DefaultMutableTreeNode( "Root" );
		for( ResolvedDependency resolvedDependency : dependencies.getResolvedDependencies().getInstalledDependencies() )
			GuiUtil.addDependency( resolvedDependency, root, dependencies, false, false, true );

		JTree tree = new JTree( root );
		GuiUtil.expandTree( tree, true );

		JScrollPane scrollableTree = new JScrollPane( tree );
		add( scrollableTree );

		tree.setRootVisible( false );
	}

	// //////////////////////////////////////////////////////////////////////////
	// Private

	private static final long serialVersionUID = 1L;
}