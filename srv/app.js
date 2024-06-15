const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('srv/results.db', err => {
    if (err) {
        console.log(err);
    } else {
        console.log('db connection live');
    }
})

const app = express();

app.use(express.json())

function GrabLeaderboard() {
    return new Promise((res, rej) => {
        db.serialize(() => {
            db.all(`
                SELECT * FROM votes ORDER BY score DESC LIMIT 10
                `, [], (err, rows) => {
                if (err) {
                    console.warn(err);
                    res(null);
                } else {
                    res(rows);
                }
            })
        })
    });
}

async function GetUserScore(user) {
    return new Promise((res, rej) => {
        db.serialize(() => {
            db.all(`
                SELECT * FROM votes WHERE userid = '${user}'
                `, [], (err, rows) => {
                console.log('wtf');
                console.log(err, rows);
                if (err) {
                    console.warn(err);
                    res([]);
                } else {
                    res(rows);
                }
            })
        });
    })
}

app.get('/leaderboard', async (req, res) => {
    const leaderboard = await GrabLeaderboard();
    console.log(leaderboard);
    res.send(leaderboard);
})

async function AddVote(userid, correct, username, avatar) {
    return new Promise(async (res, rej) => {
        const playerRecords = await GetUserScore(userid);

        const playerExists = playerRecords.length > 0;

        if (!playerExists) {
            const newValue = correct ? 1 : 0;
            db.serialize(() => {
                db.run(`
                INSERT INTO votes ('userid', 'score', 'streak', 'username', 'avatar')
                VALUES ('${userid}', '${newValue}', '${newValue}', '${username}', 'https://cdn.discordapp.com/avatars/${userid}/${avatar}.png')
                `)
            });

            res({ score: newValue, streak: newValue, position: -1, addition: 0 })
        } else {
            const playerRecord = playerRecords[0];

            let streak = correct ? playerRecord.streak + 1 : 0;
            const addition = streak > 5 ? 5 : streak;
            let score = playerRecord.score += (correct ? addition : 0);

            db.run(`
                UPDATE votes 
                SET score='${score}', streak='${streak}'
                WHERE userid='${userid}'
                `)
            res({ score, streak, oldPosition: playerRecord.position, addition: addition })
        }

    })

}

let emojinames = ['first_place', 'second_place', 'third_place', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

app.post('/vote', async (req, res) => {
    const data = [];
    for (let i = 0; i < req.body.length; i++) {
        const { userid, correct } = req.body[i];
        let { score, streak, oldPosition, addition } = await AddVote(userid, correct)
        data[userid] = { score, streak, username, oldPosition, addition };
    }

    const leaderboard = await GrabLeaderboard();

    let output = '> # Leaderboard\n';

    for (let i = 0; i < leaderboard.length; i++) {
        let item = leaderboard[i];

        let header = '';
        if (i > 1) {
            header = '###'
        } else {
            if (i == 1) {
                header = "##";
            } else {
                header = '#';
            }
        }

        let suffix = '';
        console.log(item);
        if (item.addition > 0) {
            suffix = ` (+${item.addition})`;
        }

        console.log(data);

        output += `${header} :${emojinames[i]}: ${data[item.userid].username} - ${item.score}${suffix}\n`;
    }

    res.send(output);
})

app.listen(8080, () => {
    console.log('we live');
})