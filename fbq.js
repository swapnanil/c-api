const express = require('express');
var app = express();
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const ReadWriteLock = require('rwlock');
var rwLock = new ReadWriteLock();

app.use(['/health/echo/:message'], function (req, res) {
    db.get('select count(*) from users', [], (err, row) => {
        if(err)
            res.status(500).send("unhealthy");
        else
            res.status(200).send(req.params.message);
    })
});

app.use('/wallet/balance', function (req, res) {
    if(!req.header('x-user') || req.header('x-user') == "" || !req.header('x-key') || req.header('x-key') == "")
        res.status(500).json({code: 1, message: 'creds missing'});
    else
        db.get('select * from users where name = ?', [req.header('x-user')], (err, row) => {
            if(err)
                res.status(500).json({code: 1, message: 'db down'});
            else {
                if(!row || req.header('x-key') != row.key)
                    res.status(400).json({code: 1, message: 'invalid creds'});
                else
                    res.status(200).json({code: 0, balance: row.balance});
            }
        });
});

app.use('/wallet/:coin/withdraw', function (req, res) {
    if(!req.header('x-user') || req.header('x-user') == "" || !req.header('x-key') || req.header('x-key') == "")
        res.status(500).json({code: 1, message: 'creds missing'});
    else
        db.serialize(function () {
            db.get('select * from users where name = ?', [req.header('x-user')], (err, row) => {
                if (err)
                    res.status(500).json({code: 1, message: 'db down'});
                else {
                    if (!row || req.header('x-key') != row.key)
                        res.status(400).json({code: 1, message: 'invalid creds'});
                    else {
                        let amount = req.body.amount;
                        let address = req.body.address;
                        if (!amount || !address)
                            res.status(500).json({code: 1, message: 'transaction details missing'});
                        else {
                            let transactionId = uuidv4();
                            rwLock.writeLock(async (release) => {
                                await db.run("BEGIN");
                                await db.run("update users set balance = balance - " + amount + " where name = '" + req.header('x-user') + "';");
                                await db.run("update users set balance = balance + " + amount + " where name = '" + address + "';");
                                await db.run("insert into transactions(id, from_user, to_user, datetime, amount)" +
                                "values ('" + transactionId + "', '" + req.header('x-user') + "', '" + address + "', datetime('now'), " + amount + ");");
                                await db.run("COMMIT");
                                res.status(200).json({code: 0, transactionId: transactionId})
                                release();
                            });
                        }
                    }
                }
            });
        });
});

let port = 4000 || process.env.PORT;
app.listen(port, () => {
    console.log(`listening at http://localhost:${port}`)
})

module.exports = app;
