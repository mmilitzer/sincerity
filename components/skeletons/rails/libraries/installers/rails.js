
// See: http://blog.rubyrockers.com/2011/03/rails3-application-jruby/

sincerity.run('ruby:gem', ['install', 'rails'])
sincerity.run('delegate:execute', ['rails', 'new', sincerity.container.getFile('app'), '--database=jdbcsqlite3', '--template=http://jruby.org/rails3.rb', '--ruby=' + sincerity.container.getExecutablesFile('ruby')])

print('\nTo start your Rails server, run: "sincerity start rails"\n\n')

document.executeOnce('/sincerity/files/')

// Let's clear out this file so that we don't get the message again
Sincerity.Files.erase(sincerity.container.getLibrariesFile('installers', 'rails.js'))
