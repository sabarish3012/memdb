'use strict';

// npm install memdb, bluebird
// run with node >= 0.12 with --harmony option

var memdb = require('memdb');
var mdbgoose = memdb.goose;
var P = require('bluebird');

// memdb's config
var config = {
    //shard Id (Must unique and immutable for each shard)
    shard : 's1',
    // Center backend storage, must be same for all shards
    backend : {engine : 'mongodb', url : 'mongodb://localhost/memdb-test'},
    // Center redis used for backendLock, must be same for all shards
    redis : {host : '127.0.0.1', port : 6379},
    // Redis data replication (for current shard)
    slave : {host : '127.0.0.1', port : 6379, db : 1},
};

// Define player schema
var playerSchema = new mdbgoose.Schema({
	_id : String,
	name : String,
    areaId : {type : Number, index : true, indexIgnore : [-1, null]},
	deviceType : {type : Number, indexIgnore : [-1, null]},
    deviceId : {type : String, indexIgnore : ['', null]},
    items : [mdbgoose.SchemaTypes.Mixed],
}, {collection : 'player'});
// Define a compound unique index
playerSchema.index({deviceType : 1, deviceId : 1}, {unique : true});

// Define player model
var Player = mdbgoose.model('player', playerSchema);

var main = P.coroutine(function*(){
    // Parse mdbgoose schema to collection config
    config.collections = mdbgoose.genCollectionConfig();

    // Start a memdb shard with in-process mode
    yield memdb.startServer(config);

    // Execute in a transaction
	yield mdbgoose.transaction(P.coroutine(function*(){
		var player = new Player({
			_id : 'p1',
			name: 'rain',
            areaId : 1,
			deviceType : 1,
            deviceId : 'id1',
            items : [],
		});
        // insert a player
		yield player.saveAsync();
        // find player by id
        console.log(yield Player.findAsync('p1'));
        // find player by areaId, return array of players
        console.log(yield Player.findAsync({areaId : 1}));
        // find player by deviceType and deviceId
        player = yield Player.findOneAsync({deviceType : 1, deviceId : 'id1'});
        console.log(player);

        // update player
        player.areaId = 2;
        yield player.saveAsync();

        // remove the player
        yield player.removeAsync();
    }));

    // stop memdb server
    yield memdb.stopServer();
});

if (require.main === module) {
    main().catch(console.error).finally(process.exit);
}
