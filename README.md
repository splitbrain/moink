Moink
=====

![moink](moink.png)

Moink converts all the places described in the [Atlas Obscura](http://www.atlasobscura.com) to a GPX file ready to import in your favorite Mapping application (which really should be [Locus](http://www.locusmap.eu/)).


## Setup and Usage ##

Install the required node packages via npm:

```
npm install
```

Then run the script and redirect the output to a file:

```
node moink.js > atlasobscura.gpx
```

## Note ##

This is not something official by Atlas Obscura. Don't be a dick. Don't redistribute their content. This is just for personal use.

Oh and it's the first thing I ever did in node.js, so use it at your own risk.

## Todo ##

- [ ] figure out the maximum ID automatically (currently hardcoded)
- [ ] have an option to filter for country
- [ ] have an option to embed images as data uri