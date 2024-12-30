const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// 사용자 관리
const connectedUsers = new Map(); // socketId -> {nickname: string}

function generateNickname() {
    const adjectives = ['행복한', '즐거운', '신나는', '귀여운', '멋진', '착한', '웃는', '똑똑한'];
    const nouns = ['고양이', '강아지', '토끼', '다람쥐', '판다', '코알라', '펭귄', '기린'];
    const randomNum = Math.floor(Math.random() * 1000);
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${
        nouns[Math.floor(Math.random() * nouns.length)]}${randomNum}`;
}

function updateUserList() {
    const users = Array.from(connectedUsers.values()).map(user => user.nickname);
    io.emit('userList', users);
    io.emit('userCount', users.length);
    console.log('Current users:', users); // 디버깅용 로그
}

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    // 새로운 사용자 생성 및 저장
    const userInfo = {
        nickname: generateNickname()
    };
    connectedUsers.set(socket.id, userInfo);

    // 연결된 클라이언트에게 닉네임 전송
    socket.emit('set nickname', userInfo.nickname);

    // 사용자 목록 업데이트
    updateUserList();

    // 채팅 메시지 처리
    socket.on('chat message', (msg) => {
        const timestamp = new Date().toLocaleTimeString('ko-KR');
        io.emit('chat message', {
            nickname: userInfo.nickname,
            message: msg,
            timestamp: timestamp
        });
    });

    // 연결 해제 처리
    socket.on('disconnect', () => {
        console.log('Disconnection:', socket.id);
        connectedUsers.delete(socket.id);
        updateUserList();
    });
});

// 서버 시작 시 로그
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
