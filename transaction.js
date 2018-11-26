'use strict';

const SQLBuilder = require('./sql_builder');

class Transaction extends SQLBuilder {

    constructor(client) {
        super();
        this.client = client;
        this.timezone = client.config.timezone;
        this.stringifyObjects = client.config.stringifyObjects;
    }


    /**
     * 执行事务sql
     */
    executeSql(sql, params) {
        const _this = this;
        return new Promise(function(resolve, reject) {
            _this.client.query(sql, params, function(err, results) {
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
    }


    /**
     * 提交
     */
    commit() {
        const _this = this;
        return new Promise((resolve, reject) => {
            _this.client.commit(function(err) {
                if (err) {
                    return reject(err);
                }
                _this.client.release();
                resolve();
            });
        });
    }


    /**
     * 回滚
     */
    rollback() {
        const _this = this;
        return new Promise(resolve => {
            _this.client.rollback(function() {
                _this.client.release();
                resolve();
            });
        });
    }

}

module.exports = Transaction;
