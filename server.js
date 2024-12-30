const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const connectedUsers = new Map(); // userId -> { nickname: string, sockets: Set }

function generateNickname() {
    const adjectives = ['행복한', '즐거운', '신나는', '귀여운', '멋진', '착한', '웃는', '똑똑한'];
    const nouns = ['고양이', '강아지', '토끼', '다람쥐', '판다', '코알라', '펭귄', '기린'];
    const randomNum = Math.floor(Math.random() * 1000);
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${randomNum}`;
}

function updateUserList() {
    const users = Array.from(connectedUsers.values()).map(user => user.nickname);
    io.emit('userList', users);
    io.emit('userCount', users.length);
    console.log('Current users:', users); // 디버깅용 로그
}

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    let userId = null;

    socket.on('set userId', ({ clientUserId, clientNickname }) => {
        userId = clientUserId;
        if (!connectedUsers.has(userId)) {
            // 새로운 사용자
            const nickname = clientNickname || generateNickname();
            connectedUsers.set(userId, {
                nickname,
                sockets: new Set([socket.id]),
            });
        } else {
            // 기존 사용자
            const user = connectedUsers.get(userId);
            user.sockets.add(socket.id);
        }

        // 닉네임 전송
        const user = connectedUsers.get(userId);
        socket.emit('set nickname', user.nickname);
        updateUserList();
    });

    socket.on('chat message', (msg) => {
        if (!userId || !connectedUsers.has(userId)) return;
        const user = connectedUsers.get(userId);
        const timestamp = new Date().toLocaleTimeString('ko-KR');
        io.emit('chat message', {
            nickname: user.nickname,
            message: msg,
            timestamp,
        });
    });

    socket.on('disconnect', () => {
        if (!userId || !connectedUsers.has(userId)) return;
        const user = connectedUsers.get(userId);
        user.sockets.delete(socket.id);

        if (user.sockets.size === 0) {
            // 모든 탭이 닫힘 -> 사용자 삭제
            connectedUsers.delete(userId);
        }
        updateUserList();
    });
});


const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
