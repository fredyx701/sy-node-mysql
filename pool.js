'use strict';

const SQLBuilder = require('./sql_builder');

class Pool extends SQLBuilder {

    constructor(conn) {
        super();
        this.conn = conn;
        this.timezone = conn.config.connectionConfig.timezone;
        this.stringifyObjects = conn.config.connectionConfig.stringifyObjects;
    }

    /**
     * 执行sql
     * @param sql
     * @param params
     * @return {Promise}
     */
    executeSql(sql, params) {
        const _this = this;
        return new Promise(function(resolve, reject) {
            _this.conn.getConnection(function(err, client) {
                if (err) {
                    return reject(err);
                }
                client.query(sql, params, function(err, results) {
                    client.release();
                    if (err) {
                        err.message_body = {
                            sql,
                            params,
                        };
                        return reject(err);
                    }
                    resolve(results);
                });
            });
        });
    }

}

module.exports = Pool;

