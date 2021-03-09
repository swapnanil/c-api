const sqlite3 = require('sqlite3').verbose();
const express = require('express');
var app = express();

let db = new sqlite3.Database('./db/c.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
});

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
        res.status(500).json({code: 0, message: 'creds missing'});
    else
        db.get('select * from users where name = ?', [req.header('x-user')], (err, row) => {
            if(err)
                res.status(500).json({code: 0, message: 'db down'});
            else {
                if(!row || req.header('x-key') != row.key)
                    res.status(400).json({code: 0, message: 'invalid creds'});
                else
                    res.status(200).json({code: 1, balance: row.balance});
            }
        });
});

let port = 4000 || process.env.PORT;
app.listen(port, () => {
    console.log(`listening at http://localhost:${port}`)
})

