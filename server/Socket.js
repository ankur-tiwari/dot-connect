module.exports = server => {
    const io = require('socket.io')(server);
    const Storage = require('./Storage');

    // A new User (CLIENT) is Connected
    io.on('connection', socket => {
        //At the beginning of a connection update the CLIENT with the Public Game List
        Storage.getPublicGames().then(games => socket.emit('UPDATE_GAME_LIST', games));

        //When the CLIENT wants to start a new Game
        socket.on('NEW_GAME', data => {
            Storage.createGame(data).then(() => {
                if (!data.public) return;
                //Update all the connected users, except CLIENT, with this new game link
                Storage.getPublicGames().then(games => socket.broadcast.emit('UPDATE_GAME_LIST', games));
            });

            socket.on('disconnect', () => {
                Storage.getGameById(data.gameId).then(game => {
                    if (game.status !== 'waiting_for_opponent') return;
                    Storage.updateGameById(data.gameId, {public: false})
                        .then(() => {
                            Storage.getPublicGames().then(games => io.emit('UPDATE_GAME_LIST', games));
                        })
                });
            });
        });

        socket.on('JOIN_GAME', data => {
            // leave all previous games
            leaveAllOtherRooms(socket);

            socket.join(data.gameId);
            console.log(data.userId + ' joined... ' + data.gameId)

            Storage.getGameById(data.gameId).then(game => {
                if ( !game ) return;
                if ( game.status === 'waiting_for_opponent' && game.users.x != data.userId) {

                    //Update everyone about the new PublicGames List
                    Storage.updateGameById(game.gameId, {public: false}).then(() => {
                        Storage.getPublicGames().then(games => io.emit('UPDATE_GAME_LIST', games));
                    });
                    game.status = 'started';
                    game.users.o = data.userId;
                }

                const isX = game.users.x === data.userId;
                const isO = game.users.o === data.userId;

                if ( isX ) {
                    game.connected.x = true;
                } else if ( isO ) {
                    game.connected.o = true;
                }
                const update = {
                    status: game.status,
                    users: game.users,
                    connected: game.connected,
                };
                console.log(update);
                Storage.updateGameById(data.gameId, update);

                io.to(game.gameId).emit('SYNC', update);

                socket.on('disconnect', () => {
                    Storage.getGameById(data.gameId).then( game => {
                        if ( isX ) {
                            game.connected.x = false;
                        } else if ( isO ) {
                            game.connected.o = false;
                        }
                        Storage.updateGameById(data.gameId, {connected: game.connected});
                        socket.broadcast.to(data.gameId).emit('SYNC', {
                            connected: game.connected
                        });
                    });
                });
            });
        });

        socket.on('REQUEST_GAME_INFO', data => {
            console.log('request from', data.userId, 'for', data.gameId);
            Storage.getGameById(data.gameId).then( game => {
                if (!game) {
                    socket.emit('SYNC', {
                        status: 'not_found',
                    });
                    return;
                }
                socket.emit('SYNC', {
                    ...game,
                    ...{
                        isX: game.users.x === data.userId,
                    }
                });
            });
        });

        socket.on('SYNC', data => {
            Storage.updateGameById(data.gameId, data);
            console.log(data);
            socket.broadcast.to(data.gameId).emit('SYNC', data);
        });

        socket.on('REJOIN', data => {
            socket.join(data.gameId);
            Storage.getGameById(data.gameId).then(game => {
                if ( !game ) return;
                const isX = game.users.x === data.userId;
                const isO = game.users.o === data.userId;
                if ( isX ) {
                    game.connected.x = true;
                } else if ( isO ) {
                    game.connected.o = true;
                }
                Storage.updateGameById(data.gameId, {connected: game.connected});

                socket.emit('SYNC', {
                    connected: game.connected
                });
            });
        });
    });

    const leaveAllOtherRooms = socket => {
        Object.keys(socket.rooms).forEach(room => {
            socket.leave(room);
        });
    };
};
