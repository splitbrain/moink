var request = require('request');
var cheerio = require('cheerio');
var fs      = require('fs');
var path    = require('path');

for (var i=300; i<301; i++){

/*
    var url = 'http://www.atlasobscura.com/places/'+i;

    request(url, function(err, rep, body){
        if(err) return; // ignore errors

    });
*/

    fetchItem(
        i,
        function(id, html){
            parseItem(id, html, function(item){
                console.log(item);
            });
        }
    );
}

/**
 * parse data from the given HTML
 */
function parseItem(id, html, cb){
    var $ = cheerio.load(html);
    var item = {};
    item.id          = id;
    item.url         = $('meta[property="og:url"]').attr('content').trim();

    item.title       = $('h1.title[itemprop=name]').text().trim();
    item.teaser      = $('h2.subtitle[itemprop=description]').text().trim();
    item.location    = $('#item-title div.location').text().trim();
    item.thumbnail   = $('meta[property="og:image"]').attr('content').trim();
    item.directions  = $('#map-wrap div.directions').html().trim();

    item.lat = parseFloat($('meta[itemprop=latitude]').attr('content'));
    item.lon = parseFloat($('[itemprop=longitude]').attr('content'));

    item.description = $('div#description')
    item.description.find('div.share-item').remove();
    item.description.find('div.edit-button').remove();
    item.description = item.description.html().trim();

    item.info = '';
    var infos = $('#item-details ul');
    for(var j=0; j<infos.length; j++){
        item.info += '<ul>'+cheerio(infos[j]).html().trim()+'</ul>';
    }

    item.tags = [];
    var tags = $('.categories a');
    for(var j=0; j<tags.length; j++){
        item.tags.push(cheerio(tags[j]).text().trim());
    }

    cb(item);
}

/**
 * Fetch place with given ID and call callback
 */
function fetchItem(id, cb){
    var cache = path.resolve(__dirname,'cache/'+id+'.html');
    var url = 'http://www.atlasobscura.com/places/'+id;

    // check for cache file
    fs.exists(cache, function(exists){
        if(exists){
            // load cache file and call callback
            fs.readFile(cache, {encoding: 'utf-8'}, function(err, data){
                if(err) throw err;
                cb(id, data);
            });
        }else{
            // load URL
            request(url, function(err, rep, data){
                if(err) return; // we ignore errors (404s etc)

                // write cache and call callback
                fs.writeFile(cache, data, function(err){
                    if(err) throw err;
                    cb(id, data);
                });
            });
        }
    });
}
