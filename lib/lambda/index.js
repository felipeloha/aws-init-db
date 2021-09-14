const { Client } = require('pg');

module.exports.handler = async function (event) {
    console.log('request:', JSON.stringify(event, undefined, 2));
    switch (event.RequestType) {
        case 'Create':
            console.log('create event');
        default:
            console.log('did not match event type');
    }

    const connStr = `postgresql://my_stack_user:testPassword@${event.ResourceProperties.host}:5432`;
    await execute(connStr, 'CREATE DATABASE my_stack_database_next;');

    //create extensions for each DB
    await execute(connStr + '/my_stack_database', 'CREATE EXTENSION pg_trgm;CREATE EXTENSION btree_gin;');
    await execute(connStr + '/my_stack_database_next', 'CREATE EXTENSION pg_trgm;CREATE EXTENSION btree_gin;');

    //TODO fail when an error happens so that the system rolls back
    return {
        Status: 'SUCCESS',
        Reason: '',
        LogicalResourceId: event.LogicalResourceId,
        //PhysicalResourceId: directoryId + '+user-' + username,
        RequestId: event.RequestId,
        StackId: event.StackId,
    };
};
async function execute(connStr, command) {
    try {
        await executeQuery(connStr, command);
    } catch (e) {
        console.log('error executing query', command, e);
    }
}
async function executeQuery(connStr, command) {
    const dbconn = {
        connectionString: connStr,
        query_timeout: 5000,
        connectionTimeoutMillis: 5000,
    };
    const client = new Client(dbconn);
    await client.connect();
    try {
        const q = await client.query(command);
        console.log(q);
    } catch (e) {
        console.log('error executing ', command, e);
    } finally {
        await client.end();
    }
}
