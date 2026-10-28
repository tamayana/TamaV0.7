const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true }, pingInterval: 25000, pingTimeout: 20000 });
const PORT = process.env.PORT || 3000;
const rooms = new Map();
app.disable('x-powered-by');
app.use(express.static('public'));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'TAMA V0.7', rooms: rooms.size }));

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from(crypto.randomBytes(6), b => chars[b % chars.length]).join('').slice(0, 6); }
  while (rooms.has(code));
  return code;
}
function emptyState() {
  return { board: Array(9).fill(''), turn: 'X', scores: { X: 0, O: 0 }, players: { X: '', O: '' }, over: false, result: null };
}
function resultFor(board) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const line of lines) if (board[line[0]] && board[line[0]] === board[line[1]] && board[line[0]] === board[line[2]]) return { winner: board[line[0]], line };
  if (board.every(Boolean)) return { winner: 'D', line: [] };
  return null;
}
function emitState(room) {
  io.to(room.code).emit('game-state', room.state);
}
function validName(value) {
  return String(value || 'Pemain').trim().replace(/[<>]/g, '').slice(0, 16) || 'Pemain';
}
function findRoom(code) { return rooms.get(String(code || '').toUpperCase()); }

io.on('connection', socket => {
  socket.on('create-room', data => {
    if (socket.data.room) leaveRoom(socket);
    const code = makeCode();
    const room = { code, hostId: socket.id, guestId: null, state: emptyState(), rematchVotes: new Set(), createdAt: Date.now() };
    room.state.players.X = validName(data && data.name);
    rooms.set(code, room);
    socket.join(code); socket.data.room = code; socket.data.mark = 'X';
    socket.emit('room-created', { code });
    emitState(room);
  });

  socket.on('join-room', data => {
    const code = String(data && data.code || '').toUpperCase();
    const room = findRoom(code);
    if (!room) return socket.emit('server-error', { message: 'Room tidak ditemukan. Periksa kode atau minta host membuat room baru.' });
    if (room.guestId && room.guestId !== socket.id) return socket.emit('server-error', { message: 'Room sudah penuh.' });
    if (room.hostId === socket.id) return socket.emit('server-error', { message: 'Kamu sudah menjadi host room ini.' });
    if (socket.data.room) leaveRoom(socket);
    room.guestId = socket.id;
    room.state.players.O = validName(data && data.name);
    socket.join(code); socket.data.room = code; socket.data.mark = 'O';
    socket.emit('room-joined', { code, mark: 'O', state: room.state });
    io.to(code).emit('room-ready', room.state);
    emitState(room);
  });

  socket.on('make-move', data => {
    const room = findRoom(socket.data.room);
    if (!room || room.state.over) return;
    const index = data && data.index;
    const mark = socket.data.mark;
    if (!['X','O'].includes(mark) || !Number.isInteger(index) || index < 0 || index > 8) return;
    if (room.state.turn !== mark || room.state.board[index] !== '' || !room.guestId) return;
    room.state.board[index] = mark;
    const result = resultFor(room.state.board);
    if (result) {
      room.state.over = true;
      room.state.result = result;
      if (result.winner !== 'D') room.state.scores[result.winner]++;
    } else {
      room.state.turn = mark === 'X' ? 'O' : 'X';
    }
    room.rematchVotes.clear();
    emitState(room);
  });

  socket.on('rematch-request', data => {
    const room = findRoom(socket.data.room);
    if (!room || !room.state.over || String(data && data.code || '').toUpperCase() !== room.code) return;
    room.rematchVotes.add(socket.id);
    if (room.rematchVotes.size === 2) {
      room.state.board = Array(9).fill('');
      room.state.turn = 'X';
      room.state.over = false;
      room.state.result = null;
      room.rematchVotes.clear();
      emitState(room);
    } else {
      socket.emit('server-error', { message: 'Permintaan main ulang dikirim. Tunggu lawan juga menekan MAIN LAGI.' });
    }
  });

  socket.on('leave-room', () => leaveRoom(socket));
  socket.on('disconnect', () => leaveRoom(socket));
});

function leaveRoom(socket) {
  const code = socket.data.room;
  if (!code) return;
  const room = rooms.get(code);
  socket.leave(code);
  delete socket.data.room; delete socket.data.mark;
  if (!room) return;
  if (room.hostId === socket.id) {
    io.to(code).emit('room-closed', { message: 'Host keluar. Room ditutup.' });
    rooms.delete(code);
  } else if (room.guestId === socket.id) {
    room.guestId = null;
    room.state.players.O = '';
    room.state.board = Array(9).fill('');
    room.state.turn = 'X';
    room.state.over = false;
    room.state.result = null;
    room.rematchVotes.clear();
    io.to(code).emit('opponent-left');
    emitState(room);
  }
}
server.listen(PORT, () => console.log(`TAMA V0.7 server running on port ${PORT}`));
