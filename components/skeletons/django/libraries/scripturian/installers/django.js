
//sincerity.run('delegate:execute', ['easy_install', 'Django==1.2.7', 'django-jython==1.2.0'])

print('\nTo start your Django server, run: "sincerity start django"\n')
print('To manage your Django project, run: "sincerity django:manage"\n\n')

document.executeOnce('/sincerity/files/')

// Let's clear out this file so that we don't get the message again
Sincerity.Files.erase(sincerity.container.getLibrariesFile('scripturian', 'installers', 'django.js'))