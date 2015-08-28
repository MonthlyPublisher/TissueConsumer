String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

if (![].includes) {
  Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {
    'use strict';
    var O = Object(this);
    var len = parseInt(O.length) || 0;
    if (len === 0) {
      return false;
    }
    var n = parseInt(arguments[1]) || 0;
    var k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {k = 0;}
    }
    var currentElement;
    while (k < len) {
      currentElement = O[k];
      if (searchElement === currentElement ||
         (searchElement !== searchElement && currentElement !== currentElement)) {
        return true;
      }
      k++;
    }
    return false;
  };
}

var express = require('express');
var syncreq = require('sync-request');
var monk = require('monk');
var http = require('http');
var fs = require('fs');
var app = express();
var exec = require('child_process').exec, child;

var readCount = 0;
var errCount = 0;

var videos = [];

function readVideo(path, deleteEtc) {
	if (path == '../node_modules' || path == '../ignore' || path == '../server' || path == '../$RECYCLE.BIN') {
		return;
	}

	console.log("[READ VIDEO]][" + deleteEtc + "] " + path);
	if (fs.lstatSync(path).isDirectory() == false) {
		if (e.toLowerCase().endsWith('.mp4') == true
			|| e.toLowerCase().endsWith('.mkv') == true
			|| e.toLowerCase().endsWith('.avi') == true
			|| e.toLowerCase().endsWith('.wmv') == true) {
			videos.push({'filename':e,'path':(__dirname + '\\' + path.replace(/\//g, "\\"))});
		} else if (deleteEtc) {
			if (e.toLowerCase().endsWith('.url') == true
					|| e.toLowerCase().endsWith('.mht') == true
					|| e.toLowerCase().endsWith('.chm') == true
					|| e.toLowerCase().endsWith('.txt') == true) {
				fs.unlinkSync(path + '/' + e);
			}
		}
		return;
	}
	
	console.log("[IS DIRECTORY]]" + path);
	var all = fs.readdirSync(path);
	all.forEach(
		function (value, index, array) {
			e = array[index];
			var t;
			try {
				console.log("[IN DIRECTORY]]" + e);

				if (fs.lstatSync(path + '/' + e).isDirectory() == true) {
					if (path == ".") {
						readVideo(e);
					} else {
						readVideo(path + '/' +  e);
					}
				} else {
					if (e.toLowerCase().endsWith('.mp4') == true
						|| e.toLowerCase().endsWith('.mkv') == true
						|| e.toLowerCase().endsWith('.avi') == true
						|| e.toLowerCase().endsWith('.wmv') == true) {
						videos.push({'filename':e,'path':(__dirname + '\\' + path.replace(/\//g, "\\"))});
					} else if (deleteEtc) {
						if (e.toLowerCase().endsWith('.url') == true
								|| e.toLowerCase().endsWith('.mht') == true
								|| e.toLowerCase().endsWith('.chm') == true
								|| e.toLowerCase().endsWith('.txt') == true) {
							fs.unlinkSync(path + '/' + e);
						}
					}
				}
			} catch (err) {
				console.error(err);
				errCount++;
			}
		}
	);
}

readVideo('..');

console.log("READ : " + videos.length);
console.log("ERR  : " + errCount);

var lots = [];
var notMatched = [];

var url = 'mongodb://localhost:27017/av_info_db';
var avInfoDB = monk(url);
if (!avInfoDB) {
	console.log("db connection failed");
	return;
}
var avInfoCollection = avInfoDB.get('av_info');
var avFailCollection = avInfoDB.get('av_fail');
var avGenreCollection = avInfoDB.get('av_genre');
var avActorCollection = avInfoDB.get('av_actor');

console.log("LOT  : " + lots.length);

var existed = [];
var failFile = [];

avFailCollection.find({}, function(err, docu) {
	if (!err) {
		failFile = docu.map(function(a) {return a.filename;});
	}
	
	videos.forEach(function (value, index, array) {
		if (failFile.includes(value.filename) == true) {
			notMatched.push(value);
			return;
		}
		var matched = value.filename.match(/[a-zA-Z]{2,}[\-\_]?[0-9]{3,}/g);
		if (matched) {
			matched.forEach(function (lot) {
				lot = lot.toUpperCase().replace(/\-/g, "");
				value['lot'] = lot;
				lots.push(value);
			});
		} else {
			failFile.push({'filename' : value.filename});
			avFailCollection.insert({'filepath' : value.path, 'filename' : value.filename});
			notMatched.push(value);
		}
	});

	avInfoCollection.find({}, function(err, docu) {
		existed = docu.map(function(a) {return a.key;});
		startSearch();
	});
});

console.log("find");

function startSearch() {
	lots.forEach(searchLotInfo);
	lots = [];
	videos = [];
	console.log('INIT DONE');
	fs.watch('..', { persistent: true, recursive: true }, function (event, filename) {
		console.log('event is: ' + event);
		if (filename) {
			readVideo('../' + filename, false);
			
			videos.forEach(function (value, index, array) {
				if (failFile.includes(value.filename) == true) {
					notMatched.push(value);
					return;
				}
				var matched = value.filename.match(/[a-zA-Z]{2,}[\-\_]?[0-9]{3,}/g);
				if (matched) {
					matched.forEach(function (lot) {
						lot = lot.toUpperCase().replace(/\-/g, "");
						value['lot'] = lot;
						lots.push(value);
					});
				} else {
					failFile.push({'filename' : value.filename});
					avFailCollection.insert({'filepath' : value.path, 'filename' : value.filename});
					notMatched.push(value);
				}
			});
			
			lots.forEach(searchLotInfo);
			lots = [];
			videos = [];
		}
	});
}

var failSet = new Set();
function searchLotInfo(value, sync) {
	var key = value.lot;

	if (existed.indexOf(key) >= 0) {
		console.log("[" + key + "] already exist");
		return;
	}
	if (failSet.has(key)) {
		console.log("[" + key + "] already failed");
		failFile.push({'filename' : value.filename});
		avFailCollection.insert({'key' : key, 'filepath' : value.path, 'filename' : value.filename});
		return;
	}
	
	console.log("SEND : " + key);
	if (!sync) {
		var postData = 'pid=' + key;
		var reqOptions = {
			  hostname: 'hentaku.net',
			  port: 80,
			  path: '/poombun.php',
			  method: 'POST',
			  headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': postData.length
			  }
			};
		var req = http.request(reqOptions, function(res) {
			console.log(res.statusCode);

			if (res.statusCode == 200) {
				res.setEncoding('utf8');
				res.on('data', function (respBody) {
					parseResult(respBody, key, value);
				});
			}
			
		});
		
		req.write(postData);
		req.end();
	} else {
		var res = 	
			syncreq('POST', 'http://hentaku.net/poombun.php', {
				'body': 'pid=' + key,
				'headers': {
					'Content-Type' : 'application/x-www-form-urlencoded'
				}
			});
	
		var respBody = res.getBody('utf-8');
		parseResult(respBody, key, value);
	}
};

function parseResult(res, key, fileInfo) {
	res = res.replace(/(\r\n|\n|\r|\t)/gm,"");
	var table = res.match(/<table>.+<\/table>/g);
	if (table && table[0]) {
		var imageSrc = '';
		var actor = '';
		try {
			imageSrc = res.match(/<img src="(.+?)"/)[1];
		} catch (error) {
			console.log(key + " has no image.");
		}
		try {
			actor = res.match(/class="avstar_info_b">(.+?)<br/)[1];
			actor = actor.split(" / ");

			if (actor.length == 3) {
				var kor = actor[0];
				var eng = actor[1];
				var jpn = actor[2];
				
				avActorCollection.update({'kor':kor}, {'kor':kor, 'eng':eng, 'jpn':jpn}, {upsert : true}, function(err, docu){});
			}
		} catch (error) {
			console.log(key + " has no title.");
		}
		var find = table[0];
		
		var rows = find.match(/<tr>(.+?)<\/tr>/g);
		var avInfo = 
			{	'key' : key, 
				'image' : imageSrc,
				'actor' : actor,
				'filepath':fileInfo.path, 
				'filename':fileInfo.filename};
		rows.forEach(function(value) {
			var strings = value.match(/<td>(.+?)<\/td>/g);
			if (!strings[0] || !strings[1]) {
				return;
			}
			
			var name = strings[0].replace(/<td>|<\/td>/g, "");
			var value = strings[1].replace(/<td>|<\/td>/g, "");
			

			if (name == '장르') {
				var splited = value.split(" / ");
				splited.forEach(function(value) {
					avGenreCollection.update({'genre' : value}, {'genre' : value}, {upsert : true}, function(err, docu){});		
				});

				avInfo[name] = splited;			
			} else if (name == '발매일') {
				avInfo[name] = new Date(value);				
			} else {
				avInfo[name] = value;				
			}
		});
		
		existed.push(key);
		avInfoCollection.insert(avInfo);
	} else {
		failSet.add(key);
		failFile.push({'filename' : fileInfo.filename});
		avFailCollection.insert({'key' : key, 'filepath' : fileInfo.path, 'filename' : fileInfo.filename});
	}
}

app.get('/genre', function (req, res) {
	avGenreCollection.find({}, {fields : {_id:0, 'genre':1}}, function(err, data) {
		res.json(data);
	})
});

app.get('/actor', function (req, res) {
	avInfoCollection.find({}, {fields : {_id:0, '배우':1}}, function(err, data) {
		res.json(data);
	})
});


app.get('/video', function (req, res) {
	var where = {};
	var noWhere = false;
	if (req.query.genre) {
		var genre = req.query.genre;
		console.log('genre : ' + genre);
		where = { '장르' : new RegExp(genre)};
	} else if (req.query.actor) {
		var actor = req.query.actor;
		console.log('actor : ' + actor);
		where = { '배우' : new RegExp(actor)};
	} else {
		noWhere = true;
	}
	
	var toConcat = [];
	var infoRecved = false;
	var failRecved = false;
	
	if (noWhere) {
		avFailCollection.find({}, function(err, data) {
			if (!err) {
				data.forEach(function(each) {
					var key = 'OID' + each['_id'];
					var title = each.filename;

					if (each.key) {
						title = each.key;
					}
					
					each['title'] = title;
					each['key'] = key;
				});
				toConcat = data.concat(toConcat);
			}
			
			if (infoRecved == true) {
				res.json({'count':toConcat.length, 'data':toConcat});
			} else {
				failRecved = true;
			}
		})
	} else {
		failRecved = true;
	}
	
	avInfoCollection.find(where, {fields : {_id:0}, sort : { '발매일'  : -1}}, function(err, data) {
		if (!err) {
			data.forEach(function(each) {
				var title = each.key;				
				each['title'] = title;
			});
			toConcat = data.concat(toConcat);
		}
		
		if (failRecved == true) {
			res.json({'count':toConcat.length, 'data':toConcat});
		} else {
			infoRecved = true;
		}

	});

});

app.delete('/video/:videoKey', function (req, res) {
	var key = req.params.videoKey;
	avInfoCollection.findOne({'key' : key}, {fields : {_id:0, 'filename':1, 'filepath':1}}, 
		function(err, data) {
			if (err || data == null) {
				res.status(404).send('no info');
			} else {
				console.log(data);
				
				var command = "DEL /F /S /Q /A \"" + data['filepath'] + "\\" + data['filename'] + "\"";
				
				child = exec(command, 
					function(error, stdout, stderr) {
						console.log('stdout: ' + stdout);
						console.log('stderr: ' + stderr);
						if (error != null) {
						  console.log('exec error: ' + error);
							res.status(500).send('ERROR');
						  } else {
							res.status(200).send('OK');
						}
						
						avInfoCollection.remove({'key':key}, function(err, doc) {
							if (!err) {
								console.error(err);
							} else {
								console.log(doc);
							}
						});
					}					
				)	
			}
		});
});


app.get('/video/:videoKey', function (req, res) {
	var key = req.params.videoKey;
	if (key.indexOf('OID') == 0) {
		key = key.substr(3);
		avFailCollection.findOne({'_id' : key}, {fields : {_id:0, 'filename':1, 'filepath':1}}, 
			function(err, data) {
				if (err || data == null) {
					res.status(404).send('no info');
				} else {
					console.log(data);
					
					var command = "\"" + data['filepath'] + "\\" + data['filename'] + "\"";
					
					child = exec(command, 
						function(error, stdout, stderr) {
							console.log('stdout: ' + stdout);
							console.log('stderr: ' + stderr);
							if (error != null) {
							  console.log('exec error: ' + error);
								res.status(500).send('ERROR');
							  } else {
								res.status(200).send('OK');
							}
						}
					)			
				}
			}
			);
	} else {
		avInfoCollection.findOne({'key' : key}, {fields : {_id:0, 'filename':1, 'filepath':1}}, 
			function(err, data) {
				if (err || data == null) {
					res.status(404).send('no info');
				} else {
					console.log(data);
					
					var command = "\"" + data['filepath'] + "\\" + data['filename'] + "\"";
					
					child = exec(command, 
						function(error, stdout, stderr) {
							console.log('stdout: ' + stdout);
							console.log('stderr: ' + stderr);
							if (error != null) {
							  console.log('exec error: ' + error);
								res.status(500).send('ERROR');
							  } else {
								res.status(200).send('OK');
							}
						}
					)			
				}
			}
			);
		}
	}
);


app.post('/video/:videoKey', function (req, res) {
	var key = req.params.videoKey;
	avInfoCollection.findOne({'key' : key}, {fields : {_id:0, 'filename':1, 'filepath':1}}, 
		function(err, data) {
			if (err || data == null) {
				res.status(404).send('no info');
			} else {
				console.log(data);
				
				var command = "start explorer /select,\"" + data['filepath'] + "\\" + data['filename'] + "\"";
				
				child = exec(command, 
					function(error, stdout, stderr) {
						console.log('stdout: ' + stdout);
						console.log('stderr: ' + stderr);
						if (error != null) {
						  console.log('exec error: ' + error);
							res.status(500).send('ERROR');
						  } else {
							res.status(200).send('OK');
						}
					}
				);
			}
		});
});

app.get('/c/*', function (req, res) {
	var path = req.originalUrl.substr(3);
	if (path.length == 0) {
		path = 'index.html';
	}
	
	var fullpath = __dirname + '/client/' + path;
	console.log(fullpath);

	fs.exists(fullpath, function (exists) {
		console.log(fullpath + ' exist? : ' + exists);
		if (exists) {
			res.sendFile(fullpath);					
		} else {
			res.writeHead(404);
			res.end(); 
		}
	});
});

port = process.argv[2];
console.log('port : ' + port);
app.listen(process.argv[2]);

