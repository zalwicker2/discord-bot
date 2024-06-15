require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions
    ]
})

client.once('ready', () => {
    const channelId = '1251346121104822358';
    const channel = client.channels.cache.get(channelId);

    if (channel) {
        channel.send('fuck');
    }

    client.on('messageReactionAdd', (event, user) => {
        console.log(user);
        fetch('http://localhost:8080/vote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{ username: user.globalName, avatar: user.avatar, userid: user.id, correct: true }])
        }).then(res => res.text()).then(text => {
            if (channel) {
                channel.send(text);
            }
        })
    })
})



client.login(process.env['DISCORD-BOT']);