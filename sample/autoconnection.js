'use strict';

// npm install memdb, bluebird
// run with node >= 0.12 with --harmony option

var memdb = require('memdb');
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

var main = P.coroutine(function*(){
    // Start a memdb shard with in-process mode
    yield memdb.startServer(config);

    var autoconn = yield memdb.autoConnect();

    var User = autoconn.collection('user');
    var doc = {_id : '1', name : 'rain', level : 1};

    // Start a transaction
    yield autoconn.transaction(P.coroutine(function*(){
        // Insert a doc
        yield User.insert(doc);
        // Find the doc
        console.log(yield User.find(doc._id));
    })); // Auto commit after transaction

    try{
        // Start another transaction
        yield autoconn.transaction(P.coroutine(function*(){
            // Update doc with $set modifier
            yield User.update(doc._id, {$set : {level : 2}});
            // Find the changed doc
            console.log(yield User.find(doc._id));
            // Exception here!
            throw new Error('Oops!');
        }));
    }
    catch(err){
        // Catch the exception
        console.log(err);

        // Change is rolled back
        yield autoconn.transaction(P.coroutine(function*(){
            console.log(yield User.find(doc._id));
        }));
    }

    yield autoconn.transaction(P.coroutine(function*(){
        yield User.remove(doc._id);
    }));

    yield memdb.stopServer();
});

if (require.main === module) {
    main().catch(console.error).finally(process.exit);
}
