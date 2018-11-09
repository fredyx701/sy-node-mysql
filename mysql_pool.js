'use strict';

const mysql = require('mysql');
const SQLBuilder = require('./sql_builder');
const Transaction = require('./transaction');
const Pool = require('./pool');

class MySQLPool extends SQLBuilder {

    /**
     * @param config   配置内容   {name, database, host, port, user, password}
     */
    constructor(config) {
        super();
        this.pools = {};
        config = config instanceof Array ? config : [ config ];
        for (const info of config) {
            if (!info.name) {
                throw Error('missing config name');
            }
            const readonly = info.readonly;
            const pool = mysql.createPool(info);
            const dbname = info.name;
            if (!this.pools[dbname]) {
                this.pools[dbname] = {
                    master: null,
                    follows: [],
                };
            }
            if (readonly) {
                this.pools[dbname].follows.push(pool);
            } else {
                this.pools[dbname].master = pool;
            }
        }
    }


    /**
     * 更新连接池连接数上限
     */
    updateConnectionLimit(dbname, limit_count) {
        if (!this.pools[dbname]) {
            return;
        }
        if (this.pools[dbname].master) {
            this.pools[dbname].master.config.connectionLimit = limit_count;
        }
        if (this.pools[dbname].follows.length > 0) {
            for (const pool of this.pools[dbname].follows) {
                pool.config.connectionLimit = limit_count;
            }
        }
    }


    /**
     * 获取mysql实例
     * @param {String} dbname
     * @param {Boolean} readonly
     */
    _getInstance(dbname, readonly) {
        if (readonly && this.pools[dbname].follows.length > 0) {
            if (this.pools[dbname].follows.length === 1) {
                return this.pools[dbname].follows[0];
            }
            return this.pools[dbname].follows[Math.floor(Math.random() * this.pools[dbname].follows.length)];
        }
        if (this.pools[dbname].master) {
            return this.pools[dbname].master;
        }
        return null;
    }


    /**
     * 执行sql
     * @param sql
     * @param params
     * @param dbname
     * @param readonly
     * @return {Promise}
     */
    executeSql(sql, params, dbname, readonly = false) {
        const _this = this;
        return new Promise(function(resolve, reject) {
            const conn = _this._getInstance(dbname, readonly);
            if (!conn) {
                return reject(Error(`there is no client with ${dbname}`));
            }
            conn.getConnection(function(err, client) {
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


    /**
     * 开始执行事务
     */
    beginTransaction(dbname) {
        const _this = this;
        return new Promise(function(resolve, reject) {
            if (!_this.pools[dbname].master) {
                return reject(Error(`there is no client with ${dbname}`));
            }
            const conn = _this.pools[dbname].master;
            conn.getConnection(function(err, client) {
                if (err) {
                    return reject(err);
                }
                client.beginTransaction(function(err) {
                    if (err) {
                        client.release();
                        return reject(err);
                    }
                    const transaction = new Transaction(client);
                    resolve(transaction);
                });
            });
        });
    }


    /**
     * 获取一个连接池实例
     * @param {String} dbname
     * @param {Boolean} readonly
     * @return {Pool}
     */
    get(dbname, readonly) {
        const conn = this._getInstance(dbname, readonly);
        if (!conn) {
            throw Error(`there is no client with ${dbname}`);
        }
        return new Pool(conn);
    }

}


module.exports = MySQLPool;
