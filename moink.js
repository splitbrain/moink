var fs = require('fs');
var path = require('path');

var async = require('async');
var cheerio = require('cheerio');
var data2xml = require('data2xml')();
var request = require('request');

var items = [];
var calls = [];

// add all the possible IDs to our call list
for (var i = 130; i < 8316; i++) { //FIXME top bound is currently newest
    calls.push(fetchItem.bind(null, i));
}
// fetch all the items in parallel and come back here when done
async.parallelLimit(calls, 5, function (err, results) {
    var xml = {
        _attr: {
            'version':            "1.1",
            'xmlns':              "http://www.topografix.com/GPX/1/1",
            'xmlns:xsi':          "http://www.w3.org/2001/XMLSchema-instance",
            'xmlns:gpxtpx':       "http://www.garmin.com/xmlschemas/TrackPointExtension/v1",
            'xsi:schemaLocation': "http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd"
        },
        wpt: results
    };

    process.stdout.write(data2xml('gpx', xml));
});


/**
 * parse data from the given HTML into a waypoint structure
 */
function parseItem(id, html, cb) {
    // clean for XML: http://stackoverflow.com/a/14801798/172068
    var re = /[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm;
    html = html.replace(re, '');


    var $ = cheerio.load(html);
    var item = {};
    item.id         = id;
    item.url        = $('meta[property="og:url"]').attr('content');
    item.title      = $('h1.title[itemprop=name]').text();
    item.teaser     = $('h2.subtitle[itemprop=description]').text();
    item.location   = $('#item-title div.location').text();
    item.thumbnail  = $('meta[property="og:image"]').attr('content');
    item.directions = $('#map-wrap div.directions').html();

    item.lat = parseFloat($('meta[itemprop=latitude]').attr('content'));
    item.lon = parseFloat($('[itemprop=longitude]').attr('content'));

    item.description = $('div#description');
    item.description.find('div.share-item').remove();
    item.description.find('div.edit-button').remove();
    item.description = item.description.html();

    // do we have what we need?
    if(!item.lat || !item.lon || !item.title){
        cb(null);
        return;
    }


    item.info = '';
    var infos = $('#item-details ul');
    for (var j = 0; j < infos.length; j++) {
        item.info += '<ul>' + cheerio(infos[j]).html().trim() + '</ul>';
    }

    item.tags = [];
    var tags = $('.categories a');
    for (var j = 0; j < tags.length; j++) {
        item.tags.push(cheerio(tags[j]).text());
    }

    // assemble into a single HTML page
    item.html = '<p>' + item.teaser + '</p>';
    if(item.thumbnail) item.hmtl += '<img src="' + item.thumbnail + '" align="center">';
    item.html += '<p>' + item.tags.join(', ') + '</p>' +
                 item.description +
                 item.info +
                 item.directions;

    // prepare for XML wpt element
    var xml = {
        _attr: {
            'lat': item.lat,
            'lon': item.lon
        },
        name:  item.title,
        desc:  item.html,
        sym:   'z-favorites'
    };
    if (item.url) {
        xml.link = {
            _attr: { href: item.url },
            text:  item.url
        };
    }

    cb(null, xml);
}

/**
 * Fetch place with given ID and call callback
 */
function fetchItem(id, cb) {
    var cache = path.resolve(__dirname, 'cache/' + id + '.html');
    var url = 'http://www.atlasobscura.com/places/' + id;

    async.waterfall([
        function (cb) {
            // check for cache file
            fs.exists(cache, cb.bind(null, null));
        }, function (exists, cb) {
            if (exists) {
                // load cache file and parse it
                process.stderr.write(cache + "\n");
                fs.readFile(cache, {encoding: 'utf-8'}, cb);
            } else {
                // load URL
                process.stderr.write(url + "\n");
                request(url, function (err, rep, data) {
                    if (err) {
                        // ignore error but don't store empty cache file
                        process.stderr.write("Error: " + err + "\n");
                        cb(null);
                    } else if (rep.statusCode == 200) {
                        // write cache and parse it
                        fs.writeFile(cache, data, function (err) {
                            cb(err, data);
                        });
                    } else {
                        fs.writeFile(cache, ''); // store empty cache file
                        cb(null); // we ignore 404s and return undefined
                    }
                });
            }
        }
    ], function (err, data) {
        if (err) throw err;
        if (data){
            parseItem(id, data, cb);
        } else {
            cb(null); // this was a 404 before, ignore
        }
    });
}
